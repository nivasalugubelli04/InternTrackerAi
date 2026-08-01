import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({ description: 'Email verification token received via email' })
  @IsString()
  @IsNotEmpty()
  token!: string;
}
