import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../common/decorators';
import { YearMonthDto } from '../../common/dto/year-month.dto';
import { UserRole } from '../../common/enums';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { currentYearMonth } from '../../common/utils/date.util';
import { DepartmentScopeService } from '../departments/department-scope.service';
import { AttendanceService } from './attendance.service';
import { AttendanceQueryDto } from './dto/attendance-query.dto';
import { BulkMarkAttendanceDto, MarkAttendanceDto } from './dto/mark-attendance.dto';

@ApiTags('Attendance')
@ApiBearerAuth()
@Controller('attendance')
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly scopeService: DepartmentScopeService,
  ) {}

  @Post()
  @Roles(UserRole.DEPARTMENT_HEAD)
  @ApiOperation({ summary: 'Mark attendance for today only; past dates are rejected' })
  mark(@Body() dto: MarkAttendanceDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.attendanceService.mark(dto, actor);
  }

  @Post('bulk')
  @Roles(UserRole.DEPARTMENT_HEAD)
  @ApiOperation({ summary: 'Mark attendance for several team members for today' })
  markBulk(@Body() dto: BulkMarkAttendanceDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.attendanceService.markBulk(dto.records, actor);
  }

  @Get()
  @ApiOperation({ summary: 'Attendance records within the caller scope' })
  list(@Query() query: AttendanceQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.attendanceService.list(query, actor);
  }

  @Get('today/:departmentId')
  @ApiOperation({ summary: 'Today sheet of a department with current marks' })
  today(@Param('departmentId', ParseUUIDPipe) departmentId: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.attendanceService.todaySheet(departmentId, actor);
  }

  @Get('me')
  @ApiOperation({ summary: 'My monthly attendance summary' })
  me(@Query() query: YearMonthDto, @CurrentUser() actor: AuthenticatedUser) {
    const fallback = currentYearMonth();
    return this.attendanceService.monthlySummaryForUser(actor.id, query.year ?? fallback.year, query.month ?? fallback.month);
  }

  @Get('users/:userId/summary')
  @Roles(UserRole.HR, UserRole.SUPERADMIN, UserRole.DEPARTMENT_HEAD)
  @ApiOperation({ summary: 'Monthly attendance summary of an employee in scope' })
  async userSummary(@Param('userId', ParseUUIDPipe) userId: string, @Query() query: YearMonthDto, @CurrentUser() actor: AuthenticatedUser) {
    await this.scopeService.assertManagesUser(actor, userId);
    const fallback = currentYearMonth();
    return this.attendanceService.monthlySummaryForUser(userId, query.year ?? fallback.year, query.month ?? fallback.month);
  }
}
