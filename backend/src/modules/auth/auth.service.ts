import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ClientType, LOGIN_FORBIDDEN_STATUSES, NotificationType } from '../../common/enums';
import { ErrorCodes } from '../../common/errors/error-codes';
import { AccessTokenPayload, AuthenticatedUser, RefreshTokenPayload } from '../../common/interfaces/authenticated-user.interface';
import { formatTimestamp } from '../../common/utils/date.util';
import { hashPassword, verifyPassword } from '../../common/utils/password.util';
import { randomToken } from '../../common/utils/token.util';
import { RequestMeta } from '../../common/utils/request-meta.util';
import { NotificationsService } from '../notifications/notifications.service';
import { SessionsService } from '../sessions/sessions.service';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto, MobileLoginDto } from './dto/login.dto';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessExpiresIn: number;
  refreshExpiresIn: number;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly sessionsService: SessionsService,
    private readonly notificationsService: NotificationsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto | MobileLoginDto, client: ClientType, meta: RequestMeta) {
    const user = await this.usersService.findByLoginWithPassword(dto.login);
    if (!user || !(await verifyPassword(user.passwordHash, dto.password))) {
      await this.sessionsService.recordLoginAttempt({
        userId: user?.id ?? null,
        login: dto.login,
        success: false,
        failureReason: ErrorCodes.INVALID_CREDENTIALS,
        client,
        meta,
      });
      throw new UnauthorizedException(ErrorCodes.INVALID_CREDENTIALS);
    }
    if (LOGIN_FORBIDDEN_STATUSES.includes(user.status)) {
      await this.sessionsService.recordLoginAttempt({
        userId: user.id,
        login: dto.login,
        success: false,
        failureReason: ErrorCodes.ACCOUNT_INACTIVE,
        client,
        meta,
      });
      throw new UnauthorizedException(ErrorCodes.ACCOUNT_INACTIVE);
    }

    const refreshTtl = this.configService.getOrThrow<number>('jwt.refreshTtl');
    const expiresAt = new Date(Date.now() + refreshTtl * 1000);
    const provisionalRefresh = await this.signRefresh(user.id, 'pending');
    const mobile = dto as MobileLoginDto;
    const session = await this.sessionsService.create({
      userId: user.id,
      client,
      meta,
      refreshToken: provisionalRefresh,
      expiresAt,
      deviceName: mobile.deviceName,
      platform: mobile.platform,
      pushToken: mobile.pushToken,
    });
    const tokens = await this.issueTokens(user, session.sessionId);
    await this.sessionsService.rotateRefreshToken(session.sessionId, tokens.refreshToken, expiresAt);
    await this.sessionsService.recordLoginAttempt({
      userId: user.id,
      login: dto.login,
      success: true,
      client,
      meta,
      sessionId: session.sessionId,
    });
    await this.usersService.markLogin(user.id);
    await this.dispatchNewLoginAlert(user, meta, client, session.sessionId);

    return {
      ...tokens,
      sessionId: session.sessionId,
      user: this.usersService.toPublic(user),
    };
  }

  async refresh(refreshToken: string) {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException(ErrorCodes.REFRESH_INVALID);
    }
    if (payload.type !== 'refresh') throw new UnauthorizedException(ErrorCodes.REFRESH_INVALID);
    const session = await this.sessionsService.findActive(payload.sid);
    if (!session || !this.sessionsService.matchesRefreshToken(session, refreshToken)) {
      if (session) await this.sessionsService.revoke(session.sessionId, 'REFRESH_TOKEN_REUSE');
      throw new UnauthorizedException(ErrorCodes.REFRESH_INVALID);
    }
    const user = await this.usersService.findByIdOrNull(payload.sub);
    if (!user || LOGIN_FORBIDDEN_STATUSES.includes(user.status)) {
      throw new UnauthorizedException(ErrorCodes.ACCOUNT_INACTIVE);
    }
    const refreshTtl = this.configService.getOrThrow<number>('jwt.refreshTtl');
    const tokens = await this.issueTokens(user, session.sessionId);
    await this.sessionsService.rotateRefreshToken(session.sessionId, tokens.refreshToken, new Date(Date.now() + refreshTtl * 1000));
    return { ...tokens, sessionId: session.sessionId, user: this.usersService.toPublic(user) };
  }

  async logout(current: AuthenticatedUser) {
    await this.sessionsService.revoke(current.sessionId, 'LOGOUT');
    return { success: true };
  }

  async me(current: AuthenticatedUser) {
    const user = await this.usersService.findByIdOrFail(current.id);
    const assignments = await this.usersService.activeAssignments(user.id);
    return { ...this.usersService.toPublic(user), assignments, sessionId: current.sessionId };
  }

  async changePassword(current: AuthenticatedUser, dto: ChangePasswordDto) {
    const user = await this.usersService.findByLoginWithPassword(current.login);
    if (!user || !(await verifyPassword(user.passwordHash, dto.currentPassword))) {
      throw new BadRequestException(ErrorCodes.PASSWORD_MISMATCH);
    }
    await this.usersService.setPasswordHash(user.id, await hashPassword(dto.newPassword), false);
    const revoked = await this.sessionsService.revokeAllForUser(user.id, 'PASSWORD_CHANGED', current.sessionId);
    revoked.forEach((sessionId) => this.notificationsService.emitSessionTerminated(sessionId, 'PASSWORD_CHANGED'));
    await this.notificationsService.notify({
      userId: user.id,
      type: NotificationType.SECURITY_PASSWORD_CHANGED,
      title: 'Parol o\'zgartirildi',
      body: `Parolingiz ${formatTimestamp()} da o'zgartirildi. Boshqa barcha sessiyalar yakunlandi.`,
      data: { terminatedSessions: revoked.length },
    });
    return { success: true, terminatedSessions: revoked.length };
  }

  async listMySessions(current: AuthenticatedUser) {
    const sessions = await this.sessionsService.listActiveForUser(current.id);
    return sessions.map((session) => this.sessionsService.serializeSession(session, current.sessionId));
  }

  async terminateMySession(current: AuthenticatedUser, sessionId: string) {
    const session = await this.sessionsService.revokeOwned(current.id, sessionId, 'TERMINATED_BY_USER');
    this.notificationsService.emitSessionTerminated(sessionId, 'TERMINATED_BY_USER');
    await this.notificationsService.notify({
      userId: current.id,
      type: NotificationType.SECURITY_SESSION_TERMINATED,
      title: 'Sessiya yakunlandi',
      body: `${session.device} (${session.os}) qurilmasidagi sessiya yakunlandi.`,
      data: { sessionId },
    });
    return { success: true, sessionId };
  }

  async terminateOtherSessions(current: AuthenticatedUser) {
    const revoked = await this.sessionsService.revokeAllForUser(current.id, 'TERMINATED_BY_USER', current.sessionId);
    revoked.forEach((sessionId) => this.notificationsService.emitSessionTerminated(sessionId, 'TERMINATED_BY_USER'));
    return { success: true, terminatedSessions: revoked.length };
  }

  myLoginHistory(current: AuthenticatedUser, page: number, limit: number) {
    return this.sessionsService.loginHistory({ userId: current.id }, page, limit);
  }

  private async issueTokens(user: User, sessionId: string): Promise<TokenPair> {
    const accessTtl = this.configService.getOrThrow<number>('jwt.accessTtl');
    const refreshTtl = this.configService.getOrThrow<number>('jwt.refreshTtl');
    const accessPayload: AccessTokenPayload = { sub: user.id, role: user.role, sid: sessionId, type: 'access' };
    const accessToken = await this.jwtService.signAsync({ ...accessPayload, jti: randomToken(8) }, {
      secret: this.configService.getOrThrow<string>('jwt.accessSecret'),
      expiresIn: accessTtl,
    });
    const refreshToken = await this.signRefresh(user.id, sessionId);
    return { accessToken, refreshToken, accessExpiresIn: accessTtl, refreshExpiresIn: refreshTtl };
  }

  private signRefresh(userId: string, sessionId: string): Promise<string> {
    const payload: RefreshTokenPayload = { sub: userId, sid: sessionId, type: 'refresh' };
    return this.jwtService.signAsync({ ...payload, jti: randomToken(8) }, {
      secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
      expiresIn: this.configService.getOrThrow<number>('jwt.refreshTtl'),
    });
  }

  private async dispatchNewLoginAlert(user: User, meta: RequestMeta, client: ClientType, sessionId: string) {
    const payload = {
      sessionId,
      client,
      ip: meta.ip,
      device: meta.device,
      browser: meta.browser,
      os: meta.os,
      at: new Date().toISOString(),
    };
    this.notificationsService.emitSecurityAlert(user.id, { kind: 'NEW_LOGIN', ...payload });
    await this.notificationsService.notify({
      userId: user.id,
      type: NotificationType.SECURITY_NEW_LOGIN,
      title: 'Yangi kirish aniqlandi',
      body: `${meta.device} · ${meta.os} · ${meta.browser} · IP ${meta.ip} orqali ${formatTimestamp()} da hisobingizga kirildi.`,
      data: payload,
    });
  }
}
