import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { ErrorCodes } from '../errors/error-codes';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'INTERNAL_SERVER_ERROR';
    let details: unknown = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (body && typeof body === 'object') {
        const typed = body as { message?: string | string[]; error?: string };
        if (Array.isArray(typed.message)) {
          message = ErrorCodes.VALIDATION_FAILED;
          details = typed.message;
        } else {
          message = typed.message ?? typed.error ?? 'ERROR';
        }
      }
    } else if (exception instanceof QueryFailedError) {
      status = HttpStatus.CONFLICT;
      message = 'DATABASE_CONSTRAINT_VIOLATION';
      details = (exception as QueryFailedError & { detail?: string }).detail;
      this.logger.warn(`${request.method} ${request.url} -> ${exception.message}`);
    } else {
      this.logger.error(`${request.method} ${request.url}`, exception instanceof Error ? exception.stack : String(exception));
    }

    response.status(status).json({
      statusCode: status,
      message,
      details,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
