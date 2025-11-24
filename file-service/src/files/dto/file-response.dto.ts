import { ApiProperty } from '@nestjs/swagger';
import { FileCategory } from '../file-category';

export class FileResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  originalName: string;

  @ApiProperty()
  mimeType: string;

  @ApiProperty()
  size: number;

  @ApiProperty({ enum: FileCategory, enumName: 'FileCategory' })
  category: FileCategory;

  @ApiProperty({ type: String, nullable: true })
  ownerUserId: string | null;

  @ApiProperty()
  url: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;
}

export class PaginatedFilesResponseDto {
  @ApiProperty({ type: [FileResponseDto] })
  items: FileResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;
}

export class DeleteFileResponseDto {
  @ApiProperty({ example: true })
  success: boolean;
}
