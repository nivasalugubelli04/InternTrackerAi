import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsUrl,
  IsArray,
  IsBoolean,
  IsDateString,
} from 'class-validator';

export class CreateLearningGoalDto {
  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  targetRole?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  targetSkillId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ['HIGH', 'MEDIUM', 'LOW'] })
  @IsEnum(['HIGH', 'MEDIUM', 'LOW'])
  priority!: 'HIGH' | 'MEDIUM' | 'LOW';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  targetDate?: string;
}

export class UpdateLearningGoalDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ['HIGH', 'MEDIUM', 'LOW'], required: false })
  @IsOptional()
  @IsEnum(['HIGH', 'MEDIUM', 'LOW'])
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';

  @ApiProperty({
    enum: ['NOT_STARTED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['NOT_STARTED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'])
  status?: 'NOT_STARTED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  targetDate?: string;
}

export class UpdateLearningPreferenceDto {
  @ApiProperty()
  @IsString()
  preferredContentType!: string;

  @ApiProperty()
  @IsInt()
  @Min(5)
  @Max(480)
  dailyTimeMinutes!: number;

  @ApiProperty({ enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] })
  @IsEnum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'])
  preferredDifficulty!: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  learningDays!: string[];

  @ApiProperty()
  @IsBoolean()
  projectBased!: boolean;
}

export class CreateLearningResourceDto {
  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty()
  @IsString()
  provider!: string;

  @ApiProperty()
  @IsUrl()
  url!: string;

  @ApiProperty()
  @IsString()
  contentType!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  skillId?: string;

  @ApiProperty({ enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] })
  @IsEnum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'])
  difficulty!: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

  @ApiProperty()
  @IsInt()
  @Min(0)
  estimatedDuration!: number;
}

export class UpdateLearningResourceDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl()
  url?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  status?: string;
}

export class CreateLearningModuleDto {
  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  skillId?: string;

  @ApiProperty({ enum: ['AWARENESS', 'BEGINNER', 'DEVELOPING', 'INTERMEDIATE', 'ADVANCED'] })
  @IsEnum(['AWARENESS', 'BEGINNER', 'DEVELOPING', 'INTERMEDIATE', 'ADVANCED'])
  level!: 'AWARENESS' | 'BEGINNER' | 'DEVELOPING' | 'INTERMEDIATE' | 'ADVANCED';

  @ApiProperty()
  @IsInt()
  @Min(1)
  estimatedDuration!: number;

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  prerequisites?: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  learningObjectives!: string[];

  @ApiProperty()
  @IsString()
  contentType!: string;
}

export class SubmitPracticeAttemptDto {
  @ApiProperty()
  @IsString()
  answer!: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  timeSpentSeconds!: number;
}

export class AddSkillEvidenceDto {
  @ApiProperty()
  @IsString()
  skillId!: string;

  @ApiProperty({
    enum: ['QUIZ', 'CODING_EXERCISE', 'PROJECT', 'ASSESSMENT', 'CERTIFICATE', 'EXPERIENCE'],
  })
  @IsEnum(['QUIZ', 'CODING_EXERCISE', 'PROJECT', 'ASSESSMENT', 'CERTIFICATE', 'EXPERIENCE'])
  evidenceType!:
    'QUIZ' | 'CODING_EXERCISE' | 'PROJECT' | 'ASSESSMENT' | 'CERTIFICATE' | 'EXPERIENCE';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  referenceId?: string;

  @ApiProperty()
  @Min(0)
  @Max(100)
  score!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;
}

export class AddCertificationDto {
  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty()
  @IsString()
  provider!: string;

  @ApiProperty()
  @IsDateString()
  issueDate!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiProperty()
  @IsUrl()
  credentialUrl!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  credentialId?: string;
}
