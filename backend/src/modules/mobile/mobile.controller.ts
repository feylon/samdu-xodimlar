import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, Public, RequestMetadata, SkipAudit } from '../../common/decorators';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ClientType } from '../../common/enums';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { RequestMeta } from '../../common/utils/request-meta.util';
import { AuthService } from '../auth/auth.service';
import { ChangePasswordDto } from '../auth/dto/change-password.dto';
import { MobileLoginDto } from '../auth/dto/login.dto';
import { RefreshTokenDto } from '../auth/dto/refresh-token.dto';
import { DashboardService } from '../dashboard/dashboard.service';
import { ListNotificationsDto } from '../notifications/dto/list-notifications.dto';
import { NotificationsService } from '../notifications/notifications.service';

@ApiTags('Mobile App Operations')
@Controller('mobile')
export class MobileController {
  constructor(
    private readonly authService: AuthService,
    private readonly dashboardService: DashboardService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Public()
  @Post('auth/login')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Mobile login with device registration' })
  login(@Body() dto: MobileLoginDto, @RequestMetadata() meta: RequestMeta) {
    return this.authService.login(dto, ClientType.MOBILE, meta);
  }

  @Public()
  @Post('auth/refresh')
  @HttpCode(200)
  @SkipAudit()
  @ApiOperation({ summary: 'Mobile token refresh with rotation' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('auth/logout')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Terminate the current mobile session' })
  logout(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.logout(user);
  }

  @Post('auth/change-password')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change own password from mobile' })
  changePassword(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user, dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Profile of the mobile user' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user);
  }

  @Get('sessions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Active sessions of the mobile user across devices' })
  sessions(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.listMySessions(user);
  }

  @Delete('sessions/others')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Terminate every session except the current one' })
  terminateOthers(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.terminateOtherSessions(user);
  }

  @Delete('sessions/:sessionId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Terminate a specific session by id' })
  terminate(@CurrentUser() user: AuthenticatedUser, @Param('sessionId') sessionId: string) {
    return this.authService.terminateMySession(user, sessionId);
  }

  @Get('login-history')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Login history of the mobile user' })
  loginHistory(@CurrentUser() user: AuthenticatedUser, @Query() query: PaginationDto) {
    return this.authService.myLoginHistory(user, query.page, query.limit);
  }

  @Get('dashboard')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Compact role-aware dashboard payload for mobile' })
  dashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.forUser(user);
  }

  @Get('notifications')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Notifications feed for mobile' })
  notifications(@CurrentUser() user: AuthenticatedUser, @Query() query: ListNotificationsDto) {
    return this.notificationsService.list(user.id, query.unreadOnly, query.page, query.limit);
  }
}
