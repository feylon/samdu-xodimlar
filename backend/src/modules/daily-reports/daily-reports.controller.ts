import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../common/decorators';
import { YearMonthDto } from '../../common/dto/year-month.dto';
import { UserRole } from '../../common/enums';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { currentYearMonth } from '../../common/utils/date.util';
import { DepartmentScopeService } from '../departments/department-scope.service';
import { DailyReportsService } from './daily-reports.service';
import { RateReportDto } from './dto/rate-report.dto';
import { ReportQueryDto } from './dto/report-query.dto';
import { SubmitReportDto } from './dto/submit-report.dto';

@ApiTags('Daily Reports')
@ApiBearerAuth()
@Controller('reports/daily')
export class DailyReportsController {
  constructor(
    private readonly reportsService: DailyReportsService,
    private readonly scopeService: DepartmentScopeService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Submit or update today end-of-day report' })
  submit(@Body() dto: SubmitReportDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.reportsService.submit(dto, actor);
  }

  @Get('today')
  @ApiOperation({ summary: 'My report for today, null when not yet submitted' })
  today(@CurrentUser() actor: AuthenticatedUser) {
    return this.reportsService.today(actor);
  }

  @Get('me')
  @ApiOperation({ summary: 'My reports for a month' })
  mine(@Query() query: YearMonthDto, @CurrentUser() actor: AuthenticatedUser) {
    const fallback = currentYearMonth();
    return this.reportsService.myReports(actor, query.year ?? fallback.year, query.month ?? fallback.month);
  }

  @Get('missing')
  @Roles(UserRole.DEPARTMENT_HEAD, UserRole.HR, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Team members who have not submitted today' })
  async missing(@CurrentUser() actor: AuthenticatedUser, @Query('departmentId') departmentId?: string) {
    if (departmentId) {
      await this.scopeService.assertCanViewDepartment(actor, departmentId);
      return this.reportsService.missingToday([departmentId]);
    }
    const ids = actor.role === UserRole.DEPARTMENT_HEAD ? await this.scopeService.managedDepartmentIds(actor.id) : [];
    return this.reportsService.missingToday(ids);
  }

  @Get()
  @ApiOperation({ summary: 'Reports within scope with filters' })
  list(@Query() query: ReportQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.reportsService.list(query, actor);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Report details' })
  get(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.reportsService.getOne(id, actor);
  }

  @Post(':id/rate')
  @Roles(UserRole.DEPARTMENT_HEAD)
  @ApiOperation({ summary: 'Rate a report 1-5 and award KPI points' })
  rate(@Param('id') id: string, @Body() dto: RateReportDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.reportsService.rate(id, dto, actor);
  }
}
