import { BullModule } from '@nestjs/bullmq';
import { Module, forwardRef } from '@nestjs/common';

import { AiModule } from '../ai/ai.module';
import { MarketModule } from '../market/market.module';
import { MatchingModule } from '../matching/matching.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CAREER_CENTER_QUEUE } from '../queues/queue.constants';

import { CareerAgentController } from './controllers/career-agent.controller';
import { CareerAiController } from './controllers/career-ai.controller';
import { CareerCenterController } from './controllers/career-center.controller';
import { CareerController } from './controllers/career.controller';
import { CareerCenterProcessor } from './processors/career-center.processor';
import { ActionOrchestrationService } from './services/action-orchestration.service';
import { CareerCenterAiService } from './services/career-center-ai.service';
import { CareerCenterService } from './services/career-center.service';
import { CareerEventsService } from './services/career-events.service';
import { CareerSchedulerService } from './services/career-scheduler.service';
import { CareerStrategyService } from './services/career-strategy.service';
import { CommandCenterService } from './services/command-center.service';
import { EventProcessingService } from './services/event-processing.service';
import { ReadinessCalculatorService } from './services/readiness-calculator.service';
import { TimelineAggregationService } from './services/timeline-aggregation.service';

@Module({
  imports: [
    PrismaModule,
    AiModule,
    forwardRef(() => MatchingModule),
    MarketModule,
    NotificationsModule,
    BullModule.registerQueue({ name: CAREER_CENTER_QUEUE }),
  ],
  controllers: [
    CareerCenterController,
    CareerAiController,
    CareerController,
    CareerAgentController,
  ],
  providers: [
    CareerCenterService,
    CareerStrategyService,
    ActionOrchestrationService,
    ReadinessCalculatorService,
    TimelineAggregationService,
    CareerCenterAiService,
    CareerCenterProcessor,
    CommandCenterService,
    CareerEventsService,
    EventProcessingService,
    CareerSchedulerService,
  ],
  exports: [
    CareerCenterService,
    CareerStrategyService,
    ActionOrchestrationService,
    ReadinessCalculatorService,
    TimelineAggregationService,
    CareerCenterAiService,
    CommandCenterService,
    CareerEventsService,
    EventProcessingService,
  ],
})
export class CareerCenterModule {}
