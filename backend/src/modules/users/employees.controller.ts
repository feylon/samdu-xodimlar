import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../common/decorators';
import { UserRole } from '../../common/enums';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { DepartmentScopeService } from '../departments/department-scope.service';
import { ChangeStatusDto } from './dto/change-status.dto';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { SetAssignmentsDto } from './dto/set-assignments.dto';
import { TransferEmployeeDto } from './dto/transfer-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { UsersService } from './users.service';

const EMPLOYEE_ROLES = [UserRole.EMPLOYEE, UserRole.DEPARTMENT_HEAD];

@ApiTags('Employees (HR)')
@ApiBearerAuth()
@Controller('employees')
export class EmployeesController {
  constructor(
    private readonly usersService: UsersService,
    private readonly scopeService: DepartmentScopeService,
  ) {}

  @Get()
  @Roles(UserRole.HR, UserRole.SUPERADMIN, UserRole.DEPARTMENT_HEAD)
  @ApiOperation({ summary: 'List employees; department heads only see their own departments' })
  async list(@Query() query: ListUsersDto, @CurrentUser() actor: AuthenticatedUser) {
    if (actor.role === UserRole.DEPARTMENT_HEAD) {
      const departmentIds = await this.scopeService.managedDepartmentIds(actor.id);
      if (departmentIds.length === 0) return { items: [], total: 0, page: query.page, limit: query.limit };
      return this.usersService.list(query, EMPLOYEE_ROLES, departmentIds);
    }
    return this.usersService.list(query, EMPLOYEE_ROLES);
  }

  @Post()
  @Roles(UserRole.HR)
  @ApiOperation({ summary: 'Onboard a new employee' })
  create(@Body() dto: CreateEmployeeDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.usersService.createEmployee(dto, actor);
  }

  @Get(':id')
  @Roles(UserRole.HR, UserRole.SUPERADMIN, UserRole.DEPARTMENT_HEAD)
  @ApiOperation({ summary: 'Employee details with assignments and status history' })
  async get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    await this.scopeService.assertCanViewUser(actor, id);
    return this.usersService.getDetailed(id);
  }

  @Patch(':id')
  @Roles(UserRole.HR, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Update employee personal data' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateEmployeeDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.usersService.updatePersonalData(id, dto, actor);
  }

  @Patch(':id/status')
  @Roles(UserRole.HR, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Freeze, send on vacation, register sick leave, terminate, block or re-activate' })
  changeStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ChangeStatusDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.usersService.changeStatus(id, dto, actor);
  }

  @Put(':id/assignments')
  @Roles(UserRole.HR, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Replace department assignments; total active rate must not exceed 100%' })
  setAssignments(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetAssignmentsDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.usersService.setAssignments(id, dto.assignments, actor);
  }

  @Post(':id/transfer')
  @Roles(UserRole.HR, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Transfer employee between departments' })
  transfer(@Param('id', ParseUUIDPipe) id: string, @Body() dto: TransferEmployeeDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.usersService.transfer(id, dto, actor);
  }

  @Get(':id/status-history')
  @Roles(UserRole.HR, UserRole.SUPERADMIN, UserRole.DEPARTMENT_HEAD)
  @ApiOperation({ summary: 'Status lifecycle history of an employee' })
  async statusHistory(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    await this.scopeService.assertCanViewUser(actor, id);
    return this.usersService.statusHistory(id);
  }
}
