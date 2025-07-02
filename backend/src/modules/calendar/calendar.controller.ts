import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../common/decorators';
import { YearMonthDto } from '../../common/dto/year-month.dto';
import { UserRole } from '../../common/enums';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { currentYearMonth } from '../../common/utils/date.util';
import { CalendarService } from './calendar.service';
import { BulkUpsertCalendarDto, UpsertCalendarDayDto } from './dto/upsert-calendar-day.dto';

@ApiTags('Calendar')
@ApiBearerAuth()
@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get()
  @ApiOperation({ summary: 'Month view merging default weekends with HR overrides' })
  month(@Query() query: YearMonthDto) {
    const fallback = currentYearMonth();
    return this.calendarService.month(query.year ?? fallback.year, query.month ?? fallback.month);
  }

  @Put('days')
  @Roles(UserRole.HR, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Define a working day, weekend, holiday or non-working date' })
  upsert(@Body() dto: UpsertCalendarDayDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.calendarService.upsert(dto, actor.id);
  }

  @Post('days/bulk')
  @Roles(UserRole.HR, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Bulk define calendar days' })
  bulk(@Body() dto: BulkUpsertCalendarDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.calendarService.bulkUpsert(dto.days, actor.id);
  }

  @Delete('days/:date')
  @Roles(UserRole.HR, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Remove an override so the date falls back to the default rule' })
  remove(@Param('date') date: string) {
    return this.calendarService.remove(date);
  }
}
