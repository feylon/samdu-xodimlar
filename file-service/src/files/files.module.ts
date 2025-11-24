import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { StoredFile, StoredFileSchema } from './schemas/stored-file.schema';
import { StorageModule } from './storage/storage.module';
import { UploadFileInterceptor } from './upload-file.interceptor';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: StoredFile.name, schema: StoredFileSchema }]),
    StorageModule,
  ],
  controllers: [FilesController],
  providers: [FilesService, UploadFileInterceptor],
})
export class FilesModule {}
