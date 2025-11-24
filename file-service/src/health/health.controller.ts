import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { AppConfig, StorageDriverName } from '../config/configuration';

export interface HealthResponse {
  status: 'ok';
  service: 'file-service';
  storage: StorageDriverName;
  timestamp: string;
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly storageDriverName: StorageDriverName;

  constructor(configService: ConfigService<AppConfig, true>) {
    this.storageDriverName = configService.get('storageDriver', { infer: true });
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Service health check' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        service: { type: 'string', example: 'file-service' },
        storage: { type: 'string', enum: ['local', 's3'] },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  check(): HealthResponse {
    return {
      status: 'ok',
      service: 'file-service',
      storage: this.storageDriverName,
      timestamp: new Date().toISOString(),
    };
  }
}
