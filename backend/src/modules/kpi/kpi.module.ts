import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceRecord } from '../attendance/entities/attendance-record.entity';
import { CalendarModule } from '../calendar/calendar.module';
import { DepartmentsModule } from '../departments/departments.module';
import { DepartmentAssignment } from '../departments/entities/department-assignment.entity';
import { Task } from '../tasks/entities/task.entity';
import { User } from '../users/entities/user.entity';
import { MonthlyKpiSummary } from './entities/monthly-kpi-summary.entity';
import { PointTransaction } from './entities/point-transaction.entity';
import { KpiController } from './kpi.controller';
import { KpiService } from './kpi.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PointTransaction, MonthlyKpiSummary, User, Task, AttendanceRecord, DepartmentAssignment]),
    DepartmentsModule,
    CalendarModule,
  ],
  controllers: [KpiController],
  providers: [KpiService],
  exports: [KpiService],
})
export class KpiModule {}
