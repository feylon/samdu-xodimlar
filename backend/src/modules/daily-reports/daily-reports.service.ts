import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Model } from 'mongoose';
import { In, Repository } from 'typeorm';
import { EmployeeStatus, NotificationType, PointSource, UserRole } from '../../common/enums';
import { ErrorCodes } from '../../common/errors/error-codes';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { APP_TIMEZONE, monthBounds, nowInZone, todayIsoDate } from '../../common/utils/date.util';
import { CalendarService } from '../calendar/calendar.service';
import { DepartmentScopeService } from '../departments/department-scope.service';
import { KpiService } from '../kpi/kpi.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OrganizationService } from '../organization/organization.service';
import { User } from '../users/entities/user.entity';
import { RateReportDto } from './dto/rate-report.dto';
import { ReportQueryDto } from './dto/report-query.dto';
import { SubmitReportDto } from './dto/submit-report.dto';
import { DailyReport, DailyReportDocument } from './schemas/daily-report.schema';

@Injectable()
export class DailyReportsService {
  private readonly logger = new Logger(DailyReportsService.name);

  constructor(
    @InjectModel(DailyReport.name) private readonly reportModel: Model<DailyReportDocument>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly scopeService: DepartmentScopeService,
    private readonly kpiService: KpiService,
    private readonly notificationsService: NotificationsService,
    private readonly calendarService: CalendarService,
    private readonly organizationService: OrganizationService,
  ) {}

