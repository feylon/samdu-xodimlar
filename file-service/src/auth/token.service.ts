import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { AccessTokenPayload, AuthenticatedUser, UserRole } from './auth.types';

const BEARER_PREFIX = 'bearer ';

@Injectable()
export class TokenService {
  constructor(private readonly jwtService: JwtService) {}

  extractFromAuthorizationHeader(request: Request): string | undefined {
    const header = request.headers.authorization;
    if (typeof header !== 'string') {
      return undefined;
    }
    if (!header.toLowerCase().startsWith(BEARER_PREFIX)) {
      return undefined;
    }
    const token = header.slice(BEARER_PREFIX.length).trim();
    return token.length > 0 ? token : undefined;
  }

  extractFromQuery(request: Request): string | undefined {
    const raw = request.query?.token;
    if (typeof raw !== 'string') {
      return undefined;
    }
    const token = raw.trim();
    return token.length > 0 ? token : undefined;
  }

  extractOptionalToken(request: Request): string | undefined {
    return this.extractFromAuthorizationHeader(request) ?? this.extractFromQuery(request);
  }

  verifyAccessToken(token: string): AuthenticatedUser {
    let payload: AccessTokenPayload;
    try {
      payload = this.jwtService.verify<AccessTokenPayload>(token);
    } catch {
      throw new UnauthorizedException('INVALID_TOKEN');
    }

    if (!this.isValidPayload(payload)) {
      throw new UnauthorizedException('INVALID_TOKEN');
    }

    return { id: payload.sub, role: payload.role };
  }

  tryVerifyAccessToken(token: string | undefined): AuthenticatedUser | null {
    if (token === undefined) {
      return null;
    }
    try {
      return this.verifyAccessToken(token);
    } catch {
      return null;
    }
  }

  private isValidPayload(payload: unknown): payload is AccessTokenPayload {
    if (typeof payload !== 'object' || payload === null) {
      return false;
    }
    const candidate = payload as Partial<AccessTokenPayload>;
    return (
      typeof candidate.sub === 'string' &&
      candidate.sub.length > 0 &&
      candidate.type === 'access' &&
      typeof candidate.role === 'string' &&
      Object.values(UserRole).includes(candidate.role)
    );
  }
}
