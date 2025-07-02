import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { CalendarDayType } from '../../common/enums';
import { ErrorCodes } from '../../common/errors/error-codes';
import { eachDateOfRange, monthBounds, weekdayOf } from '../../common/utils/date.util';
import { UpsertCalendarDayDto } from './dto/upsert-calendar-day.dto';
import { CalendarDay } from './entities/calendar-day.entity';

export interface CalendarDayView {
  date: string;
  type: CalendarDayType;
  title: string | null;
  isOverride: boolean;
  weekday: number;
}

@Injectable()
export class CalendarService {
  constructor(@InjectRepository(CalendarDay) private readonly repository: Repository<CalendarDay>) {}

  defaultTypeFor(isoDate: string): CalendarDayType {
    const weekday = weekdayOf(isoDate);
    return weekday === 0 || weekday === 6 ? CalendarDayType.WEEKEND : CalendarDayType.WORKING;
  }

  async month(year: number, month: number): Promise<CalendarDayView[]> {
    const bounds = monthBounds(year, month);
    return this.range(bounds.start, bounds.end);
  }

  async range(start: string, end: string): Promise<CalendarDayView[]> {
    const overrides = await this.repository.find({ where: { date: Between(start, end) } });
    const overrideMap = new Map(overrides.map((day) => [day.date, day]));
    return eachDateOfRange(start, end).map((date) => {
      const override = overrideMap.get(date);
      return {
        date,
        type: override?.type ?? this.defaultTypeFor(date),
        title: override?.title ?? null,
        isOverride: Boolean(override),
        weekday: weekdayOf(date),
      };
    });
  }

  async workingDays(start: string, end: string): Promise<string[]> {
    const days = await this.range(start, end);
    return days.filter((day) => day.type === CalendarDayType.WORKING).map((day) => day.date);
  }

  async isWorkingDay(isoDate: string): Promise<boolean> {
    const override = await this.repository.findOne({ where: { date: isoDate } });
    const type = override?.type ?? this.defaultTypeFor(isoDate);
    return type === CalendarDayType.WORKING;
  }

  async upsert(dto: UpsertCalendarDayDto, actorId: string): Promise<CalendarDayView> {
    if (Number.isNaN(Date.parse(dto.date))) throw new BadRequestException(ErrorCodes.CALENDAR_INVALID_DATE);
    const existing = await this.repository.findOne({ where: { date: dto.date } });
    const entity = existing ?? this.repository.create({ date: dto.date, createdBy: actorId });
    entity.type = dto.type;
    entity.title = dto.title ?? null;
    const saved = await this.repository.save(entity);
    return { date: saved.date, type: saved.type, title: saved.title, isOverride: true, weekday: weekdayOf(saved.date) };
  }

  async bulkUpsert(days: UpsertCalendarDayDto[], actorId: string) {
    const results: CalendarDayView[] = [];
    for (const day of days) results.push(await this.upsert(day, actorId));
    return results;
  }

  async remove(date: string): Promise<{ success: boolean }> {
    await this.repository.delete({ date });
    return { success: true };
  }

  async holidaysInRange(start: string, end: string) {
    return this.repository.find({
      where: { date: Between(start, end) },
      order: { date: 'ASC' },
    });
  }
}
