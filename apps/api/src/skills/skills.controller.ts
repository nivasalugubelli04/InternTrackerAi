import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import type { Skill } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';

import { SkillsService } from './skills.service';

class SkillsQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

@ApiTags('Skills')
@ApiBearerAuth()
@Controller('skills')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Get()
  @ApiOperation({ summary: 'Search skills catalog (supports ?search= and ?category=)' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({
    name: 'category',
    required: false,
    enum: [
      'PROGRAMMING',
      'FRONTEND',
      'BACKEND',
      'DATABASE',
      'AI_ML',
      'CLOUD',
      'DEVOPS',
      'MOBILE',
      'TESTING',
      'VERSION_CONTROL',
      'SOFT_SKILLS',
      'OTHER',
    ],
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Skills list returned' })
  findAll(@Query() query: SkillsQueryDto): Promise<Skill[]> {
    return this.skillsService.findAll(query);
  }
}
