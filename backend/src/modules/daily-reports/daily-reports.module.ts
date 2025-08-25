import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalendarModule } from '../calendar/calendar.module';
import { DepartmentsModule } from '../departments/departments.module';
import { KpiModule } from '../kpi/kpi.module';
import { OrganizationModule } from '../organization/organization.module';
import { User } from '../users/entities/user.entity';
import { DailyReportsController } from './daily-reports.controller';
import { DailyReportsService } from './daily-reports.service';
import { DailyReport, DailyReportSchema } from './schemas/daily-report.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: DailyReport.name, schema: DailyReportSchema }]),
    TypeOrmModule.forFeature([User]),
    DepartmentsModule,
    KpiModule,
    CalendarModule,
    OrganizationModule,
  ],
  controllers: [DailyReportsController],
  providers: [DailyReportsService],
  exports: [DailyReportsService],
})
export class DailyReportsModule {}
