import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsInt, Min, Max, IsArray, IsBoolean } from 'class-validator';

export class UpdatePreferencesDto {
  @ApiProperty({
    enum: [
      'GENERAL_CAREER',
      'INTERNSHIP_SEARCH',
      'INTERVIEW_PREPARATION',
      'SKILL_BUILDING',
      'APPLICATION_FOCUS',
    ],
    required: false,
  })
  @IsOptional()
  @IsEnum([
    'GENERAL_CAREER',
    'INTERNSHIP_SEARCH',
    'INTERVIEW_PREPARATION',
    'SKILL_BUILDING',
    'APPLICATION_FOCUS',
  ])
  careerMode?:
    | 'GENERAL_CAREER'
    | 'INTERNSHIP_SEARCH'
    | 'INTERVIEW_PREPARATION'
    | 'SKILL_BUILDING'
    | 'APPLICATION_FOCUS';

  @ApiProperty({ required: false, description: 'Daily time budget in minutes' })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(1440)
  dailyTimeBudget?: number;

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dashboardSections?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  aiBriefEnabled?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  recommendedActionsEnabled?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  learningReminders?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  interviewReminders?: boolean;
}

export class SnoozeActionDto {
  @ApiProperty({ required: false, default: 24, description: 'Hours to snooze the action' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(168)
  snoozeHours?: number;
}

export class DailyPlanRequestDto {
  @ApiProperty({ required: false, description: 'Time budget in minutes' })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(1440)
  timeBudget?: number;

  @ApiProperty({
    enum: [
      'GENERAL_CAREER',
      'INTERNSHIP_SEARCH',
      'INTERVIEW_PREPARATION',
      'SKILL_BUILDING',
      'APPLICATION_FOCUS',
    ],
    required: false,
  })
  @IsOptional()
  @IsEnum([
    'GENERAL_CAREER',
    'INTERNSHIP_SEARCH',
    'INTERVIEW_PREPARATION',
    'SKILL_BUILDING',
    'APPLICATION_FOCUS',
  ])
  careerMode?:
    | 'GENERAL_CAREER'
    | 'INTERNSHIP_SEARCH'
    | 'INTERVIEW_PREPARATION'
    | 'SKILL_BUILDING'
    | 'APPLICATION_FOCUS';
}

export class CareerAiChatDto {
  @ApiProperty()
  @IsString()
  message!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  conversationId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  jobId?: string;
}
