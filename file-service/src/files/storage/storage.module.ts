import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../config/configuration';
import { LocalStorageDriver } from './local-storage.driver';
import { S3StorageDriver } from './s3-storage.driver';
import { STORAGE_DRIVER, StorageDriver } from './storage-driver.interface';

@Module({
  providers: [
    {
      provide: STORAGE_DRIVER,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig, true>): StorageDriver => {
        const driverName = configService.get('storageDriver', { infer: true });
        if (driverName === 's3') {
          return new S3StorageDriver(configService.get('s3', { infer: true }));
        }
        return new LocalStorageDriver(configService.get('localStoragePath', { infer: true }));
      },
    },
  ],
  exports: [STORAGE_DRIVER],
})
export class StorageModule {}
