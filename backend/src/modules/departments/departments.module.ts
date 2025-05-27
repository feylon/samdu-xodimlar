import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { DepartmentScopeService } from './department-scope.service';
import { DepartmentsController } from './departments.controller';
import { DepartmentsService } from './departments.service';
import { DepartmentAssignment } from './entities/department-assignment.entity';
import { Department } from './entities/department.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Department, DepartmentAssignment, User])],
  controllers: [DepartmentsController],
  providers: [DepartmentsService, DepartmentScopeService],
  exports: [DepartmentsService, DepartmentScopeService],
})
export class DepartmentsModule {}
