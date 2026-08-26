import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsObject,
  Min,
  Max,
} from 'class-validator';

import {
  LearningSignalType,
  CareerOptimizationFeedbackResponse,
} from '../interfaces/optimization.interfaces';

export class RecordSignalDto {
  @IsEnum([
    'TASK_COMPLETED',
    'TASK_SKIPPED',
    'TASK_DELAYED',
    'PLAN_ACCEPTED',
    'PLAN_REJECTED',
    'OPPORTUNITY_SAVED',
    'OPPORTUNITY_IGNORED',
    'OPPORTUNITY_APPLIED',
    'APPLICATION_REJECTED',
    'APPLICATION_ADVANCED',
    'INTERVIEW_COMPLETED',
    'INTERVIEW_ADVANCED',
    'SKILL_IMPROVED',
    'PROJECT_COMPLETED',
    'PORTFOLIO_UPDATED',
    'RECOMMENDATION_ACCEPTED',
    'RECOMMENDATION_REJECTED',
    'FEEDBACK_SUBMITTED',
  ])
  signalType!: LearningSignalType;

  @IsString()
  sourceEngine!: string;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsObject()
  payload?: any;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;
}

export class SubmitFeedbackDto {
  @IsOptional()
  @IsString()
  recommendationId?: string;

  @IsString()
  recommendationType!: string;

  @IsEnum([
    'HELPFUL',
    'NOT_HELPFUL',
    'ALREADY_DOING_THIS',
    'NOT_RELEVANT',
    'TOO_DIFFICULT',
    'NOT_ENOUGH_TIME',
    'PREFER_ANOTHER_OPTION',
  ])
  response!: CareerOptimizationFeedbackResponse;

  @IsOptional()
  @IsString()
  comment?: string;
}

export class ApproveProposalDto {
  @IsOptional()
  @IsString()
  customNotes?: string;
}

export class RejectProposalDto {
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

export class ModifyProposalDto {
  @IsObject()
  modifiedPayload!: any;
}

export class CreateExperimentDto {
  @IsString()
  title!: string;

  @IsString()
  hypothesis!: string;

  @IsOptional()
  @IsNumber()
  @Min(3)
  @Max(60)
  durationDays?: number;

  @IsString()
  strategyA!: string;

  @IsString()
  strategyB!: string;
}

export class UpdatePreferenceDto {
  @IsOptional()
  @IsString()
  value?: string;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}
