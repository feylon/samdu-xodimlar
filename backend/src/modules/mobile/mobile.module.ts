import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { MobileController } from './mobile.controller';

@Module({
  imports: [AuthModule, DashboardModule],
  controllers: [MobileController],
})
export class MobileModule {}
