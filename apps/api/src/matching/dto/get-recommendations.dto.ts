import { ApiPropertyOptional } from '@nestjs/swagger';
import { RecommendationPriority, RecommendationType } from '@prisma/client';
import { Type, Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export class GetRecommendationsDto {
  @ApiPropertyOptional({
    enum: RecommendationType,
    description: 'Filter by recommendation match tier',
  })
  @IsOptional()
  @IsEnum(RecommendationType)
  recommendationType?: RecommendationType;

  @ApiPropertyOptional({
    enum: RecommendationPriority,
    description: 'Filter by recommendation priority',
  })
  @IsOptional()
  @IsEnum(RecommendationPriority)
  priority?: RecommendationPriority;

  @ApiPropertyOptional({ description: 'Filter saved recommendations' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isSaved?: boolean;

  @ApiPropertyOptional({ description: 'Filter dismissed recommendations' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isDismissed?: boolean;

  @ApiPropertyOptional({ default: 1, minimum: 1, description: 'Page number' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100, description: 'Items per page' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
