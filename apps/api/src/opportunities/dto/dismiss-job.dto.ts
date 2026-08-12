import { ApiPropertyOptional } from '@nestjs/swagger';
import { DismissReason } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class DismissJobDto {
  @ApiPropertyOptional({ enum: DismissReason, default: DismissReason.NOT_INTERESTED })
  @IsOptional()
  @IsEnum(DismissReason)
  reason?: DismissReason = DismissReason.NOT_INTERESTED;

  @ApiPropertyOptional({ description: 'Optional free-text reason (used when reason is OTHER)' })
  @IsOptional()
  @IsString()
  note?: string;
}
