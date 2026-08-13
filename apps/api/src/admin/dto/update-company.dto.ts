import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUrl } from 'class-validator';

import { IsSafeUrl } from '../../common/validators/is-safe-url.validator';

export class UpdateCompanyDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @IsUrl()
  @IsSafeUrl({ message: 'careerUrl must not point to internal infrastructure' })
  careerUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  parserType?: string;
}
