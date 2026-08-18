import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { GetRecommendationsDto } from '../dto/get-recommendations.dto';
import { SubmitRecommendationFeedbackDto } from '../dto/submit-recommendation-feedback.dto';
import { RecommendationService } from '../services/recommendation.service';

@ApiTags('Recommendations')
@ApiBearerAuth()
@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recommendationService: RecommendationService) {}

  @Get()
  @ApiOperation({ summary: 'Get ranked recommendations for the authenticated user' })
  @ApiResponse({ status: 200, description: 'Paginated list of job recommendations.' })
  async getRecommendations(
    @CurrentUser('id') userId: string,
    @Query() query: GetRecommendationsDto,
  ) {
    return this.recommendationService.getRecommendations(userId, query);
  }

  @Get('insights')
  @ApiOperation({ summary: 'Get AI matching insights' })
  @ApiResponse({ status: 200, description: 'Matching insights for the user.' })
  async getInsights(@CurrentUser('id') userId: string) {
    return this.recommendationService.getInsights(userId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get detailed recommendation by ID including match breakdown and reasons',
  })
  @ApiResponse({ status: 200, description: 'Detailed recommendation object.' })
  async getRecommendationById(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.recommendationService.getRecommendationById(id, userId);
  }

  @Post('feedback')
  @ApiOperation({ summary: 'Submit feedback for a specific recommendation' })
  @ApiResponse({ status: 201, description: 'Feedback successfully submitted.' })
  async submitFeedback(
    @CurrentUser('id') userId: string,
    @Body() dto: SubmitRecommendationFeedbackDto,
  ) {
    return this.recommendationService.submitFeedback(userId, dto.jobId, dto.feedback);
  }
}
