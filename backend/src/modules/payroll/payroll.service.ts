import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { EmployeeStatus, NotificationType, PayrollStatus, UserRole } from '../../common/enums';
import { ErrorCodes } from '../../common/errors/error-codes';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { monthBounds } from '../../common/utils/date.util';
import { AttendanceService } from '../attendance/attendance.service';
import { CalendarService } from '../calendar/calendar.service';
import { DepartmentScopeService } from '../departments/department-scope.service';
import { DepartmentAssignment } from '../departments/entities/department-assignment.entity';
import { Department } from '../departments/entities/department.entity';
import { KpiService } from '../kpi/kpi.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OrganizationService } from '../organization/organization.service';
import { User } from '../users/entities/user.entity';
import { CalculatePayrollDto } from './dto/calculate-payroll.dto';
import { PayrollQueryDto } from './dto/payroll-query.dto';
import { UpdatePayrollStatusDto } from './dto/update-payroll-status.dto';
import { PayrollBreakdown, PayrollRecord } from './entities/payroll-record.entity';

const round2 = (value: number) => Math.round(value * 100) / 100;

@Injectable()
export class PayrollService {
  constructor(
    @InjectRepository(PayrollRecord) private readonly repository: Repository<PayrollRecord>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(DepartmentAssignment) private readonly assignmentRepository: Repository<DepartmentAssignment>,
    @InjectRepository(Department) private readonly departmentRepository: Repository<Department>,
    private readonly attendanceService: AttendanceService,
    private readonly calendarService: CalendarService,
    private readonly kpiService: KpiService,
    private readonly organizationService: OrganizationService,
    private readonly scopeService: DepartmentScopeService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async calculate(dto: CalculatePayrollDto, actor: AuthenticatedUser) {
    const settings = await this.organizationService.get();
    const bounds = monthBounds(dto.year, dto.month);
    const workingDays = await this.calendarService.workingDays(bounds.start, bounds.end);
    const assignments = await this.assignmentRepository.find({ where: { isActive: true }, relations: { department: true, user: true } });
    const byUser = new Map<string, DepartmentAssignment[]>();
    for (const assignment of assignments) {
      if (dto.departmentId && assignment.departmentId !== dto.departmentId) continue;
      if (!assignment.user || ![UserRole.EMPLOYEE, UserRole.DEPARTMENT_HEAD].includes(assignment.user.role)) continue;
      if ([EmployeeStatus.TERMINATED, EmployeeStatus.BLOCKED].includes(assignment.user.status)) continue;
      const list = byUser.get(assignment.userId) ?? [];
      list.push(assignment);
      byUser.set(assignment.userId, list);
    }
    const userIds = [...byUser.keys()].filter((id) => !dto.userIds || dto.userIds.includes(id));
    const fullAssignmentsByUser = new Map<string, DepartmentAssignment[]>();
    for (const assignment of assignments) {
      const list = fullAssignmentsByUser.get(assignment.userId) ?? [];
      list.push(assignment);
      fullAssignmentsByUser.set(assignment.userId, list);
    }
    const [presentDays, breakdowns, departments] = await Promise.all([
      this.attendanceService.presentDaysByUser(userIds, bounds.start, bounds.end),
      this.kpiService.breakdownForUsers(userIds, dto.year, dto.month),
      this.departmentRepository.find({ where: { isActive: true } }),
    ]);
    const headedDepartments = new Map<string, Department[]>();
    for (const department of departments) {
      if (!department.headUserId) continue;
      const list = headedDepartments.get(department.headUserId) ?? [];
      list.push(department);
      headedDepartments.set(department.headUserId, list);
    }
    const pointValue = Number(settings.pointValue);
    const headTeamBonusRate = Number(settings.headTeamBonusRate) / 100;
    const headPointShareRate = Number(settings.headPointShareRate) / 100;
    const results: PayrollRecord[] = [];
    const skipped: string[] = [];

    for (const userId of userIds) {
      const existing = await this.repository.findOne({ where: { userId, year: dto.year, month: dto.month } });
      if (existing?.status === PayrollStatus.PAID) {
        skipped.push(userId);
        continue;
      }
      const userAssignments = fullAssignmentsByUser.get(userId) ?? [];
      const user = userAssignments[0]?.user;
      if (!user) continue;
      const baseSalary = Number(user.baseSalary);
      const totalRate = Math.min(100, userAssignments.reduce((sum, item) => sum + item.rate, 0)) / 100;
      const present = presentDays.get(userId) ?? 0;
      const attendanceRatio = workingDays.length ? Math.min(1, present / workingDays.length) : 0;
      const baseAmount = round2(baseSalary * totalRate);
      const attendanceAmount = round2(baseAmount * attendanceRatio);
      const points = breakdowns.get(userId) ?? { total: 0, task: 0, bonusTask: 0, dailyReport: 0, manual: 0 };
      const pointsAmount = round2(points.total * pointValue);

      let teamPerformanceRatio = 0;
      let teamBonusAmount = 0;
      let teamPointsAmount = 0;
      const headed = headedDepartments.get(userId) ?? [];
      if (headed.length > 0) {
        const teamIds = new Set<string>();
        for (const department of headed) {
          for (const memberId of await this.scopeService.departmentMemberIds(department.id)) {
            if (memberId !== userId) teamIds.add(memberId);
          }
        }
        const teamList = [...teamIds];
        const [teamStats, teamPoints, teamPresent] = await Promise.all([
          this.kpiService.taskStats(teamList, dto.year, dto.month),
          this.kpiService.breakdownForUsers(teamList, dto.year, dto.month),
          this.attendanceService.presentDaysByUser(teamList, bounds.start, bounds.end),
        ]);
        const assigned = [...teamStats.values()].reduce((sum, item) => sum + item.assigned, 0);
        const verified = [...teamStats.values()].reduce((sum, item) => sum + item.verified, 0);
        const taskRatio = assigned ? verified / assigned : 0;
        const teamAttendance = teamList.length && workingDays.length
          ? teamList.reduce((sum, id) => sum + Math.min(1, (teamPresent.get(id) ?? 0) / workingDays.length), 0) / teamList.length
          : 0;
        teamPerformanceRatio = round2(taskRatio * 0.6 + teamAttendance * 0.4);
        teamBonusAmount = round2(baseAmount * headTeamBonusRate * teamPerformanceRatio);
        const totalTeamPoints = [...teamPoints.values()].reduce((sum, item) => sum + item.total, 0);
        teamPointsAmount = round2(totalTeamPoints * pointValue * headPointShareRate);
      }

      const bonusAmount = round2(pointsAmount + teamBonusAmount + teamPointsAmount);
      const totalAmount = round2(attendanceAmount + bonusAmount);
      const breakdown: PayrollBreakdown = {
        baseSalary,
        totalRate: totalRate * 100,
        workingDays: workingDays.length,
        presentDays: present,
        attendanceRatio: round2(attendanceRatio),
        attendanceAmount,
        taskPoints: points.task,
        bonusPoints: points.bonusTask,
        reportPoints: points.dailyReport,
        manualPoints: points.manual,
        pointValue,
        pointsAmount,
        teamPerformanceRatio,
        teamBonusAmount,
        teamPointsAmount,
        isDepartmentHead: headed.length > 0,
        departments: userAssignments.map((item) => ({ departmentId: item.departmentId, departmentName: item.department?.name ?? '', rate: item.rate })),
      };
      const record = existing ?? this.repository.create({ userId, year: dto.year, month: dto.month });
      record.baseAmount = baseAmount.toFixed(2);
      record.attendanceAmount = attendanceAmount.toFixed(2);
      record.bonusAmount = bonusAmount.toFixed(2);
      record.deductionAmount = '0.00';
      record.totalAmount = totalAmount.toFixed(2);
      record.currency = settings.currency;
      record.status = PayrollStatus.CALCULATED;
      record.breakdown = breakdown;
      record.calculatedBy = actor.id;
      record.calculatedAt = new Date();
      results.push(await this.repository.save(record));
    }

    await Promise.all(
      results.map((record) =>
        this.notificationsService.notify({
          userId: record.userId,
          type: NotificationType.PAYROLL_STATUS,
          title: 'Ish haqi hisoblandi',
          body: `${dto.year}-${String(dto.month).padStart(2, '0')} uchun ish haqingiz hisoblandi: ${Number(record.totalAmount).toLocaleString('ru-RU')} ${record.currency}.`,
          data: { payrollId: record.id, status: record.status, year: dto.year, month: dto.month },
        }),
      ),
    );

    return { calculated: results.length, skippedPaid: skipped.length, records: await this.hydrate(results) };
  }

  async updateStatus(id: string, dto: UpdatePayrollStatusDto, actor: AuthenticatedUser) {
    const record = await this.repository.findOne({ where: { id } });
    if (!record) throw new NotFoundException(ErrorCodes.PAYROLL_NOT_FOUND);
    if (record.status === PayrollStatus.PAID) throw new BadRequestException(ErrorCodes.PAYROLL_IMMUTABLE);
    if (dto.status !== PayrollStatus.PAID) throw new BadRequestException(ErrorCodes.PAYROLL_INVALID_TRANSITION);
    record.status = PayrollStatus.PAID;
    record.paidBy = actor.id;
    record.paidAt = new Date();
    record.note = dto.note ?? record.note;
    await this.repository.save(record);
    await this.notificationsService.notify({
      userId: record.userId,
      type: NotificationType.PAYROLL_STATUS,
      title: 'Ish haqi to\'landi',
      body: `${record.year}-${String(record.month).padStart(2, '0')} uchun ${Number(record.totalAmount).toLocaleString('ru-RU')} ${record.currency} to'lab berildi.`,
      data: { payrollId: record.id, status: record.status, year: record.year, month: record.month },
    });
    const [hydrated] = await this.hydrate([record]);
    return hydrated;
  }

  async list(query: PayrollQueryDto, actor: AuthenticatedUser) {
    const builder = this.repository.createQueryBuilder('payroll').leftJoinAndSelect('payroll.user', 'user');
    if (actor.role === UserRole.DEPARTMENT_HEAD) {
      const managed = await this.scopeService.managedUserIds(actor.id);
      const visible = [...new Set([...managed, actor.id])];
      builder.andWhere('payroll.userId IN (:...visible)', { visible });
    } else if (actor.role === UserRole.EMPLOYEE) {
      builder.andWhere('payroll.userId = :self', { self: actor.id });
    }
    if (query.year) builder.andWhere('payroll.year = :year', { year: query.year });
    if (query.month) builder.andWhere('payroll.month = :month', { month: query.month });
    if (query.status) builder.andWhere('payroll.status = :status', { status: query.status });
    if (query.userId) builder.andWhere('payroll.userId = :userId', { userId: query.userId });
    if (query.departmentId) {
      builder.andWhere(
        `payroll.userId IN (SELECT a."userId" FROM department_assignments a WHERE a."isActive" = true AND a."departmentId" = :departmentId)`,
        { departmentId: query.departmentId },
      );
    }
    builder.orderBy('payroll.year', 'DESC').addOrderBy('payroll.month', 'DESC').addOrderBy('user.fullName', 'ASC').skip(query.skip).take(query.limit);
    const [items, total] = await builder.getManyAndCount();
    return { items: items.map((record) => this.serialize(record)), total, page: query.page, limit: query.limit };
  }

  async mine(actor: AuthenticatedUser) {
    const records = await this.repository.find({ where: { userId: actor.id }, order: { year: 'DESC', month: 'DESC' } });
    return (await this.hydrate(records)).map((record) => this.serialize(record));
  }

  async getOne(id: string, actor: AuthenticatedUser) {
    const record = await this.repository.findOne({ where: { id }, relations: { user: true } });
    if (!record) throw new NotFoundException(ErrorCodes.PAYROLL_NOT_FOUND);
    if (record.userId !== actor.id) {
      if (actor.role === UserRole.EMPLOYEE) throw new ForbiddenException(ErrorCodes.FORBIDDEN_SCOPE);
      await this.scopeService.assertManagesUser(actor, record.userId);
    }
    return this.serialize(record);
  }

  async summary(year: number, month: number, departmentIds: string[] | null) {
    const builder = this.repository
      .createQueryBuilder('payroll')
      .select('payroll.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(payroll.totalAmount), 0)', 'total')
      .where('payroll.year = :year AND payroll.month = :month', { year, month })
      .groupBy('payroll.status');
    if (departmentIds) {
      if (departmentIds.length === 0) return [];
      builder.andWhere(
        `payroll.userId IN (SELECT a."userId" FROM department_assignments a WHERE a."isActive" = true AND a."departmentId" IN (:...departmentIds))`,
        { departmentIds },
      );
    }
    const rows = await builder.getRawMany<{ status: PayrollStatus; count: string; total: string }>();
    return rows.map((row) => ({ status: row.status, count: Number(row.count), total: Number(row.total) }));
  }

  async monthlyTotals(months: Array<{ year: number; month: number }>) {
    const rows = await this.repository
      .createQueryBuilder('payroll')
      .select('payroll.year', 'year')
      .addSelect('payroll.month', 'month')
      .addSelect('COALESCE(SUM(payroll.totalAmount), 0)', 'total')
      .where(months.map((_, index) => `(payroll.year = :y${index} AND payroll.month = :m${index})`).join(' OR ') || '1=0',
        Object.fromEntries(months.flatMap((item, index) => [[`y${index}`, item.year], [`m${index}`, item.month]])))
      .groupBy('payroll.year')
      .addGroupBy('payroll.month')
      .getRawMany<{ year: number; month: number; total: string }>();
    return rows.map((row) => ({ year: Number(row.year), month: Number(row.month), total: Number(row.total) }));
  }

  latestForUser(userId: string) {
    return this.repository.findOne({ where: { userId }, order: { year: 'DESC', month: 'DESC' } });
  }

  private async hydrate(records: PayrollRecord[]): Promise<PayrollRecord[]> {
    const ids = [...new Set(records.map((record) => record.userId))];
    const users = ids.length ? await this.userRepository.find({ where: { id: In(ids) } }) : [];
    const map = new Map(users.map((user) => [user.id, user]));
    return records.map((record) => Object.assign(record, { user: map.get(record.userId) }));
  }

  serialize(record: PayrollRecord) {
    return {
      id: record.id,
      userId: record.userId,
      user: record.user ? { id: record.user.id, fullName: record.user.fullName, position: record.user.position, photoFileId: record.user.photoFileId } : null,
      year: record.year,
      month: record.month,
      baseAmount: Number(record.baseAmount),
      attendanceAmount: Number(record.attendanceAmount),
      bonusAmount: Number(record.bonusAmount),
      deductionAmount: Number(record.deductionAmount),
      totalAmount: Number(record.totalAmount),
      currency: record.currency,
      status: record.status,
      breakdown: record.breakdown,
      note: record.note,
      calculatedBy: record.calculatedBy,
      calculatedAt: record.calculatedAt,
      paidBy: record.paidBy,
      paidAt: record.paidAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
