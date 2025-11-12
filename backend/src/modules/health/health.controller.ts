import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { Connection } from 'mongoose';
import { DataSource } from 'typeorm';
import { Public } from '../../common/decorators';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectConnection() private readonly mongoConnection: Connection,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Liveness and dependency status' })
  async check() {
    let postgres = 'down';
    try {
      await this.dataSource.query('SELECT 1');
      postgres = 'up';
    } catch {
      postgres = 'down';
    }
    const mongo = this.mongoConnection.readyState === 1 ? 'up' : 'down';
    return {
      status: postgres === 'up' && mongo === 'up' ? 'ok' : 'degraded',
      service: 'backend',
      postgres,
      mongo,
      timestamp: new Date().toISOString(),
    };
  }
}
