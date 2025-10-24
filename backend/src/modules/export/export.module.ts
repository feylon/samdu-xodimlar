import { Module } from '@nestjs/common';
import { OrganizationModule } from '../organization/organization.module';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';

@Module({
  imports: [OrganizationModule],
  controllers: [ExportController],
  providers: [ExportService],
})
export class ExportModule {}
