import { Module } from '@nestjs/common';

import { AiModule } from '../ai/ai.module';
import { PrismaModule } from '../prisma/prisma.module';

import { ExecutionController } from './controllers/execution.controller';
import { ActionDecompositionService } from './services/action-decomposition.service';
import { AdaptiveReplanningService } from './services/adaptive-replanning.service';
import { CareerSprintService } from './services/career-sprint.service';
import { DeadlineIntelligenceService } from './services/deadline-intelligence.service';
import { DependencyEngineService } from './services/dependency-engine.service';
import { ExecutionAiService } from './services/execution-ai.service';
import { ExecutionEngineService } from './services/execution-engine.service';
import { FocusSessionService } from './services/focus-session.service';
import { NextBestActionService } from './services/next-best-action.service';
import { StopDeprioritizeService } from './services/stop-deprioritize.service';
import { UnifiedActionAggregatorService } from './services/unified-action-aggregator.service';
import { WeeklyReviewService } from './services/weekly-review.service';
import { WorkloadIntelligenceService } from './services/workload-intelligence.service';

@Module({
  imports: [PrismaModule, AiModule],
  controllers: [ExecutionController],
  providers: [
    UnifiedActionAggregatorService,
    DependencyEngineService,
    DeadlineIntelligenceService,
    WorkloadIntelligenceService,
    NextBestActionService,
    ActionDecompositionService,
    StopDeprioritizeService,
    ExecutionAiService,
    ExecutionEngineService,
    CareerSprintService,
    FocusSessionService,
    WeeklyReviewService,
    AdaptiveReplanningService,
  ],
  exports: [
    ExecutionEngineService,
    CareerSprintService,
    FocusSessionService,
    WeeklyReviewService,
    AdaptiveReplanningService,
  ],
})
export class ExecutionModule {}
