import { InjectQueue } from '@nestjs/bullmq';
import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Queue } from 'bullmq';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import type { JwtPayload } from '../../auth/strategies/jwt.strategy';
import { MARKET_QUEUE } from '../../queues/queue.constants';
import type { MarketJobData } from '../queues/market-aggregation.processor';
import { DataQualityService } from '../services/data-quality.service';
import { MarketAggregationService } from '../services/market-aggregation.service';
import { TrendDetectionService } from '../services/trend-detection.service';

@ApiTags('Admin Market Intelligence')
@ApiBearerAuth()
@Controller('admin/market')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminMarketController {
  constructor(
    private readonly marketAggregationService: MarketAggregationService,
    private readonly trendDetectionService: TrendDetectionService,
    private readonly dataQualityService: DataQualityService,
    @InjectQueue(MARKET_QUEUE) private readonly marketQueue: Queue<MarketJobData>,
  ) {}

  @Get('overview')
  @ApiOperation({ summary: 'Admin overview of market metrics and coverage' })
  async getAdminOverview() {
    return this.marketAggregationService.getMarketOverview(true);
  }

  @Get('trends')
  @ApiOperation({ summary: 'Admin inspection of all detected market trends and confidence scores' })
  async getAdminTrends() {
    return this.trendDetectionService.getLatestTrends();
  }

  @Get('data-quality')
  @ApiOperation({
    summary: 'Admin data quality scorecard across all collected internship postings',
  })
  async getAdminDataQuality() {
    return this.dataQualityService.getDataQualitySummary();
  }

  @Post('recalculate')
  @ApiOperation({
    summary: 'Trigger asynchronous recomputation of all market intelligence metrics and snapshots',
  })
  async triggerRecalculate(@CurrentUser() user: JwtPayload) {
    const job = await this.marketQueue.add('admin-market-recalculate', {
      jobType: 'FULL_RECALCULATE',
      triggeredBy: `admin:${user.email}`,
    });

    return {
      message: 'Market analytics recomputation job dispatched to background queue.',
      jobId: job.id,
      timestamp: new Date().toISOString(),
    };
  }
}
