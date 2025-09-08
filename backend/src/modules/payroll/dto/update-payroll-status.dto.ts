import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PayrollStatus } from '../../../common/enums';

export class UpdatePayrollStatusDto {
  @ApiProperty({ enum: PayrollStatus })
  @IsEnum(PayrollStatus)
  status: PayrollStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
