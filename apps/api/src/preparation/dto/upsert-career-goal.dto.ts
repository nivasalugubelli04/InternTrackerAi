import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpsertCareerGoalDto {
  @ApiPropertyOptional({ description: 'The target role the user is aiming for' })
  @IsString()
  @IsOptional()
  targetRole?: string;

  @ApiPropertyOptional({ description: 'The target company the user is aiming for' })
  @IsString()
  @IsOptional()
  targetCompany?: string;

  @ApiPropertyOptional({ description: 'The target date to get an offer by' })
  @IsDateString()
  @IsOptional()
  targetDate?: string;

  @ApiPropertyOptional({
    description: 'How many hours per week the user can dedicate to preparation',
  })
  @IsInt()
  @Min(1)
  @Max(40)
  @IsOptional()
  hoursPerWeek?: number;
}
