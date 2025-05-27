import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../common/decorators';
import { UserRole } from '../../common/enums';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { DepartmentScopeService } from './department-scope.service';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { SetHeadDto } from './dto/set-head.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@ApiTags('Departments')
@ApiBearerAuth()
@Controller('departments')
export class DepartmentsController {
  constructor(
    private readonly departmentsService: DepartmentsService,
    private readonly scopeService: DepartmentScopeService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List departments visible to the current user' })
  @ApiQuery({ name: 'includeInactive', required: false })
  async list(@CurrentUser() actor: AuthenticatedUser, @Query('includeInactive') includeInactive?: string) {
    const visible = await this.scopeService.visibleDepartmentIds(actor);
    return this.departmentsService.list(includeInactive === 'true', visible);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Department with members' })
  async get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    await this.scopeService.assertCanViewDepartment(actor, id);
    return this.departmentsService.getDetailed(id);
  }

  @Post()
  @Roles(UserRole.HR, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Create a department' })
  create(@Body() dto: CreateDepartmentDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.departmentsService.create(dto, actor);
  }

  @Patch(':id')
  @Roles(UserRole.HR, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Update a department' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDepartmentDto) {
    return this.departmentsService.update(id, dto);
  }

  @Put(':id/head')
  @Roles(UserRole.HR, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Assign or remove the department head' })
  setHead(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetHeadDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.departmentsService.setHead(id, dto.userId ?? null, actor);
  }
}
