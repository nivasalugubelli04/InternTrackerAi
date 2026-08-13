import { Test, TestingModule } from '@nestjs/testing';

import { AiService } from '../ai/services/ai.service';
import { PrismaService } from '../prisma/prisma.service';

import { ResumeBuilderService } from './resume-builder.service';

describe('ResumeBuilderService', () => {
  let service: ResumeBuilderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResumeBuilderService,
        { provide: PrismaService, useValue: {} },
        { provide: AiService, useValue: {} },
      ],
    }).compile();

    service = module.get<ResumeBuilderService>(ResumeBuilderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
