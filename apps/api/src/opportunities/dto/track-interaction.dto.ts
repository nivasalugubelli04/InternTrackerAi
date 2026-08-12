import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InteractionType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class TrackInteractionDto {
  @ApiProperty({ enum: InteractionType })
  @IsEnum(InteractionType)
  interactionType!: InteractionType;

  @ApiPropertyOptional({
    description: 'Job posting UUID (optional for SEARCH/FILTER interactions)',
  })
  @IsOptional()
  @IsUUID()
  jobId?: string;

  @ApiPropertyOptional({ description: 'Search query text (for SEARCH interactions)' })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({ description: 'JSON object of filters used (for FILTER interactions)' })
  @IsOptional()
  filtersJson?: Record<string, unknown>;
}
