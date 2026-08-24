import { OpportunityCategory } from '@prisma/client';
import { IsArray, IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateWatchlistDto {
  @IsString()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsOptional()
  targetRoles?: string[];

  @IsArray()
  @IsOptional()
  categories?: OpportunityCategory[];

  @IsArray()
  @IsOptional()
  targetLocations?: string[];

  @IsBoolean()
  @IsOptional()
  remoteOnly?: boolean;

  @IsNumber()
  @IsOptional()
  minMatchScore?: number;
}

export class AddWatchlistItemDto {
  @IsString()
  @IsOptional()
  jobPostingId?: string;

  @IsString()
  opportunityTitle!: string;

  @IsString()
  companyName!: string;

  @IsNumber()
  @IsOptional()
  matchScore?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class PrepareActionDto {
  @IsString()
  opportunityTitle!: string;

  @IsString()
  companyName!: string;

  @IsString()
  suggestedTask!: string;

  @IsNumber()
  @IsOptional()
  estimatedMinutes?: number;
}

export class UpdateResearchPreferenceDto {
  @IsArray()
  @IsOptional()
  preferredCategories?: OpportunityCategory[];

  @IsArray()
  @IsOptional()
  targetRoles?: string[];

  @IsArray()
  @IsOptional()
  targetLocations?: string[];

  @IsArray()
  @IsOptional()
  preferredWorkModes?: string[];

  @IsString()
  @IsOptional()
  researchFrequency?: string;

  @IsBoolean()
  @IsOptional()
  autoMatchAlerts?: boolean;

  @IsNumber()
  @IsOptional()
  minAlertMatchScore?: number;
}
