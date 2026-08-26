import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';

import { BetaController } from './controllers/beta.controller';
import { BetaProgramService } from './services/beta-program.service';
import { BetaService } from './services/beta.service';
import { FeedbackCollectionService } from './services/feedback-collection.service';
import { FeedbackIntelligenceService } from './services/feedback-intelligence.service';
import { ProductAnalyticsService } from './services/product-analytics.service';
import { ProductHealthScorecardService } from './services/product-health-scorecard.service';
import { ProductInsightEngineService } from './services/product-insight-engine.service';
import { UxFrictionDetectorService } from './services/ux-friction-detector.service';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [BetaController],
  providers: [
    ProductAnalyticsService,
    FeedbackCollectionService,
    FeedbackIntelligenceService,
    ProductInsightEngineService,
    ProductHealthScorecardService,
    UxFrictionDetectorService,
    BetaProgramService,
    BetaService,
  ],
  exports: [
    ProductAnalyticsService,
    FeedbackCollectionService,
    FeedbackIntelligenceService,
    ProductInsightEngineService,
    ProductHealthScorecardService,
    UxFrictionDetectorService,
    BetaProgramService,
    BetaService,
  ],
})
export class BetaModule {}
