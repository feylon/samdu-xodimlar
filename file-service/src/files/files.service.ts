import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { createHash } from 'crypto';
import { FilterQuery, Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { AuthenticatedUser, isPrivilegedRole } from '../auth/auth.types';
import { AppConfig } from '../config/configuration';
import { FileResponseDto, PaginatedFilesResponseDto } from './dto/file-response.dto';
import { ListFilesQueryDto } from './dto/list-files-query.dto';
import { UploadFileDto } from './dto/upload-file.dto';
import {
  buildStorageKey,
  canRoleUploadCategory,
  extensionForMime,
  isMimeAllowedForCategory,
  isPublicCategory,
} from './file-category';
import { StoredFile, StoredFileDocument } from './schemas/stored-file.schema';
import { STORAGE_DRIVER, StorageDriver } from './storage/storage-driver.interface';

export interface FileContent {
  file: StoredFileDocument;
  stream: NodeJS.ReadableStream;
}

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly publicBaseUrl: string;
  private readonly maxFileSizeBytes: number;
  private readonly storageDriverName: AppConfig['storageDriver'];

  constructor(
    @InjectModel(StoredFile.name) private readonly storedFileModel: Model<StoredFile>,
    @Inject(STORAGE_DRIVER) private readonly storage: StorageDriver,
    configService: ConfigService<AppConfig, true>,
  ) {
    this.publicBaseUrl = configService.get('publicBaseUrl', { infer: true });
    this.maxFileSizeBytes = configService.get('maxFileSizeBytes', { infer: true });
    this.storageDriverName = configService.get('storageDriver', { infer: true });
  }

  async upload(
    uploadedFile: Express.Multer.File | undefined,
    dto: UploadFileDto,
    user: AuthenticatedUser,
  ): Promise<FileResponseDto> {
    if (uploadedFile === undefined || uploadedFile.buffer === undefined) {
      throw new BadRequestException('FILE_REQUIRED');
    }
    if (!canRoleUploadCategory(user.role, dto.category)) {
      throw new ForbiddenException('CATEGORY_NOT_ALLOWED_FOR_ROLE');
    }
    if (uploadedFile.size > this.maxFileSizeBytes || uploadedFile.buffer.length > this.maxFileSizeBytes) {
      throw new BadRequestException('FILE_TOO_LARGE');
    }
    if (uploadedFile.buffer.length === 0) {
      throw new BadRequestException('FILE_EMPTY');
    }

    const mimeType = uploadedFile.mimetype.toLowerCase();
    const extension = extensionForMime(mimeType);
    if (!isMimeAllowedForCategory(dto.category, mimeType) || extension === undefined) {
      throw new BadRequestException('FILE_TYPE_NOT_ALLOWED');
    }

    const fileId = uuidv4();
    const storageKey = buildStorageKey(dto.category, fileId, extension);
    const checksum = createHash('sha256').update(uploadedFile.buffer).digest('hex');

    await this.storage.save(storageKey, uploadedFile.buffer, mimeType);

    let created: StoredFileDocument;
    try {
      created = await this.storedFileModel.create({
        fileId,
        originalName: this.sanitizeOriginalName(uploadedFile.originalname),
        mimeType,
        size: uploadedFile.buffer.length,
        category: dto.category,
        storageDriver: this.storageDriverName,
        storageKey,
        uploadedBy: user.id,
        uploadedByRole: user.role,
        ownerUserId: dto.ownerUserId?.trim() || null,
        checksum,
        isDeleted: false,
        deletedAt: null,
      });
    } catch (error) {
      await this.removeFromStorageQuietly(storageKey);
      throw error;
    }

    return this.toResponse(created);
  }

  async getMetadata(fileId: string, user: AuthenticatedUser | null): Promise<FileResponseDto> {
    const file = await this.findActiveOrThrow(fileId);
    this.assertCanRead(file, user);
    return this.toResponse(file);
  }

  async getContent(fileId: string, user: AuthenticatedUser | null): Promise<FileContent> {
    const file = await this.findActiveOrThrow(fileId);
    this.assertCanRead(file, user);
    const stream = await this.storage.createReadStream(file.storageKey);
    return { file, stream };
  }

  async softDelete(fileId: string): Promise<void> {
    const file = await this.findActiveOrThrow(fileId);
    file.isDeleted = true;
    file.deletedAt = new Date();
    await file.save();
    await this.removeFromStorageQuietly(file.storageKey);
  }

  async list(query: ListFilesQueryDto): Promise<PaginatedFilesResponseDto> {
    const filter: FilterQuery<StoredFile> = { isDeleted: false };
    if (query.category !== undefined) {
      filter.category = query.category;
    }
    if (query.ownerUserId !== undefined && query.ownerUserId.trim() !== '') {
      filter.ownerUserId = query.ownerUserId.trim();
    }

    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      this.storedFileModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit).exec(),
      this.storedFileModel.countDocuments(filter).exec(),
    ]);

    return {
      items: items.map((item) => this.toResponse(item)),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  toResponse(file: StoredFile): FileResponseDto {
    return {
      id: file.fileId,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      category: file.category,
      ownerUserId: file.ownerUserId ?? null,
      url: `${this.publicBaseUrl}/files/${file.fileId}/content`,
      createdAt: file.createdAt,
    };
  }

  private async findActiveOrThrow(fileId: string): Promise<StoredFileDocument> {
    const file = await this.storedFileModel.findOne({ fileId, isDeleted: false }).exec();
    if (file === null) {
      throw new NotFoundException('FILE_NOT_FOUND');
    }
    return file;
  }

  private assertCanRead(file: StoredFile, user: AuthenticatedUser | null): void {
    if (isPublicCategory(file.category)) {
      return;
    }
    if (user === null) {
      throw new UnauthorizedException('MISSING_TOKEN');
    }
    if (isPrivilegedRole(user.role)) {
      return;
    }
    if (file.ownerUserId === user.id || file.uploadedBy === user.id) {
      return;
    }
    throw new ForbiddenException('FILE_ACCESS_DENIED');
  }

  private sanitizeOriginalName(name: string): string {
    const trimmed = name.replace(/[\r\n\0]/g, '').trim();
    const baseName = trimmed.split(/[\\/]/).pop() ?? '';
    return baseName.length > 0 ? baseName.slice(0, 255) : 'file';
  }

  private async removeFromStorageQuietly(storageKey: string): Promise<void> {
    try {
      await this.storage.remove(storageKey);
    } catch (error) {
      this.logger.warn(
        `Failed to remove ${storageKey} from storage: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
