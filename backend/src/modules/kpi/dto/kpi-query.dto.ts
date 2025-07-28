import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { YearMonthDto } from '../../../common/dto/year-month.dto';

export class KpiQueryDto extends YearMonthDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  departmentId?: string;
}
