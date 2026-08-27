import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { ProductIntelligenceController } from './controllers/product-intelligence.controller';
import { ActivationFunnelService } from './services/activation-funnel.service';
import { AiQualityMonitoringService } from './services/ai-quality-monitoring.service';
import { FeatureAdoptionService } from './services/feature-adoption.service';
import { FeedbackIntelligenceService } from './services/feedback-intelligence.service';
import { JourneyFrictionService } from './services/journey-friction.service';
import { MetricsRegistryService } from './services/metrics-registry.service';
import { ProductExperimentService } from './services/product-experiment.service';
import { ProductHealthService } from './services/product-health.service';
import { ProductPrioritizationService } from './services/product-prioritization.service';
import { RetentionCohortService } from './services/retention-cohort.service';
import { WeeklyReviewService } from './services/weekly-review.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProductIntelligenceController],
  providers: [
    ProductHealthService,
    MetricsRegistryService,
    ActivationFunnelService,
    FeatureAdoptionService,
    JourneyFrictionService,
    FeedbackIntelligenceService,
    AiQualityMonitoringService,
    RetentionCohortService,
    ProductExperimentService,
    ProductPrioritizationService,
    WeeklyReviewService,
  ],
  exports: [
    ProductHealthService,
    MetricsRegistryService,
    ActivationFunnelService,
    FeatureAdoptionService,
    JourneyFrictionService,
    FeedbackIntelligenceService,
    AiQualityMonitoringService,
    RetentionCohortService,
    ProductExperimentService,
    ProductPrioritizationService,
    WeeklyReviewService,
  ],
})
export class ProductIntelligenceModule {}
