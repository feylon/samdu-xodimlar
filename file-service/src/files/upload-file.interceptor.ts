import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  PayloadTooLargeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Observable } from 'rxjs';
import { AppConfig } from '../config/configuration';

export const UPLOAD_FIELD_NAME = 'file';

@Injectable()
export class UploadFileInterceptor implements NestInterceptor {
  private readonly delegate: NestInterceptor;

  constructor(configService: ConfigService<AppConfig, true>) {
    const maxFileSizeBytes = configService.get('maxFileSizeBytes', { infer: true });
    const DelegateInterceptor = FileInterceptor(UPLOAD_FIELD_NAME, {
      storage: memoryStorage(),
      limits: { fileSize: maxFileSizeBytes, files: 1 },
    });
    this.delegate = new DelegateInterceptor();
  }

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    try {
      return await this.delegate.intercept(context, next);
    } catch (error) {
      if (error instanceof PayloadTooLargeException) {
        throw new BadRequestException('FILE_TOO_LARGE');
      }
      throw error;
    }
  }
}
