import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuthenticatedRequest } from './auth.types';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';
import { TokenService } from './token.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenService: TokenService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & AuthenticatedRequest>();
    const token = this.tokenService.extractFromAuthorizationHeader(request);
    if (token === undefined) {
      throw new UnauthorizedException('MISSING_TOKEN');
    }

    request.user = this.tokenService.verifyAccessToken(token);
    return true;
  }
}
