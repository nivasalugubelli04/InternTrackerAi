import {
  MetricCategory,
  ImprovementPriority,
  ImprovementStatus,
  ExperimentStatus,
  ExperimentDecision,
} from '@prisma/client';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsEnum,
  IsObject,
  IsArray,
  Min,
  Max,
} from 'class-validator';

export enum FeatureHealthClassification {
  HIGH_VALUE = 'HIGH_VALUE',
  GROWING = 'GROWING',
  UNDERDISCOVERED = 'UNDERDISCOVERED',
  LOW_ADOPTION = 'LOW_ADOPTION',
  HIGH_FRICTION = 'HIGH_FRICTION',
  UNUSED = 'UNUSED',
}

export {
  MetricCategory,
  ImprovementPriority,
  ImprovementStatus,
  ExperimentStatus,
  ExperimentDecision,
};

export class RecordBehaviorEventDto {
  @IsString()
  eventName!: string;

  @IsString()
  featureName!: string;

  @IsOptional()
  @IsString()
  journeyStage?: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsObject()
  properties?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isFriction?: boolean;

  @IsOptional()
  @IsNumber()
  durationMs?: number;
}

export class CreateProductImprovementDto {
  @IsString()
  title!: string;

  @IsString()
  problemSummary!: string;

  @IsString()
  evidenceDetails!: string;

  @IsString()
  affectedFeature!: string;

  @IsOptional()
  @IsNumber()
  affectedUserCount?: number;

  @IsString()
  severity!: string; // "LOW", "MEDIUM", "HIGH", "CRITICAL"

  @IsString()
  frequency!: string; // "ISOLATED", "RECURRING", "SYSTEMIC"

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  userImpactScore?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  revenueImpactScore?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  strategicValue?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  implementationEffort?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  confidenceScore?: number;

  @IsOptional()
  @IsEnum(ImprovementPriority)
  priority?: ImprovementPriority;

  @IsOptional()
  @IsString()
  assignedToUserId?: string;
}

export class UpdateProductImprovementDto {
  @IsOptional()
  @IsEnum(ImprovementStatus)
  status?: ImprovementStatus;

  @IsOptional()
  @IsEnum(ImprovementPriority)
  priority?: ImprovementPriority;

  @IsOptional()
  @IsString()
  assignedToUserId?: string;

  @IsOptional()
  @IsString()
  resolutionNotes?: string;
}

export class CreateProductExperimentDto {
  @IsString()
  experimentKey!: string;

  @IsString()
  name!: string;

  @IsString()
  hypothesis!: string;

  @IsString()
  targetMetric!: string;

  @IsArray()
  variants!: Array<{ key: string; weight: number; label?: string }>;

  @IsOptional()
  @IsString()
  targetAudience?: string;
}

export class UpdateProductExperimentDto {
  @IsOptional()
  @IsEnum(ExperimentStatus)
  status?: ExperimentStatus;

  @IsOptional()
  @IsEnum(ExperimentDecision)
  decision?: ExperimentDecision;

  @IsOptional()
  @IsString()
  resultsSummary?: string;
}
