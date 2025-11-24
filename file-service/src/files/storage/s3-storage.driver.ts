import {
  DeleteObjectCommand,
  GetObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Readable } from 'stream';
import { S3Config } from '../../config/configuration';
import { StorageDriver } from './storage-driver.interface';

export class S3StorageDriver implements StorageDriver {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: S3Config) {
    this.bucket = config.bucket;
    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle,
      credentials: {
        accessKeyId: config.accessKey,
        secretAccessKey: config.secretKey,
      },
    });
  }

  async save(key: string, buffer: Buffer, mimeType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        ContentLength: buffer.length,
      }),
    );
  }

  async createReadStream(key: string): Promise<NodeJS.ReadableStream> {
    let body: unknown;
    try {
      const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      body = result.Body;
    } catch (error) {
      if (error instanceof NoSuchKey) {
        throw new NotFoundException('FILE_CONTENT_NOT_FOUND');
      }
      throw error;
    }

    if (body instanceof Readable) {
      return body;
    }
    throw new InternalServerErrorException('UNSUPPORTED_S3_BODY_STREAM');
  }

  async remove(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
