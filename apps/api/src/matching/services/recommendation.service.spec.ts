import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { RecommendationPriority, RecommendationType } from '@prisma/client';

import { CareerEventsService } from '../../career-center/services/career-events.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

import { JobAnalyzerService } from './job-analyzer.service';
import { ProfileAnalyzerService } from './profile-analyzer.service';
import { RecommendationService } from './recommendation.service';
import { ScoringEngineService } from './scoring-engine.service';
import { SemanticMatchingService } from './semantic-matching.service';

describe('RecommendationService', () => {
  let service: RecommendationService;

  const mockCareerEvents = {
    publish: jest.fn().mockResolvedValue(undefined),
    emitRecommendationGenerated: jest.fn(),
    emitEvent: jest.fn(),
  };

  const mockSemanticMatching = {
    computeHybridScore: jest.fn().mockReturnValue(75),
    computeSemanticScore: jest.fn().mockResolvedValue(80),
  };

  const mockPrisma = {
    jobPosting: { findMany: jest.fn(), findUnique: jest.fn() },
    matchScore: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    recommendation: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    recommendationReason: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      createMany: jest.fn(),
    },
  };

  const mockRedisClient = {
    get: jest.fn(),
    set: jest.fn(),
    keys: jest.fn().mockResolvedValue([]),
    del: jest.fn(),
  };

  const mockRedis = {
    getClient: jest.fn().mockReturnValue(mockRedisClient),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockProfileAnalyzer = {
    normalizeProfileData: jest.fn(),
    analyzeProfile: jest.fn(),
  };

  const mockJobAnalyzer = {
    normalizeJobData: jest.fn(),
    analyzeJob: jest.fn(),
  };

  const mockScoringEngine = {
    evaluateMatch: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: ProfileAnalyzerService, useValue: mockProfileAnalyzer },
        { provide: JobAnalyzerService, useValue: mockJobAnalyzer },
        { provide: ScoringEngineService, useValue: mockScoringEngine },
        { provide: SemanticMatchingService, useValue: mockSemanticMatching },
        { provide: CareerEventsService, useValue: mockCareerEvents },
      ],
    }).compile();

    service = module.get<RecommendationService>(RecommendationService);
  });

  it('should run matching pipeline for a user and store recommendations', async () => {
    mockProfileAnalyzer.analyzeProfile.mockResolvedValueOnce({
      userId: 'user-123',
      skills: ['Java'],
    });

    mockPrisma.jobPosting.findMany.mockResolvedValueOnce([
      { id: 'job-1', title: 'Software Engineer', companyId: 'comp-1', company: { name: 'Google' } },
    ]);

    mockJobAnalyzer.normalizeJobData.mockReturnValueOnce({
      jobId: 'job-1',
      title: 'Software Engineer',
      companyId: 'comp-1',
      companyName: 'Google',
    });

    mockScoringEngine.evaluateMatch.mockResolvedValueOnce({
      overallScore: 95,
      skillScore: 90,
      educationScore: 90,
      locationScore: 90,
      cgpaScore: 100,
      companyPreferenceScore: 100,
      stipendScore: 100,
      experienceScore: 100,
      confidenceScore: 100,
      recommendationType: RecommendationType.PERFECT_MATCH,
      priority: RecommendationPriority.HIGH,
      reasons: [{ reasonType: 'SKILL', description: 'Java matched', weight: 90 }],
      isEligible: true,
    });

    mockPrisma.matchScore.upsert.mockResolvedValueOnce({ id: 'ms-1' });
    mockPrisma.recommendation.upsert.mockResolvedValueOnce({ id: 'rec-1' });
    mockPrisma.recommendationReason.deleteMany.mockResolvedValueOnce({ count: 0 });
    mockPrisma.recommendationReason.createMany.mockResolvedValueOnce({ count: 1 });

    const res = await service.runMatchingForUser('user-123');

    expect(res.userId).toBe('user-123');
    expect(res.totalJobsEvaluated).toBe(1);
    expect(res.recommendationsCount).toBe(1);
    expect(res.highestScore).toBe(89);
    expect(mockPrisma.matchScore.upsert).toHaveBeenCalled();
    expect(mockPrisma.recommendation.upsert).toHaveBeenCalled();
  });
});
