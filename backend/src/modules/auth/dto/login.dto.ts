import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'superadmin01' })
  @IsString()
  @Length(3, 64)
  login: string;

  @ApiProperty({ example: 'superadmin01' })
  @IsString()
  @Length(6, 128)
  password: string;
}

export class MobileLoginDto extends LoginDto {
  @ApiPropertyOptional({ example: 'Samsung Galaxy S24' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  deviceName?: string;

  @ApiPropertyOptional({ example: 'android' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  platform?: string;

  @ApiPropertyOptional({ description: 'Push notification token of the device' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  pushToken?: string;
}
