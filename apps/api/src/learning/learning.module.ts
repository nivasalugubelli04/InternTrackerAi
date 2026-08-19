import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { AiModule } from '../ai/ai.module';
import { PrismaModule } from '../prisma/prisma.module';
import { LEARNING_QUEUE } from '../queues/queue.constants';

import { AdminLearningController } from './controllers/admin-learning.controller';
import { LearningController } from './controllers/learning.controller';
import { LearningProcessor } from './processors/learning.processor';
import { AdaptiveRoadmapService } from './services/adaptive-roadmap.service';
import { CareerReadinessService } from './services/career-readiness.service';
import { DailyPlanService } from './services/daily-plan.service';
import { LearningCoachService } from './services/learning-coach.service';
import { LearningSyncService } from './services/learning-sync.service';
import { PracticeService } from './services/practice.service';
import { PrerequisiteService } from './services/prerequisite.service';
import { ProjectRecommendationService } from './services/project-recommendation.service';
import { RoadmapGenerationService } from './services/roadmap-generation.service';
import { SkillGapEngineService } from './services/skill-gap-engine.service';
import { SkillMasteryService } from './services/skill-mastery.service';

@Module({
  imports: [
    PrismaModule,
    AiModule,
    BullModule.registerQueue({
      name: LEARNING_QUEUE,
    }),
  ],
  controllers: [LearningController, AdminLearningController],
  providers: [
    PrerequisiteService,
    RoadmapGenerationService,
    PracticeService,
    SkillMasteryService,
    LearningCoachService,
    SkillGapEngineService,
    AdaptiveRoadmapService,
    CareerReadinessService,
    DailyPlanService,
    ProjectRecommendationService,
    LearningSyncService,
    LearningProcessor,
  ],
  exports: [
    PrerequisiteService,
    RoadmapGenerationService,
    PracticeService,
    SkillMasteryService,
    LearningCoachService,
    SkillGapEngineService,
    AdaptiveRoadmapService,
    CareerReadinessService,
    DailyPlanService,
    ProjectRecommendationService,
    LearningSyncService,
  ],
})
export class LearningModule {}
