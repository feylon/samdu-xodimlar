import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsString, IsUUID, Length, Max, Min } from 'class-validator';

export class AdjustPointsDto {
  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Positive or negative points', example: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(-100)
  @Max(100)
  points: number;

  @ApiProperty()
  @IsString()
  @Length(3, 500)
  reason: string;
}
