import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { extractRequestMeta, RequestMeta } from '../utils/request-meta.util';

export const RequestMetadata = createParamDecorator(
  (_: unknown, context: ExecutionContext): RequestMeta => {
    const request = context.switchToHttp().getRequest<Request>();
    return extractRequestMeta(request);
  },
);
