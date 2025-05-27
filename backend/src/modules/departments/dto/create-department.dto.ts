import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Length, Matches, MaxLength } from 'class-validator';

export class CreateDepartmentDto {
  @ApiProperty({ example: 'Dasturlash bo\'limi' })
  @IsString()
  @Length(2, 200)
  name: string;

  @ApiProperty({ example: 'DEV' })
  @IsString()
  @Length(2, 32)
  @Matches(/^[A-Z0-9_-]+$/)
  code: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  headUserId?: string;
}
