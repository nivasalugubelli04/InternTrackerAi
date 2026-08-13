import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApplicationStatus } from '@prisma/client';
import { IsUUID, IsEnum, IsOptional, IsString, IsUrl, IsInt, IsDateString } from 'class-validator';

export class CreateApplicationDto {
  @ApiProperty({ description: 'ID of the JobPosting' })
  @IsUUID()
  jobId!: string;

  @ApiPropertyOptional({
    enum: ApplicationStatus,
    description: 'Initial application status',
    default: ApplicationStatus.APPLIED,
  })
  @IsEnum(ApplicationStatus)
  @IsOptional()
  status?: ApplicationStatus;

  @ApiPropertyOptional({
    description: 'URL used to apply',
    example: 'https://careers.microsoft.com/...',
  })
  @IsUrl()
  @IsOptional()
  applicationUrl?: string;

  @ApiPropertyOptional({
    description: 'Notes regarding the application',
    example: 'Need to follow up',
  })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Salary expectation', example: 5000 })
  @IsInt()
  @IsOptional()
  salaryExpectation?: number;

  @ApiPropertyOptional({
    description: 'Where this application was sourced from',
    example: 'LinkedIn',
  })
  @IsString()
  @IsOptional()
  source?: string;

  @ApiPropertyOptional({ description: 'The next action to take', example: 'Follow up' })
  @IsString()
  @IsOptional()
  nextAction?: string;

  @ApiPropertyOptional({ description: 'Date for the next action', example: '2026-08-15T00:00:00Z' })
  @IsDateString()
  @IsOptional()
  nextActionDate?: string;
}
