import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { COUNTED_AS_PRESENT, NotificationType, PointSource, TaskStatus, UserRole } from '../../common/enums';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { APP_TIMEZONE, currentYearMonth, monthBounds, previousYearMonth } from '../../common/utils/date.util';
import { AttendanceRecord } from '../attendance/entities/attendance-record.entity';
import { CalendarService } from '../calendar/calendar.service';
import { DepartmentScopeService } from '../departments/department-scope.service';
import { DepartmentAssignment } from '../departments/entities/department-assignment.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { Task } from '../tasks/entities/task.entity';
import { User } from '../users/entities/user.entity';
import { AdjustPointsDto } from './dto/adjust-points.dto';
import { MonthlyKpiSummary } from './entities/monthly-kpi-summary.entity';
import { PointTransaction } from './entities/point-transaction.entity';

export interface AwardPointsInput {
  userId: string;
  departmentId: string | null;
  points: number;
  source: PointSource;
  referenceId?: string;
  reason?: string;
  createdBy: string;
  year?: number;
  month?: number;
}

export interface PointsBreakdown {
  total: number;
  task: number;
  bonusTask: number;
  dailyReport: number;
  manual: number;
}

@Injectable()
export class KpiService {
  private readonly logger = new Logger(KpiService.name);

  constructor(
    @InjectRepository(PointTransaction) private readonly pointRepository: Repository<PointTransaction>,
    @InjectRepository(MonthlyKpiSummary) private readonly summaryRepository: Repository<MonthlyKpiSummary>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Task) private readonly taskRepository: Repository<Task>,
    @InjectRepository(AttendanceRecord) private readonly attendanceRepository: Repository<AttendanceRecord>,
    @InjectRepository(DepartmentAssignment) private readonly assignmentRepository: Repository<DepartmentAssignment>,
    private readonly scopeService: DepartmentScopeService,
    private readonly calendarService: CalendarService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async award(input: AwardPointsInput): Promise<PointTransaction> {
    const period = input.year && input.month ? { year: input.year, month: input.month } : currentYearMonth();
    return this.pointRepository.save(
      this.pointRepository.create({
        userId: input.userId,
        departmentId: input.departmentId,
        points: input.points,
        source: input.source,
        referenceId: input.referenceId ?? null,
        reason: input.reason ?? null,
        year: period.year,
        month: period.month,
        createdBy: input.createdBy,
      }),
    );
  }

  async adjust(dto: AdjustPointsDto, actor: AuthenticatedUser) {
    await this.scopeService.assertManagesUser(actor, dto.userId);
    const departmentId = await this.scopeService.primaryDepartmentId(dto.userId);
    const transaction = await this.award({
      userId: dto.userId,
      departmentId,
      points: dto.points,
      source: PointSource.MANUAL,
      reason: dto.reason,
      createdBy: actor.id,
    });
    await this.notificationsService.notify({
      userId: dto.userId,
      type: NotificationType.KPI_ADJUSTED,
      title: dto.points >= 0 ? 'Ball qo\'shildi' : 'Ball ayirildi',
      body: `${dto.points > 0 ? '+' : ''}${dto.points} ball: ${dto.reason}`,
      data: { points: dto.points, reason: dto.reason, transactionId: transaction.id },
    });
    return transaction;
  }

  async breakdownForUser(userId: string, year: number, month: number): Promise<PointsBreakdown> {
    const rows = await this.pointRepository
      .createQueryBuilder('point')
      .select('point.source', 'source')
      .addSelect('COALESCE(SUM(point.points), 0)', 'total')
      .where('point.userId = :userId', { userId })
      .andWhere('point.year = :year AND point.month = :month', { year, month })
      .groupBy('point.source')
      .getRawMany<{ source: PointSource; total: string }>();
    return this.toBreakdown(rows);
  }

  async breakdownForUsers(userIds: string[], year: number, month: number): Promise<Map<string, PointsBreakdown>> {
    if (userIds.length === 0) return new Map();
    const rows = await this.pointRepository
      .createQueryBuilder('point')
      .select('point.userId', 'userId')
      .addSelect('point.source', 'source')
      .addSelect('COALESCE(SUM(point.points), 0)', 'total')
      .where('point.userId IN (:...userIds)', { userIds })
      .andWhere('point.year = :year AND point.month = :month', { year, month })
      .groupBy('point.userId')
      .addGroupBy('point.source')
      .getRawMany<{ userId: string; source: PointSource; total: string }>();
    const grouped = new Map<string, Array<{ source: PointSource; total: string }>>();
    for (const row of rows) {
      const list = grouped.get(row.userId) ?? [];
      list.push(row);
      grouped.set(row.userId, list);
    }
    const result = new Map<string, PointsBreakdown>();
    for (const userId of userIds) result.set(userId, this.toBreakdown(grouped.get(userId) ?? []));
    return result;
  }

