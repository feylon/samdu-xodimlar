import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceModule } from '../attendance/attendance.module';
import { DailyReportsModule } from '../daily-reports/daily-reports.module';
import { DepartmentsModule } from '../departments/departments.module';
import { Department } from '../departments/entities/department.entity';
import { KpiModule } from '../kpi/kpi.module';
import { PayrollModule } from '../payroll/payroll.module';
import { PollsModule } from '../polls/polls.module';
import { SessionsModule } from '../sessions/sessions.module';
import { TasksModule } from '../tasks/tasks.module';
import { User } from '../users/entities/user.entity';
import { UsersModule } from '../users/users.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Department]),
    UsersModule,
    AttendanceModule,
    TasksModule,
    KpiModule,
    PayrollModule,
    DailyReportsModule,
    SessionsModule,
    PollsModule,
    DepartmentsModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
