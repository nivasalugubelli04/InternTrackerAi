import { IsEnum, IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RecommendationFeedbackType } from '@prisma/client';

export class SubmitRecommendationFeedbackDto {
  @ApiProperty({ description: 'The ID of the job posting' })
  @IsUUID()
  @IsNotEmpty()
  jobId!: string;

  @ApiProperty({ enum: RecommendationFeedbackType, description: 'Type of feedback' })
  @IsEnum(RecommendationFeedbackType)
  @IsNotEmpty()
  feedback!: RecommendationFeedbackType;
}
