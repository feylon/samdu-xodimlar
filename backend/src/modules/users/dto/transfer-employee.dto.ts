import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ALLOWED_RATES } from './create-employee.dto';

export class TransferEmployeeDto {
  @ApiProperty()
  @IsUUID()
  fromDepartmentId: string;

  @ApiProperty()
  @IsUUID()
  toDepartmentId: string;

  @ApiPropertyOptional({ enum: ALLOWED_RATES, description: 'Defaults to the rate of the source assignment' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn(ALLOWED_RATES)
  rate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
