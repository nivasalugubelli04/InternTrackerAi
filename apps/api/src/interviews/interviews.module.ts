import { Module } from '@nestjs/common';

import { AiModule } from '../ai/ai.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';

import { InterviewsController } from './interviews.controller';
import { InterviewsService } from './interviews.service';
import { InterviewEvaluationService } from './services/interview-evaluation.service';
import { InterviewQuestionEngineService } from './services/interview-question-engine.service';
import { InterviewReadinessService } from './services/interview-readiness.service';
import { InterviewSyncService } from './services/interview-sync.service';
import { InterviewWorkspaceService } from './services/interview-workspace.service';

@Module({
  imports: [PrismaModule, AiModule, NotificationsModule],
  providers: [
    InterviewsService,
    InterviewWorkspaceService,
    InterviewQuestionEngineService,
    InterviewEvaluationService,
    InterviewReadinessService,
    InterviewSyncService,
  ],
  controllers: [InterviewsController],
  exports: [
    InterviewsService,
    InterviewWorkspaceService,
    InterviewQuestionEngineService,
    InterviewEvaluationService,
    InterviewReadinessService,
    InterviewSyncService,
  ],
})
export class InterviewsModule {}
