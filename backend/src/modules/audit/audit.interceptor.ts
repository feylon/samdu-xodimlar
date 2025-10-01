import { CallHandler, ExecutionContext, HttpException, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { SKIP_AUDIT_KEY } from '../../common/decorators/skip-audit.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { extractRequestMeta } from '../../common/utils/request-meta.util';
import { sanitizePayload } from '../../common/utils/sanitize.util';
import { AuditService } from './audit.service';

const AUDITED_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly auditService: AuditService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_AUDIT_KEY, [context.getHandler(), context.getClass()]);
    if (skip || !AUDITED_METHODS.has(request.method)) return next.handle();
    const startedAt = Date.now();
    const controller = context.getClass().name.replace(/Controller$/, '');
    const action = `${controller}.${context.getHandler().name}`;
    const params = request.params as Record<string, string>;
    const entityId = params?.id ?? params?.userId ?? params?.departmentId ?? params?.sessionId ?? null;
    const meta = extractRequestMeta(request);

    const write = (statusCode: number, errorMessage: string | null) => {
      const user = request.user;
      void this.auditService
        .record({
          actorId: user?.id ?? null,
          actorLogin: user?.login ?? (request.body?.login ? String(request.body.login) : null),
          actorRole: user?.role ?? null,
          action,
          method: request.method,
          path: request.originalUrl ?? request.url,
          entity: controller,
          entityId,
          statusCode,
          durationMs: Date.now() - startedAt,
          ip: meta.ip,
          userAgent: meta.userAgent,
          payload: (sanitizePayload(request.body) as Record<string, unknown>) ?? null,
          query: Object.keys(request.query ?? {}).length ? (sanitizePayload(request.query) as Record<string, unknown>) : null,
          errorMessage,
        })
        .catch(() => undefined);
    };

    return next.handle().pipe(
      tap({
        next: () => write(context.switchToHttp().getResponse<Response>().statusCode, null),
        error: (error: unknown) => {
          const status = error instanceof HttpException ? error.getStatus() : 500;
          write(status, error instanceof Error ? error.message : String(error));
        },
      }),
    );
  }
}