  async myKpi(userId: string, year: number, month: number) {
    const [breakdown, transactions, history, tasks] = await Promise.all([
      this.breakdownForUser(userId, year, month),
      this.pointRepository.find({ where: { userId, year, month }, order: { createdAt: 'DESC' }, take: 100 }),
      this.summaryRepository.find({ where: { userId }, order: { year: 'DESC', month: 'DESC' }, take: 12 }),
      this.taskStats([userId], year, month),
    ]);
    return { year, month, breakdown, transactions, history, tasks: tasks.get(userId) ?? { assigned: 0, verified: 0, completed: 0 } };
  }

  async userKpi(userId: string, year: number, month: number, actor: AuthenticatedUser) {
    await this.scopeService.assertCanViewUser(actor, userId);
    return this.myKpi(userId, year, month);
  }

  async leaderboard(departmentId: string | undefined, year: number, month: number, actor: AuthenticatedUser) {
    let userIds: string[];
    if (departmentId) {
      await this.scopeService.assertCanViewDepartment(actor, departmentId);
      userIds = await this.scopeService.departmentMemberIds(departmentId);
    } else if (actor.role === UserRole.DEPARTMENT_HEAD) {
      userIds = await this.scopeService.managedUserIds(actor.id);
    } else if (actor.role === UserRole.EMPLOYEE) {
      const departments = await this.scopeService.memberDepartmentIds(actor.id);
      const sets = await Promise.all(departments.map((id) => this.scopeService.departmentMemberIds(id)));
      userIds = [...new Set(sets.flat())];
    } else {
      const users = await this.userRepository.find({ where: { role: In([UserRole.EMPLOYEE, UserRole.DEPARTMENT_HEAD]) }, select: { id: true } });
      userIds = users.map((user) => user.id);
    }
    const [users, breakdowns, tasks] = await Promise.all([
      this.userRepository.find({ where: { id: In(userIds) } }),
      this.breakdownForUsers(userIds, year, month),
      this.taskStats(userIds, year, month),
    ]);
    return users
      .map((user) => ({
        userId: user.id,
        fullName: user.fullName,
        position: user.position,
        photoFileId: user.photoFileId,
        status: user.status,
        points: breakdowns.get(user.id) ?? this.toBreakdown([]),
        tasks: tasks.get(user.id) ?? { assigned: 0, verified: 0, completed: 0 },
      }))
      .sort((a, b) => b.points.total - a.points.total);
  }

  async departmentSummary(departmentId: string, year: number, month: number, actor: AuthenticatedUser) {
    const members = await this.leaderboard(departmentId, year, month, actor);
    const totalPoints = members.reduce((sum, member) => sum + member.points.total, 0);
    const tasksAssigned = members.reduce((sum, member) => sum + member.tasks.assigned, 0);
    const tasksVerified = members.reduce((sum, member) => sum + member.tasks.verified, 0);
    return {
      departmentId,
      year,
      month,
      memberCount: members.length,
      totalPoints,
      averagePoints: members.length ? Math.round((totalPoints / members.length) * 100) / 100 : 0,
      tasksAssigned,
      tasksVerified,
      completionRatio: tasksAssigned ? Math.round((tasksVerified / tasksAssigned) * 10000) / 10000 : 0,
      members,
    };
  }

  async taskStats(userIds: string[], year: number, month: number): Promise<Map<string, { assigned: number; verified: number; completed: number }>> {
    if (userIds.length === 0) return new Map();
    const bounds = monthBounds(year, month);
    const rows = await this.taskRepository
      .createQueryBuilder('task')
      .select('task.assigneeId', 'userId')
      .addSelect('COUNT(*)', 'assigned')
      .addSelect(`SUM(CASE WHEN task.status = '${TaskStatus.VERIFIED}' THEN 1 ELSE 0 END)`, 'verified')
      .addSelect(`SUM(CASE WHEN task.status IN ('${TaskStatus.VERIFIED}', '${TaskStatus.COMPLETED}') THEN 1 ELSE 0 END)`, 'completed')
      .where('task.assigneeId IN (:...userIds)', { userIds })
      .andWhere(`(task.createdAt AT TIME ZONE '${APP_TIMEZONE}')::date BETWEEN :start AND :end`, { start: bounds.start, end: bounds.end })
      .groupBy('task.assigneeId')
      .getRawMany<{ userId: string; assigned: string; verified: string; completed: string }>();
    return new Map(rows.map((row) => [row.userId, { assigned: Number(row.assigned), verified: Number(row.verified), completed: Number(row.completed) }]));
  }

