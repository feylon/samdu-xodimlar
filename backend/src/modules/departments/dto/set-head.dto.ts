import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class SetHeadDto {
  @ApiPropertyOptional({ description: 'Null removes the current head' })
  @IsOptional()
  @IsUUID()
  userId?: string | null;
}
