import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export const ALLOWED_RATES = [25, 50, 75, 100];

export class AssignmentInputDto {
  @ApiProperty()
  @IsUUID()
  departmentId: string;

  @ApiProperty({ enum: ALLOWED_RATES })
  @Type(() => Number)
  @IsInt()
  @IsIn(ALLOWED_RATES)
  rate: number;
}

export class CreateEmployeeDto {
  @ApiProperty({ example: 'j.ergashev' })
  @IsString()
  @Length(3, 64)
  @Matches(/^[a-zA-Z0-9._-]+$/)
  login: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @Length(8, 128)
  password: string;

  @ApiProperty({ example: 'Ergashev Jamshid' })
  @IsString()
  @Length(3, 200)
  fullName: string;

  @ApiPropertyOptional({ example: '31234567890123', description: 'JSHSHIR / PINFL, 14 digits' })
  @IsOptional()
  @Matches(/^\d{14}$/)
  pinfl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  position?: string;

  @ApiPropertyOptional({ example: 5000000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  baseSalary?: number;

  @ApiPropertyOptional({ description: 'File id returned by file-service' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  photoFileId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  passportFileIds?: string[];

  @ApiPropertyOptional({ example: '2025-03-01' })
  @IsOptional()
  @IsDateString()
  hireDate?: string;

  @ApiPropertyOptional({ example: '1995-05-20' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ type: [AssignmentInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssignmentInputDto)
  assignments?: AssignmentInputDto[];
}
