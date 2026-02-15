import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsEnum, IsOptional, IsString, Matches, MaxLength, ValidateNested } from 'class-validator';
import { CalendarDayType } from '../../../common/enums';

export class UpsertCalendarDayDto {
  @ApiProperty({ example: '2025-03-08' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date: string;

  @ApiProperty({ enum: CalendarDayType })
  @IsEnum(CalendarDayType)
  type: CalendarDayType;

  @ApiPropertyOptional({ example: 'Xotin-qizlar kuni' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;
}

export class BulkUpsertCalendarDto {
  @ApiProperty({ type: [UpsertCalendarDayDto] })
  @IsArray()
  @ArrayMaxSize(366)
  @ValidateNested({ each: true })
  @Type(() => UpsertCalendarDayDto)
  days: UpsertCalendarDayDto[];
}