  async submit(dto: SubmitReportDto, actor: AuthenticatedUser) {
    const date = todayIsoDate();
    const departmentId = await this.scopeService.primaryDepartmentId(actor.id);
    if (!departmentId) throw new ForbiddenException(ErrorCodes.FORBIDDEN_SCOPE);
    const existing = await this.reportModel.findOne({ userId: actor.id, date });
    if (existing?.ratedAt) throw new BadRequestException(ErrorCodes.REPORT_ALREADY_RATED);
    const saved = await this.reportModel.findOneAndUpdate(
      { userId: actor.id, date },
      {
        $set: {
          userFullName: actor.fullName,
          departmentId,
          content: dto.content,
          completedTaskIds: dto.completedTaskIds ?? [],
          attachmentFileIds: dto.attachmentFileIds ?? [],
          submittedAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return this.serialize(saved!);
  }

  async today(actor: AuthenticatedUser) {
    const report = await this.reportModel.findOne({ userId: actor.id, date: todayIsoDate() });
    return report ? this.serialize(report) : null;
  }

  async myReports(actor: AuthenticatedUser, year: number, month: number) {
    const bounds = monthBounds(year, month);
    const reports = await this.reportModel
      .find({ userId: actor.id, date: { $gte: bounds.start, $lte: bounds.end } })
      .sort({ date: -1 })
      .lean();
    return reports.map((report) => this.serialize(report));
  }

  async list(query: ReportQueryDto, actor: AuthenticatedUser) {
    const filter: Record<string, unknown> = {};
    if (actor.role === UserRole.DEPARTMENT_HEAD) {
      const managed = await this.scopeService.managedDepartmentIds(actor.id);
      if (managed.length === 0) return { items: [], total: 0, page: query.page, limit: query.limit };
      filter.departmentId = query.departmentId && managed.includes(query.departmentId) ? query.departmentId : { $in: managed };
    } else if (actor.role === UserRole.EMPLOYEE) {
      filter.userId = actor.id;
    } else if (query.departmentId) {
      filter.departmentId = query.departmentId;
    }
    if (query.userId && actor.role !== UserRole.EMPLOYEE) filter.userId = query.userId;
    if (query.from || query.to) {
      filter.date = { ...(query.from ? { $gte: query.from } : {}), ...(query.to ? { $lte: query.to } : {}) };
    }
    if (query.unratedOnly) filter.ratedAt = null;
    const [items, total] = await Promise.all([
      this.reportModel.find(filter).sort({ date: -1, submittedAt: -1 }).skip(query.skip).limit(query.limit).lean(),
      this.reportModel.countDocuments(filter),
    ]);
    return { items: items.map((item) => this.serialize(item)), total, page: query.page, limit: query.limit };
  }

  async getOne(id: string, actor: AuthenticatedUser) {
    const report = await this.reportModel.findById(id);
    if (!report) throw new NotFoundException(ErrorCodes.REPORT_NOT_FOUND);
    if (report.userId !== actor.id) await this.scopeService.assertCanViewDepartment(actor, report.departmentId);
    return this.serialize(report);
  }

  async rate(id: string, dto: RateReportDto, actor: AuthenticatedUser) {
    const report = await this.reportModel.findById(id);
    if (!report) throw new NotFoundException(ErrorCodes.REPORT_NOT_FOUND);
    await this.scopeService.assertManagesDepartment(actor, report.departmentId);
    if (report.ratedAt) throw new BadRequestException(ErrorCodes.REPORT_ALREADY_RATED);
    const settings = await this.organizationService.get();
    const points = Math.round((dto.rating / 5) * settings.reportMaxPoints);
    report.rating = dto.rating;
    report.ratingComment = dto.comment ?? null;
    report.ratedBy = actor.id;
    report.ratedAt = new Date();
    report.pointsAwarded = points;
    await report.save();
    const [year, month] = report.date.split('-').map(Number);
    if (points > 0) {
      await this.kpiService.award({
        userId: report.userId,
        departmentId: report.departmentId,
        points,
        source: PointSource.DAILY_REPORT,
        referenceId: String(report._id),
        reason: `Kunlik hisobot ${report.date} (${dto.rating}/5)`,
        createdBy: actor.id,
        year,
        month,
      });
    }
    await this.notificationsService.notify({
      userId: report.userId,
      type: NotificationType.REPORT_RATED,
      title: 'Kunlik hisobot baholandi',
      body: `${report.date} hisobotingiz ${dto.rating}/5 baholandi, +${points} ball.`,
      data: { reportId: String(report._id), rating: dto.rating, points },
    });
    return this.serialize(report);
  }

  async missingToday(departmentIds: string[]) {
    if (departmentIds.length === 0) return [];
    const today = todayIsoDate();
    const memberSets = await Promise.all(departmentIds.map((id) => this.scopeService.departmentMemberIds(id)));
    const memberIds = [...new Set(memberSets.flat())];
    if (memberIds.length === 0) return [];
    const submitted = await this.reportModel.find({ userId: { $in: memberIds }, date: today }).select('userId').lean();
    const submittedIds = new Set(submitted.map((item) => item.userId));
    const missing = await this.userRepository.find({ where: { id: In(memberIds.filter((id) => !submittedIds.has(id))), status: EmployeeStatus.ACTIVE } });
    return missing.map((user) => ({ userId: user.id, fullName: user.fullName, position: user.position, photoFileId: user.photoFileId }));
  }

  async statsForUsers(userIds: string[], start: string, end: string): Promise<Map<string, { submitted: number; averageRating: number }>> {
    if (userIds.length === 0) return new Map();
    const rows = await this.reportModel.aggregate<{ _id: string; submitted: number; averageRating: number | null }>([
      { $match: { userId: { $in: userIds }, date: { $gte: start, $lte: end } } },
      { $group: { _id: '$userId', submitted: { $sum: 1 }, averageRating: { $avg: '$rating' } } },
    ]);
    return new Map(rows.map((row) => [row._id, { submitted: row.submitted, averageRating: Math.round((row.averageRating ?? 0) * 100) / 100 }]));
  }

  async countForDate(departmentIds: string[] | null, date: string) {
    const filter: Record<string, unknown> = { date };
    if (departmentIds) {
      if (departmentIds.length === 0) return { submitted: 0, rated: 0 };
      filter.departmentId = { $in: departmentIds };
    }
    const [submitted, rated] = await Promise.all([
      this.reportModel.countDocuments(filter),
      this.reportModel.countDocuments({ ...filter, ratedAt: { $ne: null } }),
    ]);
    return { submitted, rated };
  }

  @Cron('0 * * * *', { timeZone: APP_TIMEZONE })
  async remindMissingReports() {
    const settings = await this.organizationService.get();
    const now = nowInZone();
    if (now.hour() !== settings.reportDeadlineHour) return;
    const today = todayIsoDate();
    if (!(await this.calendarService.isWorkingDay(today))) return;
    const activeEmployees = await this.userRepository.find({
      where: { status: EmployeeStatus.ACTIVE, role: In([UserRole.EMPLOYEE, UserRole.DEPARTMENT_HEAD]) },
      select: { id: true },
    });
    const ids = activeEmployees.map((user) => user.id);
    if (ids.length === 0) return;
    const submitted = await this.reportModel.find({ userId: { $in: ids }, date: today }).select('userId').lean();
    const submittedIds = new Set(submitted.map((item) => item.userId));
    const missing = ids.filter((id) => !submittedIds.has(id));
    const assigned: string[] = [];
    for (const userId of missing) {
      if (await this.scopeService.primaryDepartmentId(userId)) assigned.push(userId);
    }
    await this.notificationsService.notifyMany(assigned, {
      type: NotificationType.REPORT_MISSING,
      title: 'Kunlik hisobot yuborilmagan',
      body: `${today} uchun kun yakuni hisobotini hali yubormadingiz. Iltimos, ish kuni tugashidan oldin yuboring.`,
      data: { date: today },
    });
    this.logger.log(`Report reminders sent to ${assigned.length} employees for ${today}`);
  }

  private serialize(report: DailyReportDocument | (DailyReport & { _id: unknown })) {
    const plain = 'toObject' in report ? report.toObject() : report;
    return {
      id: String(plain._id),
      userId: plain.userId,
      userFullName: plain.userFullName,
      departmentId: plain.departmentId,
      date: plain.date,
      content: plain.content,
      completedTaskIds: plain.completedTaskIds ?? [],
      attachmentFileIds: plain.attachmentFileIds ?? [],
      rating: plain.rating,
      ratingComment: plain.ratingComment,
      ratedBy: plain.ratedBy,
      ratedAt: plain.ratedAt,
      pointsAwarded: plain.pointsAwarded,
      submittedAt: plain.submittedAt,
      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
    };
  }
}
