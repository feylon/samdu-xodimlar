import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, Length, Matches, Max, MaxLength, Min } from 'class-validator';

export class UpdateOrganizationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 200)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ description: 'File id of the logo uploaded to file-service, empty string clears it' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  logoFileId?: string;

  @ApiPropertyOptional({ example: '#1d4ed8' })
  @IsOptional()
  @Matches(/^#[0-9a-fA-F]{6}$/)
  primaryColor?: string;

  @ApiPropertyOptional({ example: 'UZS' })
  @IsOptional()
  @IsString()
  @Length(3, 8)
  currency?: string;

  @ApiPropertyOptional({ description: 'Monetary value of one KPI point' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  pointValue?: number;

  @ApiPropertyOptional({ description: 'Percent of base salary a department head earns as team performance bonus at 100% team performance' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  headTeamBonusRate?: number;

  @ApiPropertyOptional({ description: 'Percent of team point value credited to department head' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  headPointShareRate?: number;

  @ApiPropertyOptional({ description: 'Hour of day (0-23) after which missing daily reports trigger reminders' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(23)
  reportDeadlineHour?: number;

  @ApiPropertyOptional({ description: 'Points granted for a report rated 5/5' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  reportMaxPoints?: number;
}
