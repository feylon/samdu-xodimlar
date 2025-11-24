import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { FileCategory } from '../file-category';

export class UploadFileDto {
  @ApiProperty({ enum: FileCategory, enumName: 'FileCategory' })
  @IsEnum(FileCategory)
  category: FileCategory;

  @ApiPropertyOptional({ description: 'User the file belongs to' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  ownerUserId?: string;
}
