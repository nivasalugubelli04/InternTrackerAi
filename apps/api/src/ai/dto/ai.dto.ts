import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';

export class ResumeAnalysisDto {
  @ApiProperty({ description: 'Raw extracted text of the resume' })
  @IsString()
  @IsNotEmpty()
  resumeText!: string;
}

export class CompareJobsDto {
  @ApiProperty({ description: 'List of job IDs to compare', minItems: 2, maxItems: 5 })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(2)
  @ArrayMaxSize(5)
  jobIds!: string[];
}

export class LearningRoadmapDto {
  @ApiProperty({ description: 'Target job title/role' })
  @IsString()
  @IsNotEmpty()
  targetRole!: string;

  @ApiPropertyOptional({ description: 'Optional target company' })
  @IsString()
  @IsOptional()
  targetCompany?: string;
}

export class ChatDto {
  @ApiProperty({ description: 'User chat message' })
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiPropertyOptional({ description: 'Optional conversation ID to append message to' })
  @IsString()
  @IsOptional()
  conversationId?: string;

  @ApiPropertyOptional({ description: 'Optional job ID to link message context' })
  @IsString()
  @IsOptional()
  jobId?: string;
}
