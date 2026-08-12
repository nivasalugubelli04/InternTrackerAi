import { ApiPropertyOptional } from '@nestjs/swagger';
import type { WorkMode } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdatePreferencesDto {
  @ApiPropertyOptional({ example: ['Software Engineer', 'Backend Developer'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredRoles?: string[];

  @ApiPropertyOptional({ example: ['Bengaluru', 'Remote'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredLocations?: string[];

  @ApiPropertyOptional({ example: ['FinTech', 'EdTech', 'SaaS'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredIndustries?: string[];

  @ApiPropertyOptional({ enum: ['REMOTE', 'HYBRID', 'ONSITE'], isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(['REMOTE', 'HYBRID', 'ONSITE'], { each: true })
  preferredWorkMode?: WorkMode[];

  @ApiPropertyOptional({ example: 10000, description: 'Minimum monthly stipend in INR' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minimumStipend?: number;

  @ApiPropertyOptional({ example: '3 months', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  internshipDuration?: string;

  @ApiPropertyOptional({ example: ['Google', 'Microsoft', 'Razorpay'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredCompanies?: string[];
}

export class UpdateNotificationPreferenceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  dailyDigest?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  weeklyDigest?: boolean;

  @ApiPropertyOptional({ example: '22:00', description: 'HH:MM format' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'quietHoursStart must be in HH:MM format' })
  quietHoursStart?: string;

  @ApiPropertyOptional({ example: '08:00', description: 'HH:MM format' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'quietHoursEnd must be in HH:MM format' })
  quietHoursEnd?: string;
}
