import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { UserRole } from '../../auth/auth.types';
import { StorageDriverName } from '../../config/configuration';
import { FileCategory } from '../file-category';

@Schema({ collection: 'files', timestamps: true })
export class StoredFile {
  @Prop({ type: String, required: true, unique: true })
  fileId: string;

  @Prop({ type: String, required: true })
  originalName: string;

  @Prop({ type: String, required: true })
  mimeType: string;

  @Prop({ type: Number, required: true, min: 0 })
  size: number;

  @Prop({ type: String, required: true, enum: Object.values(FileCategory) })
  category: FileCategory;

  @Prop({ type: String, required: true, enum: ['local', 's3'] })
  storageDriver: StorageDriverName;

  @Prop({ type: String, required: true })
  storageKey: string;

  @Prop({ type: String, required: true })
  uploadedBy: string;

  @Prop({ type: String, required: true, enum: Object.values(UserRole) })
  uploadedByRole: UserRole;

  @Prop({ type: String, default: null })
  ownerUserId: string | null;

  @Prop({ type: String, required: true })
  checksum: string;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;

  createdAt: Date;

  updatedAt: Date;
}

export type StoredFileDocument = HydratedDocument<StoredFile>;

export const StoredFileSchema = SchemaFactory.createForClass(StoredFile);

StoredFileSchema.index({ category: 1, ownerUserId: 1, isDeleted: 1, createdAt: -1 });
StoredFileSchema.index({ uploadedBy: 1, isDeleted: 1 });
