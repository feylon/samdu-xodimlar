import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../common/decorators';
import { UserRole } from '../../common/enums';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { CreateTaskDto } from './dto/create-task.dto';
import { SubmitTaskStatusDto } from './dto/submit-task-status.dto';
import { TaskQueryDto } from './dto/task-query.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { VerifyTaskDto } from './dto/verify-task.dto';
import { TasksService } from './tasks.service';

@ApiTags('Tasks')
@ApiBearerAuth()
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @ApiOperation({ summary: 'Tasks within the caller scope with filters and sorting' })
  list(@Query() query: TaskQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.tasksService.list(query, actor);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Task details' })
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.tasksService.getOne(id, actor);
  }

  @Post()
  @Roles(UserRole.DEPARTMENT_HEAD)
  @ApiOperation({ summary: 'Assign a regular or bonus task to a team member' })
  create(@Body() dto: CreateTaskDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.tasksService.create(dto, actor);
  }

  @Patch(':id')
  @Roles(UserRole.DEPARTMENT_HEAD)
  @ApiOperation({ summary: 'Edit a task that is not yet verified' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTaskDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.tasksService.update(id, dto, actor);
  }

  @Delete(':id')
  @Roles(UserRole.DEPARTMENT_HEAD)
  @ApiOperation({ summary: 'Delete an unverified task' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.tasksService.remove(id, actor);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Assignee marks the task In progress, Completed or Partially completed' })
  submitStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SubmitTaskStatusDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.tasksService.submitStatus(id, dto, actor);
  }

  @Post(':id/verify')
  @Roles(UserRole.DEPARTMENT_HEAD)
  @ApiOperation({ summary: 'Verify completion and award KPI points, or reject' })
  verify(@Param('id', ParseUUIDPipe) id: string, @Body() dto: VerifyTaskDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.tasksService.verify(id, dto, actor);
  }
}
