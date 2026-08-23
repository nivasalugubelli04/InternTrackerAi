/**
 * OutcomesModule — Phase 24
 *
 * Career Outcomes, Placement Intelligence & Workforce Analytics.
 *
 * Architecture:
 *  - All services are read-only against Phases 0–23 data.
 *  - OutcomeSnapshot table is the only write target from background jobs.
 *  - API endpoints read from snapshots — never scan raw event tables live.
 *  - Privacy enforcement via OutcomePrivacyService (cohort-size guard).
 *  - BullMQ background jobs compute all expensive aggregations.
 */
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { AiModule } from '../ai/ai.module';
import { PrismaModule } from '../prisma/prisma.module';
import { OUTCOME_AGGREGATION_QUEUE } from '../queues/queue.constants';

import { AdminOutcomeController } from './controllers/admin-outcome.controller';
import { AnalyticsController } from './controllers/analytics.controller';
import { OrgOutcomeController } from './controllers/org-outcome.controller';
import { RecruiterOutcomeController } from './controllers/recruiter-outcome.controller';
import { UserOutcomeController } from './controllers/user-outcome.controller';
import { OutcomeAggregationProcessor } from './processors/outcome-aggregation.processor';
import { OutcomeSchedulerService } from './schedulers/outcome-scheduler.service';
import { AdminOutcomeService } from './services/admin-outcome.service';
import { CareerAnalyticsService } from './services/career-analytics.service';
import { OrgOutcomeService } from './services/org-outcome.service';
import { OutcomeAggregationService } from './services/outcome-aggregation.service';
import { OutcomeBenchmarkService } from './services/outcome-benchmark.service';
import { OutcomeCompanyService } from './services/outcome-company.service';
import { OutcomeDataQualityService } from './services/outcome-data-quality.service';
import { OutcomeExportService } from './services/outcome-export.service';
import { OutcomeInsightService } from './services/outcome-insight.service';
import { OutcomeLocationService } from './services/outcome-location.service';
import { OutcomePrivacyService } from './services/outcome-privacy.service';
import { OutcomeRoleService } from './services/outcome-role.service';
import { OutcomeSkillService } from './services/outcome-skill.service';
import { OutcomeSnapshotService } from './services/outcome-snapshot.service';
import { OutcomeTimeToStageService } from './services/outcome-time-to-stage.service';
import { RecruiterOutcomeService } from './services/recruiter-outcome.service';

@Module({
  imports: [
    PrismaModule,
    AiModule,
    ScheduleModule.forRoot(),
    BullModule.registerQueue({ name: OUTCOME_AGGREGATION_QUEUE }),
  ],
  controllers: [
    UserOutcomeController,
    OrgOutcomeController,
    RecruiterOutcomeController,
    AdminOutcomeController,
    AnalyticsController,
  ],
  providers: [
    // Core calculation services
    OutcomeAggregationService,
    OutcomeTimeToStageService,
    OutcomePrivacyService,
    OutcomeSnapshotService,
    OutcomeDataQualityService,
    OutcomeBenchmarkService,
    // Dimension-specific services
    OutcomeRoleService,
    OutcomeSkillService,
    OutcomeCompanyService,
    OutcomeLocationService,
    // Stakeholder-specific services
    OrgOutcomeService,
    RecruiterOutcomeService,
    AdminOutcomeService,
    // AI + Export
    OutcomeInsightService,
    OutcomeExportService,
    CareerAnalyticsService,
    // Background processing
    OutcomeAggregationProcessor,
    OutcomeSchedulerService,
  ],
  exports: [
    OutcomeAggregationService,
    OutcomePrivacyService,
    OutcomeSnapshotService,
    AdminOutcomeService,
    CareerAnalyticsService,
  ],
})
export class OutcomesModule {}
