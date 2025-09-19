import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsOptional, IsString, IsUUID, Length, MaxLength } from 'class-validator';

export class CreateAnnouncementDto {
  @ApiProperty()
  @IsString()
  @Length(3, 255)
  title: string;

  @ApiProperty()
  @IsString()
  @Length(3, 20000)
  body: string;

  @ApiPropertyOptional({ description: 'Null makes the announcement organization-wide (HR only)' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  @MaxLength(40)
  expiresAt?: string;
}
