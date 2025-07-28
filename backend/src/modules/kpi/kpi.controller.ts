import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../common/decorators';
import { YearMonthDto } from '../../common/dto/year-month.dto';
import { UserRole } from '../../common/enums';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { currentYearMonth } from '../../common/utils/date.util';
import { AdjustPointsDto } from './dto/adjust-points.dto';
import { KpiQueryDto } from './dto/kpi-query.dto';
import { KpiService } from './kpi.service';

const resolvePeriod = (query: YearMonthDto) => {
  const fallback = currentYearMonth();
  return { year: query.year ?? fallback.year, month: query.month ?? fallback.month };
};

@ApiTags('KPI')
@ApiBearerAuth()
@Controller('kpi')
export class KpiController {
  constructor(private readonly kpiService: KpiService) {}

  @Get('me')
  @ApiOperation({ summary: 'My points for the month with breakdown and history' })
  me(@Query() query: YearMonthDto, @CurrentUser() actor: AuthenticatedUser) {
    const period = resolvePeriod(query);
    return this.kpiService.myKpi(actor.id, period.year, period.month);
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Points leaderboard within scope' })
  leaderboard(@Query() query: KpiQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    const period = resolvePeriod(query);
    return this.kpiService.leaderboard(query.departmentId, period.year, period.month, actor);
  }

  @Get('departments/:departmentId')
  @ApiOperation({ summary: 'Department KPI summary' })
  department(@Param('departmentId', ParseUUIDPipe) departmentId: string, @Query() query: YearMonthDto, @CurrentUser() actor: AuthenticatedUser) {
    const period = resolvePeriod(query);
    return this.kpiService.departmentSummary(departmentId, period.year, period.month, actor);
  }

  @Get('users/:userId')
  @Roles(UserRole.HR, UserRole.SUPERADMIN, UserRole.DEPARTMENT_HEAD)
  @ApiOperation({ summary: 'KPI of an employee in scope' })
  user(@Param('userId', ParseUUIDPipe) userId: string, @Query() query: YearMonthDto, @CurrentUser() actor: AuthenticatedUser) {
    const period = resolvePeriod(query);
    return this.kpiService.userKpi(userId, period.year, period.month, actor);
  }

  @Post('adjust')
  @Roles(UserRole.DEPARTMENT_HEAD, UserRole.HR)
  @ApiOperation({ summary: 'Manually add or remove points with a reason' })
  adjust(@Body() dto: AdjustPointsDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.kpiService.adjust(dto, actor);
  }

  @Post('snapshot')
  @Roles(UserRole.SUPERADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Force the monthly KPI snapshot for a period' })
  async snapshot(@Query() query: YearMonthDto) {
    const period = resolvePeriod(query);
    return { ...period, users: await this.kpiService.snapshotMonth(period.year, period.month) };
  }
}
