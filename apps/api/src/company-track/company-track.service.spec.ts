import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { EntitlementService } from '../billing/services/entitlement.service';
import { EngagementTrackerService } from '../engagement/services/engagement-tracker.service';
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
        {
          provide: EntitlementService,
          useValue: {
            enforceUsage: jest.fn().mockResolvedValue(undefined),
            canUse: jest.fn().mockResolvedValue(true),
            isPremium: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: EngagementTrackerService,
          useValue: {
            trackAction: jest.fn().mockResolvedValue(undefined),
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
