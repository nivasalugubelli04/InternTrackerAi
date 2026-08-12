import { forwardRef, Module } from '@nestjs/common';

import { QueuesModule } from '../queues/queues.module';

import { AshbyAdapter } from './adapters/ashby.adapter';
import { GenericHtmlAdapter } from './adapters/generic-html.adapter';
import { GreenhouseAdapter } from './adapters/greenhouse.adapter';
import { LeverAdapter } from './adapters/lever.adapter';
import { SmartRecruitersAdapter } from './adapters/smartrecruiters.adapter';
import { WorkdayAdapter } from './adapters/workday.adapter';
import { ScrapersController } from './controllers/scrapers.controller';
import { ScraperManager } from './scraper.manager';
import { DeduplicationService } from './services/deduplication.service';
import { HealthMonitoringService } from './services/health-monitoring.service';
import { NormalizerService } from './services/normalizer.service';

@Module({
  imports: [forwardRef(() => QueuesModule)],
  controllers: [ScrapersController],
  providers: [
    GreenhouseAdapter,
    LeverAdapter,
    AshbyAdapter,
    SmartRecruitersAdapter,
    WorkdayAdapter,
    GenericHtmlAdapter,
    ScraperManager,
    NormalizerService,
    DeduplicationService,
    HealthMonitoringService,
  ],
  exports: [ScraperManager, NormalizerService, DeduplicationService, HealthMonitoringService],
})
export class ScrapersModule {}
