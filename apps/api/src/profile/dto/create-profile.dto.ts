import { ApiPropertyOptional } from '@nestjs/swagger';
import { Gender } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsISO8601,
  IsUrl,
  IsInt,
  Min,
  Max,
  MaxLength,
  Matches,
  IsNumber,
} from 'class-validator';

export class CreateProfileDto {
  // ── Personal ────────────────────────────────────────────────────────────────
  @ApiPropertyOptional({ example: '+919876543210' })
  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9]\d{6,14}$/, {
    message: 'Phone must be in international format, e.g. +919876543210',
  })
  phone?: string;

  @ApiPropertyOptional({ enum: ['MALE', 'FEMALE', 'NON_BINARY', 'PREFER_NOT_TO_SAY'] })
  @IsOptional()
  @IsEnum(['MALE', 'FEMALE', 'NON_BINARY', 'PREFER_NOT_TO_SAY'])
  gender?: Gender;

  @ApiPropertyOptional({ example: '2000-05-15' })
  @IsOptional()
  @IsISO8601({ strict: true })
  dateOfBirth?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional({ maxLength: 150, example: 'Full Stack Developer | Open to Internships' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  headline?: string;

  // ── Location ────────────────────────────────────────────────────────────────
  @ApiPropertyOptional({ example: 'Bengaluru' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 'Karnataka' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({ example: 'India' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  // ── Education ───────────────────────────────────────────────────────────────
  @ApiPropertyOptional({ example: 'IIT Bombay' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  college?: string;

  @ApiPropertyOptional({ example: 'Mumbai University' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  university?: string;

  @ApiPropertyOptional({ example: 'B.Tech' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  degree?: string;

  @ApiPropertyOptional({ example: 'Computer Science & Engineering' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  branch?: string;

  @ApiPropertyOptional({ example: 3, description: 'Current year of study (1–6)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(6)
  yearOfStudy?: number;

  @ApiPropertyOptional({ example: 8.5, description: 'CGPA (0.00–10.00)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(10)
  cgpa?: number;

  @ApiPropertyOptional({ example: 2026 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2040)
  graduationYear?: number;

  // ── Social ─────────────────────────────────────────────────────────────────
  @ApiPropertyOptional({ example: 'https://linkedin.com/in/johndoe' })
  @IsOptional()
  @IsUrl({}, { message: 'linkedinUrl must be a valid URL' })
  @MaxLength(500)
  linkedinUrl?: string;

  @ApiPropertyOptional({ example: 'https://github.com/johndoe' })
  @IsOptional()
  @IsUrl({}, { message: 'githubUrl must be a valid URL' })
  @MaxLength(500)
  githubUrl?: string;

  @ApiPropertyOptional({ example: 'https://johndoe.dev' })
  @IsOptional()
  @IsUrl({}, { message: 'portfolioUrl must be a valid URL' })
  @MaxLength(500)
  portfolioUrl?: string;
}
