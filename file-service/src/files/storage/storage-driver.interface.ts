export interface StorageDriver {
  save(key: string, buffer: Buffer, mimeType: string): Promise<void>;
  createReadStream(key: string): Promise<NodeJS.ReadableStream>;
  remove(key: string): Promise<void>;
}

export const STORAGE_DRIVER = 'STORAGE_DRIVER';
