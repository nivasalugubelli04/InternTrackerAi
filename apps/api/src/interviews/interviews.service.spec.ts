import { Test, TestingModule } from '@nestjs/testing';

import { AiService } from '../ai/services/ai.service';
import { PrismaService } from '../prisma/prisma.service';

import { InterviewsService } from './interviews.service';

describe('InterviewsService', () => {
  let service: InterviewsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InterviewsService,
        { provide: PrismaService, useValue: {} },
        { provide: AiService, useValue: {} },
      ],
    }).compile();

    service = module.get<InterviewsService>(InterviewsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
