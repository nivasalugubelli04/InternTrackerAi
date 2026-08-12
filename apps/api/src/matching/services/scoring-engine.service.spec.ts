import { ConfigService } from '@nestjs/config';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { RecommendationPriority, RecommendationType } from '@prisma/client';

import { MATCHING_PROVIDER } from '../providers/matching-provider.interface';

import { ScoringEngineService } from './scoring-engine.service';

describe('ScoringEngineService', () => {
  let service: ScoringEngineService;

  const mockProvider = {
    calculateMatch: jest.fn(),
  };

  const mockConfig = {
    thresholds: {
      perfectMatch: 90,
      strongMatch: 80,
      goodMatch: 70,
      explore: 50,
    },
    priorityThresholds: {
      high: 80,
      medium: 60,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScoringEngineService,
        {
          provide: MATCHING_PROVIDER,
          useValue: mockProvider,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'matching.thresholds') return mockConfig.thresholds;
              if (key === 'matching.priorityThresholds') return mockConfig.priorityThresholds;
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<ScoringEngineService>(ScoringEngineService);
  });

  it('should classify score >= 90 as PERFECT_MATCH and HIGH priority', async () => {
    mockProvider.calculateMatch.mockResolvedValueOnce({
      overallScore: 92,
      skillScore: 95,
      educationScore: 90,
      locationScore: 85,
      cgpaScore: 100,
      companyPreferenceScore: 100,
      stipendScore: 100,
      experienceScore: 90,
      confidenceScore: 100,
      reasons: [],
    });

    const result = await service.evaluateMatch({} as any, {} as any);

    expect(result.overallScore).toBe(92);
    expect(result.recommendationType).toBe(RecommendationType.PERFECT_MATCH);
    expect(result.priority).toBe(RecommendationPriority.HIGH);
  });

  it('should classify score 85 as STRONG_MATCH and HIGH priority', async () => {
    mockProvider.calculateMatch.mockResolvedValueOnce({
      overallScore: 85,
      skillScore: 80,
      educationScore: 85,
      locationScore: 80,
      cgpaScore: 90,
      companyPreferenceScore: 50,
      stipendScore: 100,
      experienceScore: 80,
      confidenceScore: 90,
      reasons: [],
    });

    const result = await service.evaluateMatch({} as any, {} as any);

    expect(result.recommendationType).toBe(RecommendationType.STRONG_MATCH);
    expect(result.priority).toBe(RecommendationPriority.HIGH);
  });
});
