import { SprintType } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GeneratePlanDto {
  @IsOptional()
  @IsString()
  planType?: 'DAILY' | 'WEEKLY';

  @IsOptional()
  @IsString()
  targetDate?: string;
}

export class RescheduleActionDto {
  @IsString()
  rescheduledToDate!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class DeprioritizeActionDto {
  @IsString()
  option!: 'PAUSE' | 'REDUCE_SCOPE' | 'ARCHIVE';

  @IsOptional()
  @IsString()
  reason?: string;
}

export class CreateSprintDto {
  @IsString()
  title!: string;

  @IsString()
  goal!: string;

  @IsOptional()
  @IsEnum(SprintType)
  sprintType?: SprintType;

  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(30)
  durationDays?: number;

  @IsOptional()
  @IsArray()
  keyMilestones?: string[];

  @IsOptional()
  @IsArray()
  itemTitles?: string[];
}

export class SaveReviewNotesDto {
  @IsString()
  notes!: string;
}

export class UpdateExecutionPreferencesDto {
  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(480)
  dailyAvailableMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  maxDailyActions?: number;

  @IsOptional()
  @IsArray()
  preferredWorkingPeriods?: string[];

  @IsOptional()
  @IsArray()
  preferredRestDays?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  planningHorizonDays?: number;

  @IsOptional()
  @IsBoolean()
  calendarSyncEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  autoReplanOnTriggers?: boolean;
}
