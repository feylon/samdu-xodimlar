import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceModule } from '../attendance/attendance.module';
import { CalendarModule } from '../calendar/calendar.module';
import { DepartmentsModule } from '../departments/departments.module';
import { DepartmentAssignment } from '../departments/entities/department-assignment.entity';
import { Department } from '../departments/entities/department.entity';
import { KpiModule } from '../kpi/kpi.module';
import { OrganizationModule } from '../organization/organization.module';
import { User } from '../users/entities/user.entity';
import { PayrollRecord } from './entities/payroll-record.entity';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PayrollRecord, User, DepartmentAssignment, Department]),
    AttendanceModule,
    CalendarModule,
    KpiModule,
    OrganizationModule,
    DepartmentsModule,
  ],
  controllers: [PayrollController],
  providers: [PayrollService],
  exports: [PayrollService],
})
export class PayrollModule {}
