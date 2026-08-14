import { Module } from '@nestjs/common';

import { AiModule } from '../ai/ai.module';
import { MatchingModule } from '../matching/matching.module';
import { NlpModule } from '../nlp/nlp.module';
import { PrismaModule } from '../prisma/prisma.module';

import { CareerDashboardController } from './controllers/career-dashboard.controller';
import { CareerGoalsController } from './controllers/career-goals.controller';
import { MockInterviewController } from './controllers/mock-interview.controller';
import { PreparationPlanController } from './controllers/preparation-plan.controller';
import { ApplicationFollowUpService } from './services/application-follow-up.service';
import { CareerGoalsService } from './services/career-goals.service';
import { MockInterviewService } from './services/mock-interview.service';
import { PreparationPlanService } from './services/preparation-plan.service';
import { ReadinessScoreService } from './services/readiness-score.service';
import { SkillGapPrioritizationService } from './services/skill-gap-prioritization.service';

@Module({
  imports: [PrismaModule, AiModule, NlpModule, MatchingModule],
  controllers: [
    CareerGoalsController,
    PreparationPlanController,
    MockInterviewController,
    CareerDashboardController,
  ],
  providers: [
    CareerGoalsService,
    ReadinessScoreService,
    SkillGapPrioritizationService,
    PreparationPlanService,
    MockInterviewService,
    ApplicationFollowUpService,
  ],
  exports: [CareerGoalsService, ReadinessScoreService, PreparationPlanService],
})
export class PreparationModule {}
