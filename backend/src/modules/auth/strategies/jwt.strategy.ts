import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { LOGIN_FORBIDDEN_STATUSES } from '../../../common/enums';
import { ErrorCodes } from '../../../common/errors/error-codes';
import { AccessTokenPayload, AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { SessionsService } from '../../sessions/sessions.service';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly sessionsService: SessionsService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('jwt.accessSecret'),
    });
  }

  async validate(payload: AccessTokenPayload): Promise<AuthenticatedUser> {
    if (payload.type !== 'access') throw new UnauthorizedException(ErrorCodes.SESSION_REVOKED);
    const session = await this.sessionsService.findActive(payload.sid);
    if (!session) throw new UnauthorizedException(ErrorCodes.SESSION_REVOKED);
    const user = await this.usersService.findByIdOrNull(payload.sub);
    if (!user || LOGIN_FORBIDDEN_STATUSES.includes(user.status)) {
      throw new UnauthorizedException(ErrorCodes.ACCOUNT_INACTIVE);
    }
    void this.sessionsService.touch(payload.sid);
    return { id: user.id, login: user.login, role: user.role, sessionId: payload.sid, fullName: user.fullName };
  }
}
