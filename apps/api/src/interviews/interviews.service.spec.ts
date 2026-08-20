import { Test, TestingModule } from '@nestjs/testing';

import { AiService } from '../ai/services/ai.service';
import { PrismaService } from '../prisma/prisma.service';

import { InterviewsService } from './interviews.service';
import { InterviewEvaluationService } from './services/interview-evaluation.service';
import { InterviewQuestionEngineService } from './services/interview-question-engine.service';
import { InterviewReadinessService } from './services/interview-readiness.service';
import { InterviewSyncService } from './services/interview-sync.service';
import { InterviewWorkspaceService } from './services/interview-workspace.service';

describe('InterviewsService', () => {
  let service: InterviewsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InterviewsService,
        { provide: PrismaService, useValue: {} },
        { provide: AiService, useValue: {} },
        { provide: InterviewWorkspaceService, useValue: {} },
        { provide: InterviewQuestionEngineService, useValue: {} },
        { provide: InterviewEvaluationService, useValue: {} },
        { provide: InterviewReadinessService, useValue: {} },
        { provide: InterviewSyncService, useValue: {} },
      ],
    }).compile();

    service = module.get<InterviewsService>(InterviewsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
