import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, Public, RequestMetadata, SkipAudit } from '../../common/decorators';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ClientType } from '../../common/enums';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { RequestMeta } from '../../common/utils/request-meta.util';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@ApiTags('Auth (Web)')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Web client login' })
  login(@Body() dto: LoginDto, @RequestMetadata() meta: RequestMeta) {
    return this.authService.login(dto, ClientType.WEB, meta);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @SkipAudit()
  @ApiOperation({ summary: 'Rotate refresh token and issue new access token' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Terminate current session' })
  logout(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.logout(user);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Current user profile' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user);
  }

  @Post('change-password')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change own password' })
  changePassword(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user, dto);
  }

  @Get('sessions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List my active sessions' })
  sessions(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.listMySessions(user);
  }

  @Delete('sessions/others')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Terminate all my other sessions' })
  terminateOthers(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.terminateOtherSessions(user);
  }

  @Delete('sessions/:sessionId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Terminate one of my sessions' })
  terminate(@CurrentUser() user: AuthenticatedUser, @Param('sessionId') sessionId: string) {
    return this.authService.terminateMySession(user, sessionId);
  }

  @Get('login-history')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'My login history' })
  loginHistory(@CurrentUser() user: AuthenticatedUser, @Query() query: PaginationDto) {
    return this.authService.myLoginHistory(user, query.page, query.limit);
  }
}
