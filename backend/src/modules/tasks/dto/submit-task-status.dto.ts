import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { TaskStatus } from '../../../common/enums';

export const EMPLOYEE_ALLOWED_STATUSES = [TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED, TaskStatus.PARTIALLY_COMPLETED];

export class SubmitTaskStatusDto {
  @ApiProperty({ enum: EMPLOYEE_ALLOWED_STATUSES })
  @IsEnum(TaskStatus)
  @IsIn(EMPLOYEE_ALLOWED_STATUSES)
  status: TaskStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}
