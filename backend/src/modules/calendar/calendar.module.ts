import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { CalendarDay } from './entities/calendar-day.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CalendarDay])],
  controllers: [CalendarController],
  providers: [CalendarService],
  exports: [CalendarService],
})
export class CalendarModule {}
