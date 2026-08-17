import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { AiModule } from '../ai/ai.module';
import { MatchingModule } from '../matching/matching.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CAREER_CENTER_QUEUE } from '../queues/queue.constants';

import { CareerAiController } from './controllers/career-ai.controller';
import { CareerCenterController } from './controllers/career-center.controller';
import { CareerCenterProcessor } from './processors/career-center.processor';
import { ActionOrchestrationService } from './services/action-orchestration.service';
import { CareerCenterAiService } from './services/career-center-ai.service';
import { CareerCenterService } from './services/career-center.service';
import { ReadinessCalculatorService } from './services/readiness-calculator.service';
import { TimelineAggregationService } from './services/timeline-aggregation.service';

@Module({
  imports: [
    PrismaModule,
    AiModule,
    MatchingModule,
    BullModule.registerQueue({ name: CAREER_CENTER_QUEUE }),
  ],
  controllers: [CareerCenterController, CareerAiController],
  providers: [
    CareerCenterService,
    ActionOrchestrationService,
    ReadinessCalculatorService,
    TimelineAggregationService,
    CareerCenterAiService,
    CareerCenterProcessor,
  ],
  exports: [
    CareerCenterService,
    ActionOrchestrationService,
    ReadinessCalculatorService,
    TimelineAggregationService,
    CareerCenterAiService,
  ],
})
export class CareerCenterModule {}
