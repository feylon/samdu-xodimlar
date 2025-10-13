import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { EmployeeStatus, UserRole } from '../../common/enums';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { currentYearMonth, monthBounds, nowInZone, todayIsoDate } from '../../common/utils/date.util';
import { AttendanceService } from '../attendance/attendance.service';
import { AuditService } from '../audit/audit.service';
import { DailyReportsService } from '../daily-reports/daily-reports.service';
import { DepartmentScopeService } from '../departments/department-scope.service';
import { Department } from '../departments/entities/department.entity';
import { KpiService } from '../kpi/kpi.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PayrollService } from '../payroll/payroll.service';
import { PollsService } from '../polls/polls.service';
import { SessionsService } from '../sessions/sessions.service';
import { TasksService } from '../tasks/tasks.service';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Department) private readonly departmentRepository: Repository<Department>,
    private readonly usersService: UsersService,
    private readonly attendanceService: AttendanceService,
    private readonly tasksService: TasksService,
    private readonly kpiService: KpiService,
    private readonly payrollService: PayrollService,
    private readonly reportsService: DailyReportsService,
    private readonly sessionsService: SessionsService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly pollsService: PollsService,
    private readonly scopeService: DepartmentScopeService,
  ) {}

  async forUser(actor: AuthenticatedUser) {
    switch (actor.role) {
      case UserRole.SUPERADMIN:
        return this.superadmin();
      case UserRole.HR:
        return this.hr();
      case UserRole.DEPARTMENT_HEAD:
        return this.departmentHead(actor);
      default:
        return this.employee(actor);
    }
  }

  private async organizationWide() {
    const period = currentYearMonth();
    const bounds = monthBounds(period.year, period.month);
    const today = todayIsoDate();
    const [statusRows, departments, attendanceToday, members, taskCounts, payrollSummary, hired, terminated, attendanceSeries, overdue] = await Promise.all([
      this.usersService.countByStatus(),
      this.departmentRepository.count({ where: { isActive: true } }),
      this.attendanceService.departmentRatioForDate(null, today),
      this.attendanceService.activeMemberCount(null),
      this.tasksService.statusCounts(null),
      this.payrollService.summary(period.year, period.month, null),
      this.usersService.countHiredBetween(bounds.start, bounds.end),
      this.usersService.countTerminatedBetween(bounds.start, bounds.end),
      this.attendanceService.dailySeries(null, bounds.start, today),
      this.tasksService.overdueCount(null, undefined, today),
    ]);
    const employeeIds = (await this.userRepository.find({ where: { role: In([UserRole.EMPLOYEE, UserRole.DEPARTMENT_HEAD]) }, select: { id: true } })).map((user) => user.id);
    const averagePoints = await this.kpiService.averagePointsForUsers(employeeIds, period.year, period.month);
    const statusCounts = Object.fromEntries(Object.values(EmployeeStatus).map((status) => [status, 0]));
    for (const row of statusRows) statusCounts[row.status] = Number(row.count);
    return {
      period,
      employees: { total: employeeIds.length, byStatus: statusCounts, hiredThisMonth: hired, terminatedThisMonth: terminated },
      departments,
      attendanceToday: { ...attendanceToday, expected: members, ratio: members ? Math.round((attendanceToday.present / members) * 10000) / 10000 : 0 },
      attendanceSeries,
      tasks: { byStatus: taskCounts, overdue },
      payroll: payrollSummary,
      kpi: { averagePoints },
    };
  }

  private async superadmin() {
    const since = nowInZone().subtract(24, 'hour').toDate();
    const [base, activeSessions, logins24h, failedLogins24h, actions24h, topEntities, lastMonths] = await Promise.all([
      this.organizationWide(),
      this.sessionsService.countActive(),
      this.sessionsService.countLoginsSince(since),
      this.sessionsService.countFailedLoginsSince(since),
      this.auditService.countSince(since),
      this.auditService.actionsSummary(since),
      this.payrollService.monthlyTotals(this.lastMonths(6)),
    ]);
    return {
      role: UserRole.SUPERADMIN,
      ...base,
      security: { activeSessions, logins24h, failedLogins24h, actions24h, topEntities: topEntities.map((row) => ({ entity: row._id, count: row.count })) },
      payrollTrend: lastMonths,
    };
  }

  private async hr() {
    const period = currentYearMonth();
    const bounds = monthBounds(period.year, period.month);
    const [base, lastMonths, reportsToday, leaderboard] = await Promise.all([
      this.organizationWide(),
      this.payrollService.monthlyTotals(this.lastMonths(6)),
      this.reportsService.countForDate(null, todayIsoDate()),
      this.kpiService.leaderboard(undefined, period.year, period.month, { id: '', login: '', role: UserRole.HR, sessionId: '', fullName: '' }),
    ]);
    return {
      role: UserRole.HR,
      ...base,
      payrollTrend: lastMonths,
      reportsToday,
      topPerformers: leaderboard.slice(0, 5),
      monthBounds: bounds,
    };
  }

  private async departmentHead(actor: AuthenticatedUser) {
    const period = currentYearMonth();
    const bounds = monthBounds(period.year, period.month);
    const today = todayIsoDate();
    const departmentIds = await this.scopeService.managedDepartmentIds(actor.id);
    const [departments, members, attendanceToday, taskCounts, pendingReview, missingReports, reportsToday, leaderboard, attendanceSeries, overdue, activePolls] = await Promise.all([
      this.departmentRepository.find({ where: departmentIds.length ? { id: In(departmentIds) } : { id: In(['00000000-0000-0000-0000-000000000000']) } }),
      this.attendanceService.activeMemberCount(departmentIds),
      this.attendanceService.departmentRatioForDate(departmentIds, today),
      this.tasksService.statusCounts(departmentIds),
      this.tasksService.pendingReview(departmentIds),
      this.reportsService.missingToday(departmentIds),
      this.reportsService.countForDate(departmentIds, today),
      this.kpiService.leaderboard(undefined, period.year, period.month, actor),
      this.attendanceService.dailySeries(departmentIds, bounds.start, today),
      this.tasksService.overdueCount(departmentIds, undefined, today),
      this.pollsService.countActive(departmentIds),
    ]);
    return {
      role: UserRole.DEPARTMENT_HEAD,
      period,
      departments: departments.map((department) => ({ id: department.id, name: department.name, code: department.code })),
      team: { members },
      attendanceToday: { ...attendanceToday, expected: members, ratio: members ? Math.round((attendanceToday.present / members) * 10000) / 10000 : 0 },
      attendanceSeries,
      tasks: { byStatus: taskCounts, overdue, pendingReview: pendingReview.length, pendingReviewItems: pendingReview.slice(0, 10) },
      reports: { ...reportsToday, missing: missingReports.length, missingItems: missingReports },
      leaderboard: leaderboard.slice(0, 10),
      activePolls,
    };
  }

  private async employee(actor: AuthenticatedUser) {
    const period = currentYearMonth();
    const today = todayIsoDate();
    const [kpi, attendance, taskCounts, overdue, reportToday, unread, latestPayroll, departmentIds] = await Promise.all([
      this.kpiService.myKpi(actor.id, period.year, period.month),
      this.attendanceService.monthlySummaryForUser(actor.id, period.year, period.month),
      this.tasksService.statusCounts(null, actor.id),
      this.tasksService.overdueCount(null, actor.id, today),
      this.reportsService.today(actor),
      this.notificationsService.countUnread(actor.id),
      this.payrollService.latestForUser(actor.id),
      this.scopeService.memberDepartmentIds(actor.id),
    ]);
    const activePolls = await this.pollsService.countActive(departmentIds);
    return {
      role: UserRole.EMPLOYEE,
      period,
      points: kpi.breakdown,
      pointsHistory: kpi.history,
      attendance: {
        workingDays: attendance.workingDays,
        elapsedWorkingDays: attendance.elapsedWorkingDays,
        presentDays: attendance.presentDays,
        ratio: attendance.attendanceRatio,
        counts: attendance.counts,
      },
      tasks: { byStatus: taskCounts, overdue },
      reportToday: reportToday ? { submitted: true, rating: reportToday.rating, pointsAwarded: reportToday.pointsAwarded } : { submitted: false },
      unreadNotifications: unread,
      latestPayroll: latestPayroll ? this.payrollService.serialize(latestPayroll) : null,
      activePolls,
    };
  }

  private lastMonths(count: number): Array<{ year: number; month: number }> {
    const result: Array<{ year: number; month: number }> = [];
    let cursor = nowInZone();
    for (let index = 0; index < count; index += 1) {
      result.push({ year: cursor.year(), month: cursor.month() + 1 });
      cursor = cursor.subtract(1, 'month');
    }
    return result.reverse();
  }
}
