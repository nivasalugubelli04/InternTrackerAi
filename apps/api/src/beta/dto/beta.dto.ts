import { FeedbackType } from '@prisma/client';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsObject,
  IsArray,
  MaxLength,
  Min,
  Max,
} from 'class-validator';

export class SubmitFeedbackDto {
  @IsEnum(FeedbackType)
  type!: FeedbackType;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(3000)
  message!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  severity?: string;

  @IsOptional()
  @IsString()
  resourceId?: string;

  @IsOptional()
  @IsNumber()
  @Min(-1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class SubmitContextualRatingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  feature!: string;

  @IsNumber()
  @Min(-1)
  @Max(5)
  rating!: number; // e.g. 1 for helpful, -1 for not helpful, or 1-5 stars

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;

  @IsOptional()
  @IsString()
  resourceId?: string;

  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}

export class ReportBugDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(3000)
  description!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  expectedBehavior?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  affectedFeature?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  severity?: string; // P0, P1, P2, P3

  @IsOptional()
  @IsString()
  route?: string;

  @IsOptional()
  @IsString()
  screenshotUrl?: string;

  @IsOptional()
  @IsObject()
  technicalMetadata?: {
    appVersion?: string;
    deviceCategory?: string;
    route?: string;
    errorId?: string;
  };
}

export class TrackAnalyticsEventDto {
  @IsString()
  @IsNotEmpty()
  eventName!: string;

  @IsOptional()
  @IsObject()
  properties?: Record<string, any>;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsString()
  route?: string;

  @IsOptional()
  @IsString()
  deviceCategory?: string;

  @IsOptional()
  @IsString()
  appVersion?: string;
}

export class UpdateBetaOnboardingDto {
  @IsOptional()
  isWelcomed?: boolean;

  @IsOptional()
  hasExploredFeatures?: boolean;

  @IsOptional()
  feedbackDismissed?: boolean;

  @IsOptional()
  @IsArray()
  completedSteps?: string[];
}

export class InviteBetaUserDto {
  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  cohort?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  maxUses?: number;
}
