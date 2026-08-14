import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { AiModule } from '../ai/ai.module';
import { PrismaModule } from '../prisma/prisma.module';
import { MARKET_QUEUE } from '../queues/queue.constants';
import { RedisModule } from '../redis/redis.module';

import { AdminMarketController } from './controllers/admin-market.controller';
import { CompanyMarketController } from './controllers/company-market.controller';
import { MarketController } from './controllers/market.controller';
import { RoleMarketController } from './controllers/role-market.controller';
import { MarketCronService } from './cron/market.cron';
import { MarketAggregationProcessor } from './queues/market-aggregation.processor';
import { CompanyAnalyticsService } from './services/company-analytics.service';
import { DataQualityService } from './services/data-quality.service';
import { LocationIntelligenceService } from './services/location-intelligence.service';
import { MarketAggregationService } from './services/market-aggregation.service';
import { MarketInsightService } from './services/market-insight.service';
import { RoleAnalyticsService } from './services/role-analytics.service';
import { SkillDemandService } from './services/skill-demand.service';
import { TrendDetectionService } from './services/trend-detection.service';
import { UserMarketPositionService } from './services/user-market-position.service';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    AiModule,
    BullModule.registerQueue({
      name: MARKET_QUEUE,
    }),
  ],
  controllers: [
    MarketController,
    CompanyMarketController,
    RoleMarketController,
    AdminMarketController,
  ],
  providers: [
    MarketAggregationService,
    SkillDemandService,
    RoleAnalyticsService,
    CompanyAnalyticsService,
    LocationIntelligenceService,
    TrendDetectionService,
    MarketInsightService,
    DataQualityService,
    UserMarketPositionService,
    MarketAggregationProcessor,
    MarketCronService,
  ],
  exports: [
    MarketAggregationService,
    SkillDemandService,
    RoleAnalyticsService,
    CompanyAnalyticsService,
    LocationIntelligenceService,
    TrendDetectionService,
    MarketInsightService,
    DataQualityService,
    UserMarketPositionService,
  ],
})
export class MarketModule {}
