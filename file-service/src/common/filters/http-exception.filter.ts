import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponseBody {
  statusCode: number;
  message: string | string[];
  path: string;
  timestamp: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const httpContext = host.switchToHttp();
    const response = httpContext.getResponse<Response>();
    const request = httpContext.getRequest<Request>();

    const statusCode = this.resolveStatusCode(exception);
    const message = this.resolveMessage(exception, statusCode);

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} failed`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ErrorResponseBody = {
      statusCode,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    if (response.headersSent) {
      response.end();
      return;
    }

    response.status(statusCode).json(body);
  }

  private resolveStatusCode(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private resolveMessage(exception: unknown, statusCode: number): string | string[] {
    if (exception instanceof HttpException) {
      const payload = exception.getResponse();
      if (typeof payload === 'string') {
        return payload;
      }
      if (typeof payload === 'object' && payload !== null && 'message' in payload) {
        const nested = (payload as { message: unknown }).message;
        if (typeof nested === 'string' || Array.isArray(nested)) {
          return nested;
        }
      }
      return exception.message;
    }
    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      return 'INTERNAL_SERVER_ERROR';
    }
    return exception instanceof Error ? exception.message : 'UNKNOWN_ERROR';
  }
}
