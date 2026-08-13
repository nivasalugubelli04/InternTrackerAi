import { Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PreparationPlanService } from '../services/preparation-plan.service';

@ApiTags('Preparation Plans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('preparation/plans')
export class PreparationPlanController {
  constructor(private readonly planService: PreparationPlanService) {}

  @Post('jobs/:jobId')
  @ApiOperation({ summary: 'Generate a new AI preparation plan for a job' })
  @ApiResponse({ status: 201, description: 'Plan successfully generated' })
  async generatePreparationPlan(
    @CurrentUser('id') userId: string,
    @Param('jobId', ParseUUIDPipe) jobId: string,
  ) {
    return this.planService.generatePreparationPlan(userId, jobId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific preparation plan by ID' })
  @ApiResponse({ status: 200, description: 'Preparation plan object' })
  async getPreparationPlan(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.planService.getPreparationPlan(id, userId);
  }
}
