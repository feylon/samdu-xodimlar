import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { TaskStatus } from '../../../common/enums';

export class VerifyTaskDto {
  @ApiProperty({ enum: [TaskStatus.VERIFIED, TaskStatus.REJECTED] })
  @IsIn([TaskStatus.VERIFIED, TaskStatus.REJECTED])
  verdict: TaskStatus.VERIFIED | TaskStatus.REJECTED;

  @ApiPropertyOptional({ description: 'Points awarded, defaults to maxPoints when verdict is VERIFIED and status COMPLETED' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  points?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}
