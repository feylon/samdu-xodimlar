import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DepartmentsModule } from '../departments/departments.module';
import { DepartmentAssignment } from '../departments/entities/department-assignment.entity';
import { Department } from '../departments/entities/department.entity';
import { SessionsModule } from '../sessions/sessions.module';
import { EmployeesController } from './employees.controller';
import { EmployeeStatusHistory } from './entities/employee-status-history.entity';
import { User } from './entities/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, EmployeeStatusHistory, DepartmentAssignment, Department]), SessionsModule, DepartmentsModule],
  controllers: [UsersController, EmployeesController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
