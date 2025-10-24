import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsObject, IsOptional, IsString, Length, MaxLength, ValidateNested } from 'class-validator';

export class ExportColumnDto {
  @ApiProperty({ example: 'fullName' })
  @IsString()
  @MaxLength(100)
  key: string;

  @ApiProperty({ example: 'F.I.Sh.' })
  @IsString()
  @MaxLength(200)
  label: string;

  @ApiPropertyOptional({ enum: ['string', 'number', 'date', 'datetime', 'boolean'] })
  @IsOptional()
  @IsIn(['string', 'number', 'date', 'datetime', 'boolean'])
  type?: 'string' | 'number' | 'date' | 'datetime' | 'boolean';
}

export class ExportTableDto {
  @ApiProperty({ example: 'Xodimlar ro\'yxati' })
  @IsString()
  @Length(1, 200)
  title: string;

  @ApiPropertyOptional({ example: 'Filtr: faol xodimlar' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  subtitle?: string;

  @ApiProperty({ type: [ExportColumnDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => ExportColumnDto)
  columns: ExportColumnDto[];

  @ApiProperty({ type: 'array', items: { type: 'object', additionalProperties: true } })
  @IsArray()
  @ArrayMaxSize(10000)
  @IsObject({ each: true })
  rows: Record<string, unknown>[];

  @ApiPropertyOptional({ enum: ['uz', 'ru'], default: 'uz' })
  @IsOptional()
  @IsIn(['uz', 'ru'])
  locale?: 'uz' | 'ru';

  @ApiPropertyOptional({ enum: ['portrait', 'landscape'], default: 'landscape' })
  @IsOptional()
  @IsIn(['portrait', 'landscape'])
  orientation?: 'portrait' | 'landscape';
}
