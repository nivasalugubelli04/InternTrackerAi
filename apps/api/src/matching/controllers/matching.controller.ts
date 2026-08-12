import { InjectQueue } from '@nestjs/bullmq';
import { Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Queue } from 'bullmq';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { MATCH_ALL_JOB } from '../../queues/processors/matching.processor';
import { MATCHING_QUEUE } from '../../queues/queue.constants';
import { RecommendationService } from '../services/recommendation.service';

@ApiTags('Matching Engine')
@ApiBearerAuth()
@Controller('matching')
export class MatchingController {
  constructor(
    private readonly recommendationService: RecommendationService,
    @InjectQueue(MATCHING_QUEUE)
    private readonly matchingQueue: Queue,
  ) {}

  @Post('run/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger AI matching engine for a specific user' })
  @ApiResponse({ status: 200, description: 'Matching calculated and recommendations updated.' })
  async runMatchingForUser(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.recommendationService.runMatchingForUser(userId);
  }

  @Post('run-all')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Trigger background batch matching engine for all active users' })
  @ApiResponse({ status: 202, description: 'Batch matching job queued successfully.' })
  async runMatchingForAll() {
    const job = await this.matchingQueue.add(MATCH_ALL_JOB, {});
    return {
      message: 'Batch matching job queued',
      jobId: job.id,
    };
  }
}

@ApiTags('Match Scores')
@ApiBearerAuth()
@Controller('match-score')
export class MatchScoreController {
  constructor(private readonly recommendationService: RecommendationService) {}

  @Get(':jobId')
  @ApiOperation({ summary: 'Get or compute match score for a specific job posting' })
  @ApiResponse({ status: 200, description: 'Detailed match score breakdown.' })
  async getMatchScore(
    @CurrentUser('id') userId: string,
    @Param('jobId', ParseUUIDPipe) jobId: string,
  ) {
    return this.recommendationService.getMatchScoreForJob(userId, jobId);
  }
}
