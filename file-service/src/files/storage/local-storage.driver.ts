import { BadRequestException, NotFoundException } from '@nestjs/common';
import { createReadStream } from 'fs';
import { access, mkdir, unlink, writeFile } from 'fs/promises';
import { dirname, isAbsolute, normalize, resolve, sep } from 'path';
import { StorageDriver } from './storage-driver.interface';

const isMissingFileError = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && (error as { code?: string }).code === 'ENOENT';

export class LocalStorageDriver implements StorageDriver {
  private readonly basePath: string;

  constructor(basePath: string) {
    this.basePath = resolve(basePath);
  }

  async save(key: string, buffer: Buffer): Promise<void> {
    const absolutePath = this.resolveSafePath(key);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, buffer, { flag: 'w' });
  }

  async createReadStream(key: string): Promise<NodeJS.ReadableStream> {
    const absolutePath = this.resolveSafePath(key);
    try {
      await access(absolutePath);
    } catch (error) {
      if (isMissingFileError(error)) {
        throw new NotFoundException('FILE_CONTENT_NOT_FOUND');
      }
      throw error;
    }
    return createReadStream(absolutePath);
  }

  async remove(key: string): Promise<void> {
    const absolutePath = this.resolveSafePath(key);
    try {
      await unlink(absolutePath);
    } catch (error) {
      if (!isMissingFileError(error)) {
        throw error;
      }
    }
  }

  private resolveSafePath(key: string): string {
    if (key.length === 0 || isAbsolute(key) || key.includes('\0')) {
      throw new BadRequestException('INVALID_STORAGE_KEY');
    }
    const normalizedKey = normalize(key);
    if (normalizedKey.split(/[\\/]/).some((segment) => segment === '..')) {
      throw new BadRequestException('INVALID_STORAGE_KEY');
    }
    const absolutePath = resolve(this.basePath, normalizedKey);
    if (!absolutePath.startsWith(this.basePath + sep)) {
      throw new BadRequestException('INVALID_STORAGE_KEY');
    }
    return absolutePath;
  }
}
