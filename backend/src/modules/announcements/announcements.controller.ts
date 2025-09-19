import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../common/decorators';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { UserRole } from '../../common/enums';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';

@ApiTags('Announcements')
@ApiBearerAuth()
@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Get()
  @ApiOperation({ summary: 'Announcements visible to the caller' })
  @ApiQuery({ name: 'departmentId', required: false })
  @ApiQuery({ name: 'includeExpired', required: false })
  list(
    @Query() pagination: PaginationDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Query('departmentId') departmentId?: string,
    @Query('includeExpired') includeExpired?: string,
  ) {
    return this.announcementsService.list(pagination, actor, departmentId || undefined, includeExpired === 'true');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Announcement details' })
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.announcementsService.getOne(id, actor);
  }

  @Post()
  @Roles(UserRole.DEPARTMENT_HEAD, UserRole.HR, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Create a department or organization-wide announcement' })
  create(@Body() dto: CreateAnnouncementDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.announcementsService.create(dto, actor);
  }

  @Patch(':id')
  @Roles(UserRole.DEPARTMENT_HEAD, UserRole.HR, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Update an announcement' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAnnouncementDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.announcementsService.update(id, dto, actor);
  }

  @Delete(':id')
  @Roles(UserRole.DEPARTMENT_HEAD, UserRole.HR, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Delete an announcement' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.announcementsService.remove(id, actor);
  }
}
