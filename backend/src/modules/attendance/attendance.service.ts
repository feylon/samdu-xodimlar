import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AttendanceStatus, COUNTED_AS_PRESENT, NotificationType, UserRole } from '../../common/enums';
import { ErrorCodes } from '../../common/errors/error-codes';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { monthBounds, todayIsoDate } from '../../common/utils/date.util';
import { CalendarService } from '../calendar/calendar.service';
import { DepartmentScopeService } from '../departments/department-scope.service';
import { DepartmentAssignment } from '../departments/entities/department-assignment.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { AttendanceQueryDto } from './dto/attendance-query.dto';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { AttendanceRecord } from './entities/attendance-record.entity';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(AttendanceRecord) private readonly repository: Repository<AttendanceRecord>,
    @InjectRepository(DepartmentAssignment) private readonly assignmentRepository: Repository<DepartmentAssignment>,
    private readonly scopeService: DepartmentScopeService,
    private readonly calendarService: CalendarService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async mark(dto: MarkAttendanceDto, actor: AuthenticatedUser) {
    const today = todayIsoDate();
    const date = dto.date ?? today;
    if (date < today) throw new BadRequestException(ErrorCodes.ATTENDANCE_PAST_DATE_FORBIDDEN);
    if (date > today) throw new BadRequestException(ErrorCodes.ATTENDANCE_FUTURE_DATE_FORBIDDEN);
    await this.scopeService.assertManagesDepartment(actor, dto.departmentId);
    if (!(await this.scopeService.isUserInDepartment(dto.userId, dto.departmentId))) {
      throw new ForbiddenException(ErrorCodes.FORBIDDEN_SCOPE);
    }
    const existing = await this.repository.findOne({ where: { userId: dto.userId, date } });
    const record = existing ?? this.repository.create({ userId: dto.userId, date });
    record.departmentId = dto.departmentId;
    record.status = dto.status;
    record.checkIn = dto.checkIn ?? null;
    record.checkOut = dto.checkOut ?? null;
    record.note = dto.note ?? null;
    record.markedBy = actor.id;
    const saved = await this.repository.save(record);
    await this.notificationsService.notify({
      userId: dto.userId,
      type: NotificationType.ATTENDANCE_MARKED,
      title: 'Davomat belgilandi',
      body: `${date} uchun davomat holatingiz: ${dto.status}.`,
      data: { date, status: dto.status, recordId: saved.id },
    });
    return saved;
  }

  async markBulk(records: MarkAttendanceDto[], actor: AuthenticatedUser) {
    const results: AttendanceRecord[] = [];
    for (const record of records) results.push(await this.mark(record, actor));
    return results;
  }

  async list(query: AttendanceQueryDto, actor: AuthenticatedUser) {
    const builder = this.repository
      .createQueryBuilder('record')
      .leftJoinAndSelect('record.user', 'user')
      .leftJoinAndSelect('record.department', 'department');
    if (actor.role === UserRole.DEPARTMENT_HEAD) {
      const managed = await this.scopeService.managedDepartmentIds(actor.id);
      if (managed.length === 0) return { items: [], total: 0, page: query.page, limit: query.limit };
      builder.andWhere('record.departmentId IN (:...managed)', { managed });
    } else if (actor.role === UserRole.EMPLOYEE) {
      builder.andWhere('record.userId = :self', { self: actor.id });
    }
    if (query.departmentId) builder.andWhere('record.departmentId = :departmentId', { departmentId: query.departmentId });
    if (query.userId) builder.andWhere('record.userId = :userId', { userId: query.userId });
    if (query.from) builder.andWhere('record.date >= :from', { from: query.from });
    if (query.to) builder.andWhere('record.date <= :to', { to: query.to });
    if (query.status) builder.andWhere('record.status = :status', { status: query.status });
    builder.orderBy('record.date', 'DESC').addOrderBy('user.fullName', 'ASC').skip(query.skip).take(query.limit);
    const [items, total] = await builder.getManyAndCount();
    return {
      items: items.map((record) => this.serialize(record)),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async todaySheet(departmentId: string, actor: AuthenticatedUser) {
    await this.scopeService.assertCanViewDepartment(actor, departmentId);
    const today = todayIsoDate();
    const assignments = await this.assignmentRepository.find({
      where: { departmentId, isActive: true },
      relations: { user: true },
      order: { createdAt: 'ASC' },
    });
    const records = await this.repository.find({ where: { departmentId, date: today } });
    const recordMap = new Map(records.map((record) => [record.userId, record]));
    const isWorkingDay = await this.calendarService.isWorkingDay(today);
    return {
      date: today,
      isWorkingDay,
      members: assignments.map((assignment) => ({
        userId: assignment.userId,
        fullName: assignment.user?.fullName,
        position: assignment.user?.position,
        photoFileId: assignment.user?.photoFileId,
        employeeStatus: assignment.user?.status,
        rate: assignment.rate,
        attendance: recordMap.has(assignment.userId) ? this.serialize(recordMap.get(assignment.userId)!) : null,
      })),
    };
  }

  async monthlySummaryForUser(userId: string, year: number, month: number) {
    const bounds = monthBounds(year, month);
    const [records, workingDays] = await Promise.all([
      this.repository.find({ where: { userId }, order: { date: 'ASC' } }).then((all) => all.filter((item) => item.date >= bounds.start && item.date <= bounds.end)),
      this.calendarService.workingDays(bounds.start, bounds.end),
    ]);
    const today = todayIsoDate();
    const elapsedWorkingDays = workingDays.filter((day) => day <= today).length;
    const counts = Object.values(AttendanceStatus).reduce<Record<string, number>>((acc, status) => ({ ...acc, [status]: 0 }), {});
    for (const record of records) counts[record.status] += 1;
    const presentDays = records.filter((record) => COUNTED_AS_PRESENT.includes(record.status)).length;
    return {
      year,
      month,
      workingDays: workingDays.length,
      elapsedWorkingDays,
      presentDays,
      attendanceRatio: elapsedWorkingDays === 0 ? 0 : Math.min(1, presentDays / elapsedWorkingDays),
      counts,
      records: records.map((record) => this.serialize(record)),
    };
  }

  async presentDaysByUser(userIds: string[], start: string, end: string): Promise<Map<string, number>> {
    if (userIds.length === 0) return new Map();
    const rows = await this.repository
      .createQueryBuilder('record')
      .select('record.userId', 'userId')
      .addSelect('COUNT(*)', 'count')
      .where('record.userId IN (:...userIds)', { userIds })
      .andWhere('record.date BETWEEN :start AND :end', { start, end })
      .andWhere('record.status IN (:...statuses)', { statuses: COUNTED_AS_PRESENT })
      .groupBy('record.userId')
      .getRawMany<{ userId: string; count: string }>();
    return new Map(rows.map((row) => [row.userId, Number(row.count)]));
  }

  async departmentRatioForDate(departmentIds: string[] | null, date: string) {
    const builder = this.repository.createQueryBuilder('record').where('record.date = :date', { date });
    if (departmentIds) {
      if (departmentIds.length === 0) return { marked: 0, present: 0, absent: 0 };
      builder.andWhere('record.departmentId IN (:...departmentIds)', { departmentIds });
    }
    const records = await builder.getMany();
    const present = records.filter((record) => COUNTED_AS_PRESENT.includes(record.status)).length;
    return { marked: records.length, present, absent: records.length - present };
  }

  async dailySeries(departmentIds: string[] | null, start: string, end: string) {
    const builder = this.repository
      .createQueryBuilder('record')
      .select('record.date', 'date')
      .addSelect('record.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('record.date BETWEEN :start AND :end', { start, end })
      .groupBy('record.date')
      .addGroupBy('record.status')
      .orderBy('record.date', 'ASC');
    if (departmentIds) {
      if (departmentIds.length === 0) return [];
      builder.andWhere('record.departmentId IN (:...departmentIds)', { departmentIds });
    }
    return builder.getRawMany<{ date: string; status: AttendanceStatus; count: string }>();
  }

  async activeMemberCount(departmentIds: string[] | null): Promise<number> {
    const builder = this.assignmentRepository
      .createQueryBuilder('assignment')
      .select('COUNT(DISTINCT assignment.userId)', 'count')
      .where('assignment.isActive = true');
    if (departmentIds) {
      if (departmentIds.length === 0) return 0;
      builder.andWhere('assignment.departmentId IN (:...departmentIds)', { departmentIds });
    }
    const row = await builder.getRawOne<{ count: string }>();
    return Number(row?.count ?? 0);
  }

  findForUsers(userIds: string[], start: string, end: string) {
    if (userIds.length === 0) return Promise.resolve([] as AttendanceRecord[]);
    return this.repository
      .createQueryBuilder('record')
      .where('record.userId IN (:...userIds)', { userIds })
      .andWhere('record.date BETWEEN :start AND :end', { start, end })
      .getMany();
  }

  private serialize(record: AttendanceRecord) {
    return {
      id: record.id,
      userId: record.userId,
      userFullName: record.user?.fullName,
      departmentId: record.departmentId,
      departmentName: record.department?.name,
      date: record.date,
      status: record.status,
      checkIn: record.checkIn,
      checkOut: record.checkOut,
      note: record.note,
      markedBy: record.markedBy,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
