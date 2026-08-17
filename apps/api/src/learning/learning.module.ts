import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { AiModule } from '../ai/ai.module';
import { PrismaModule } from '../prisma/prisma.module';
import { LEARNING_QUEUE } from '../queues/queue.constants';

// Services
import { AdminLearningController } from './controllers/admin-learning.controller';
import { LearningController } from './controllers/learning.controller';
import { LearningProcessor } from './processors/learning.processor';
import { LearningCoachService } from './services/learning-coach.service';
import { PracticeService } from './services/practice.service';
import { PrerequisiteService } from './services/prerequisite.service';
import { RoadmapGenerationService } from './services/roadmap-generation.service';
import { SkillMasteryService } from './services/skill-mastery.service';

// Controllers

// Background Job Processors

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
    LearningProcessor,
  ],
  exports: [
    PrerequisiteService,
    RoadmapGenerationService,
    PracticeService,
    SkillMasteryService,
    LearningCoachService,
  ],
})
export class LearningModule {}
