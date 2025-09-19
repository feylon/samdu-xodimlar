import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../common/decorators';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { UserRole } from '../../common/enums';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { CreatePollDto } from './dto/create-poll.dto';
import { VoteDto } from './dto/vote.dto';
import { PollsService } from './polls.service';

@ApiTags('Polls')
@ApiBearerAuth()
@Controller('polls')
export class PollsController {
  constructor(private readonly pollsService: PollsService) {}

  @Get()
  @ApiOperation({ summary: 'Polls visible to the caller' })
  @ApiQuery({ name: 'departmentId', required: false })
  @ApiQuery({ name: 'activeOnly', required: false })
  list(
    @Query() pagination: PaginationDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Query('departmentId') departmentId?: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return this.pollsService.list(pagination, actor, departmentId || undefined, activeOnly === 'true');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Poll details and results when permitted' })
  get(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.pollsService.getOne(id, actor);
  }

  @Post()
  @Roles(UserRole.DEPARTMENT_HEAD, UserRole.HR, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Create an internal poll' })
  create(@Body() dto: CreatePollDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.pollsService.create(dto, actor);
  }

  @Post(':id/vote')
  @ApiOperation({ summary: 'Cast a vote' })
  vote(@Param('id') id: string, @Body() dto: VoteDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.pollsService.vote(id, dto.optionIndex, actor);
  }

  @Patch(':id/close')
  @Roles(UserRole.DEPARTMENT_HEAD, UserRole.HR, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Close a poll' })
  close(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.pollsService.close(id, actor);
  }

  @Delete(':id')
  @Roles(UserRole.DEPARTMENT_HEAD, UserRole.HR, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Delete a poll' })
  remove(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.pollsService.remove(id, actor);
  }
}