  async averagePointsForUsers(userIds: string[], year: number, month: number): Promise<number> {
    if (userIds.length === 0) return 0;
    const breakdowns = await this.breakdownForUsers(userIds, year, month);
    const total = [...breakdowns.values()].reduce((sum, item) => sum + item.total, 0);
    return Math.round((total / userIds.length) * 100) / 100;
  }

  @Cron('0 5 0 1 * *', { timeZone: APP_TIMEZONE })
  async snapshotPreviousMonth() {
    const period = previousYearMonth();
    const count = await this.snapshotMonth(period.year, period.month);
    this.logger.log(`Monthly KPI snapshot for ${period.year}-${period.month} created for ${count} users`);
  }

  async snapshotMonth(year: number, month: number): Promise<number> {
    const bounds = monthBounds(year, month);
    const users = await this.userRepository.find({ where: { role: In([UserRole.EMPLOYEE, UserRole.DEPARTMENT_HEAD]) } });
    const userIds = users.map((user) => user.id);
    const [breakdowns, tasks, workingDays, attendance] = await Promise.all([
      this.breakdownForUsers(userIds, year, month),
      this.taskStats(userIds, year, month),
      this.calendarService.workingDays(bounds.start, bounds.end),
      userIds.length
        ? this.attendanceRepository
            .createQueryBuilder('record')
            .select('record.userId', 'userId')
            .addSelect('COUNT(*)', 'present')
            .where('record.userId IN (:...userIds)', { userIds })
            .andWhere('record.date BETWEEN :start AND :end', { start: bounds.start, end: bounds.end })
            .andWhere('record.status IN (:...statuses)', { statuses: COUNTED_AS_PRESENT })
            .groupBy('record.userId')
            .getRawMany<{ userId: string; present: string }>()
        : Promise.resolve([]),
    ]);
    const attendanceMap = new Map(attendance.map((row) => [row.userId, Number(row.present)]));
    let saved = 0;
    for (const user of users) {
      const breakdown = breakdowns.get(user.id) ?? this.toBreakdown([]);
      const taskStat = tasks.get(user.id) ?? { assigned: 0, verified: 0, completed: 0 };
      const present = attendanceMap.get(user.id) ?? 0;
      const existing = await this.summaryRepository.findOne({ where: { userId: user.id, year, month } });
      const summary = existing ?? this.summaryRepository.create({ userId: user.id, year, month });
      summary.totalPoints = breakdown.total;
      summary.taskPoints = breakdown.task;
      summary.bonusPoints = breakdown.bonusTask;
      summary.reportPoints = breakdown.dailyReport;
      summary.manualPoints = breakdown.manual;
      summary.tasksAssigned = taskStat.assigned;
      summary.tasksVerified = taskStat.verified;
      summary.attendanceRatio = String(workingDays.length ? Math.min(1, present / workingDays.length).toFixed(2) : '0');
      await this.summaryRepository.save(summary);
      saved += 1;
    }
    return saved;
  }

  async updateSummaryReportStats(userId: string, year: number, month: number, reportsSubmitted: number, averageRating: number) {
    const existing = await this.summaryRepository.findOne({ where: { userId, year, month } });
    if (!existing) return;
    existing.reportsSubmitted = reportsSubmitted;
    existing.averageReportRating = averageRating.toFixed(2);
    await this.summaryRepository.save(existing);
  }

  private toBreakdown(rows: Array<{ source: PointSource; total: string }>): PointsBreakdown {
    const result: PointsBreakdown = { total: 0, task: 0, bonusTask: 0, dailyReport: 0, manual: 0 };
    for (const row of rows) {
      const value = Number(row.total);
      result.total += value;
      if (row.source === PointSource.TASK) result.task += value;
      if (row.source === PointSource.BONUS_TASK) result.bonusTask += value;
      if (row.source === PointSource.DAILY_REPORT) result.dailyReport += value;
      if (row.source === PointSource.MANUAL) result.manual += value;
    }
    return result;
  }
}
