import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';

import { CompanyTrackService } from './company-track.service';

describe('CompanyTrackService', () => {
  let service: CompanyTrackService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyTrackService,
        {
          provide: PrismaService,
          useValue: {
            trackedCompany: {
              findMany: jest.fn(),
              create: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<CompanyTrackService>(CompanyTrackService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
