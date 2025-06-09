import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../common/decorators';
import { UserRole } from '../../common/enums';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { CreateHrDto } from './dto/create-hr.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { UpdateCredentialsDto } from './dto/update-credentials.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { UsersService } from './users.service';

@ApiTags('Users (Superadmin)')
@ApiBearerAuth()
@Roles(UserRole.SUPERADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List all system users with filters' })
  list(@Query() query: ListUsersDto) {
    return this.usersService.list(query);
  }

  @Get('lookup')
  @ApiOperation({ summary: 'Lookup a user by ID, login, full name or PINFL' })
  @ApiQuery({ name: 'query', required: true })
  lookup(@Query('query') query: string) {
    return this.usersService.lookup(query ?? '');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user with assignments and status history' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.getDetailed(id);
  }

  @Post('hr')
  @ApiOperation({ summary: 'Provision an HR department account' })
  createHr(@Body() dto: CreateHrDto) {
    return this.usersService.createHr(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit personal data of any user including HR accounts' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateEmployeeDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.usersService.updatePersonalData(id, dto, actor);
  }

  @Patch(':id/credentials')
  @ApiOperation({ summary: 'Reset login and/or password of any user' })
  credentials(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCredentialsDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.usersService.updateCredentials(id, dto, actor);
  }
}
