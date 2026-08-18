import { ApiPropertyOptional } from '@nestjs/swagger';
import { WorkMode } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsNumber,
  IsDateString,
  IsBoolean,
} from 'class-validator';

export enum SortOption {
  BEST_MATCH = 'best_match',
  NEWEST = 'newest',
  DEADLINE_SOON = 'deadline_soon',
  HIGHEST_STIPEND = 'highest_stipend',
  COMPANY_PRIORITY = 'company_priority',
  COMPANY = 'company',
  RELEVANCE = 'relevance',
}

export class OpportunitiesQueryDto {
  @ApiPropertyOptional({ description: 'Text search query (title, company, skills, location)' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: 'Filter by company UUID' })
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional({ description: 'Filter by location string' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Filter by Indian state' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ description: 'Filter by industry' })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional({ description: 'Comma-separated skill names' })
  @IsOptional()
  @IsString()
  skills?: string;

  @ApiPropertyOptional({ enum: WorkMode })
  @IsOptional()
  @IsEnum(WorkMode)
  workMode?: WorkMode;

  @ApiPropertyOptional({ description: 'Filter by employment type (e.g., Internship)' })
  @IsOptional()
  @IsString()
  employmentType?: string;

  @ApiPropertyOptional({ description: 'Minimum stipend in INR/month' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minStipend?: number;

  @ApiPropertyOptional({ description: 'Maximum stipend in INR/month' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxStipend?: number;

  @ApiPropertyOptional({ description: 'Minimum match score (0-100)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  minMatchScore?: number;

  @ApiPropertyOptional({ description: 'Return only jobs from tracked companies' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  trackedCompaniesOnly?: boolean;

  @ApiPropertyOptional({ description: 'Filter jobs posted after this ISO date' })
  @IsOptional()
  @IsDateString()
  postedAfter?: string;

  @ApiPropertyOptional({ description: 'Filter jobs posted before this ISO date' })
  @IsOptional()
  @IsDateString()
  postedBefore?: string;

  @ApiPropertyOptional({ description: 'Filter jobs with deadline before this ISO date' })
  @IsOptional()
  @IsDateString()
  deadlineBefore?: string;

  @ApiPropertyOptional({ enum: SortOption, default: SortOption.BEST_MATCH })
  @IsOptional()
  @IsEnum(SortOption)
  sort?: SortOption = SortOption.BEST_MATCH;

  @ApiPropertyOptional({ description: 'Cursor for cursor-based pagination (opaque string)' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ description: 'Number of results to return (max 50)', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}
