import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Length, Matches } from 'class-validator';

export class UpdateCredentialsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(3, 64)
  @Matches(/^[a-zA-Z0-9._-]+$/)
  login?: string;

  @ApiPropertyOptional({ minLength: 8 })
  @IsOptional()
  @IsString()
  @Length(8, 128)
  password?: string;

  @ApiPropertyOptional({ description: 'Force the user to change password on next login' })
  @IsOptional()
  @IsBoolean()
  mustChangePassword?: boolean;

  @ApiPropertyOptional({ description: 'Terminate all active sessions of the user', default: true })
  @IsOptional()
  @IsBoolean()
  terminateSessions?: boolean;
}
