import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { UpsertCareerGoalDto } from '../dto/upsert-career-goal.dto';
import { CareerGoalsService } from '../services/career-goals.service';

@ApiTags('Preparation Goals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('preparation/goals')
export class CareerGoalsController {
  constructor(private readonly goalsService: CareerGoalsService) {}

  @Get()
  @ApiOperation({ summary: 'Get career goals for the authenticated user' })
  @ApiResponse({ status: 200, description: 'List of career goals' })
  async getCareerGoals(@CurrentUser('id') userId: string) {
    return this.goalsService.getCareerGoals(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create or update the primary career goal' })
  @ApiResponse({ status: 201, description: 'Career goal upserted' })
  async upsertCareerGoal(@CurrentUser('id') userId: string, @Body() dto: UpsertCareerGoalDto) {
    return this.goalsService.upsertCareerGoal(userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a specific career goal' })
  @ApiResponse({ status: 200, description: 'Career goal updated' })
  async updateCareerGoal(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertCareerGoalDto,
  ) {
    return this.goalsService.updateCareerGoal(id, userId, dto);
  }
}
