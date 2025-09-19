import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class VoteDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  optionIndex: number;
}
