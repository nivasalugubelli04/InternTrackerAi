import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { AI_PROVIDER_TOKEN } from '../../ai/providers/ai-provider.interface';
import { AiService } from '../../ai/services/ai.service';
import { CareerEventsService } from '../../career-center/services/career-events.service';
import { KeywordNormalizerService } from '../../matching/services/keyword-normalizer.service';
import { EvidenceGraphService } from '../../portfolio/services/evidence-graph.service';
import { PrismaService } from '../../prisma/prisma.service';

import { ApplicationOptimizationService } from './application-optimization.service';
import { ReadinessScoreService } from './readiness-score.service';

describe('ApplicationOptimizationService', () => {
  let service: ApplicationOptimizationService;
  let prisma: any;
  let aiProvider: any;
  let evidenceGraph: any;

  const mockPrisma = {
    jobPosting: {
      findUnique: jest.fn(),
    },
    opportunityIntelligenceProfile: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    opportunityRequirement: {
      create: jest.fn(),
    },
    application: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    applicationAlignment: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
    applicationEvidenceMatch: {
      deleteMany: jest.fn(),
      create: jest.fn(),
    },
    projectAnalysis: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    userSkill: {
      count: jest.fn(),
    },
    applicationPreparationPlan: {
      upsert: jest.fn(),
    },
    careerAction: {
      create: jest.fn(),
    },
    resumeDocument: {
      findFirst: jest.fn(),
    },
    resumeTailoringDraft: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    resumeVersion: {
      create: jest.fn(),
    },
    opportunityProjectSelection: {
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
    applicationChecklist: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    applicationContextSnapshot: {
      upsert: jest.fn(),
    },
  };

  const mockAiProvider = {
    generateStructuredOutput: jest.fn(),
    generateText: jest.fn(),
  };

  const mockAiService = {};

  const mockEvidenceGraph = {
    getEvidenceGraph: jest.fn().mockResolvedValue([]),
  };

  const mockKeywordNormalizer = {
    extractKeywordsFromText: jest.fn().mockReturnValue([]),
    normalizeKeyword: jest.fn((k) => k),
    normalizeKeywords: jest.fn((k) => k),
  };

  const mockCareerEvents = {
    publish: jest.fn().mockResolvedValue(undefined),
  };

  const mockReadinessScore = {
    calculateReadinessScore: jest.fn().mockResolvedValue({
      overallReadiness: 75,
      skillsReadiness: 70,
      resumeReadiness: 80,
      technicalReadiness: 60,
      behavioralReadiness: 80,
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationOptimizationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AI_PROVIDER_TOKEN, useValue: mockAiProvider },
        { provide: AiService, useValue: mockAiService },
        { provide: EvidenceGraphService, useValue: mockEvidenceGraph },
        { provide: KeywordNormalizerService, useValue: mockKeywordNormalizer },
        { provide: CareerEventsService, useValue: mockCareerEvents },
        { provide: ReadinessScoreService, useValue: mockReadinessScore },
      ],
    }).compile();

    service = module.get<ApplicationOptimizationService>(ApplicationOptimizationService);
    prisma = module.get<PrismaService>(PrismaService);
    aiProvider = module.get(AI_PROVIDER_TOKEN);
    evidenceGraph = module.get<EvidenceGraphService>(EvidenceGraphService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('analyzeOpportunity', () => {
    it('should throw NotFoundException if job does not exist', async () => {
      prisma.jobPosting.findUnique.mockResolvedValue(null);
      await expect(service.analyzeOpportunity('job-123')).rejects.toThrow(NotFoundException);
    });

    it('should return profile if already analyzed', async () => {
      const existingProfile = { id: 'prof-123', jobId: 'job-123' };
      prisma.jobPosting.findUnique.mockResolvedValue({
        id: 'job-123',
        intelligenceProfile: existingProfile,
      });
      prisma.opportunityIntelligenceProfile.findUnique.mockResolvedValue(existingProfile);

      const result = await service.analyzeOpportunity('job-123');
      expect(result).toEqual(existingProfile);
    });

    it('should extract and save requirements using AI', async () => {
      const mockJob = {
        id: 'job-123',
        title: 'Software Intern',
        company: { name: 'Acme Corp' },
        description: 'Need Python and SQL',
        requirements: ['Python', 'SQL'],
        responsibilities: [],
        intelligenceProfile: null,
      };

      prisma.jobPosting.findUnique.mockResolvedValue(mockJob);
      aiProvider.generateStructuredOutput.mockResolvedValue({
        requirements: [
          { name: 'Python', type: 'SKILL', classification: 'REQUIRED', sourceText: 'Need Python' },
        ],
      });

      const mockProfile = { id: 'prof-123', jobId: 'job-123' };
      prisma.opportunityIntelligenceProfile.create.mockResolvedValue(mockProfile);
      prisma.opportunityIntelligenceProfile.findUnique.mockResolvedValue({
        ...mockProfile,
        requirements: [],
      });

      await service.analyzeOpportunity('job-123');

      expect(prisma.opportunityIntelligenceProfile.create).toHaveBeenCalled();
      expect(prisma.opportunityRequirement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Python',
            type: 'SKILL',
          }),
        }),
      );
    });
  });

  describe('getOrCreateAlignment', () => {
    it('should compute match scores, alignment levels and quick wins', async () => {
      const mockApp = { id: 'app-123', userId: 'user-123', jobId: 'job-123', status: 'SAVED' };
      prisma.application.findUnique.mockResolvedValue(mockApp);

      const mockIntelProfile = {
        id: 'prof-123',
        requirements: [
          {
            id: 'req-1',
            name: 'Python',
            normalizedName: 'Python',
            type: 'SKILL',
            classification: 'REQUIRED',
          },
        ],
      };
      prisma.opportunityIntelligenceProfile.findUnique.mockResolvedValue(mockIntelProfile);

      evidenceGraph.getEvidenceGraph.mockResolvedValue([
        {
          skillName: 'Python',
          strengthLevel: 'PROJECT',
          confidenceScore: 0.8,
          explanation: 'Decent project work',
          nodes: [{ title: 'Python project', evidenceType: 'PROJECT', date: new Date() }],
        },
      ]);

      prisma.projectAnalysis.count.mockResolvedValue(2);
      prisma.userSkill.count.mockResolvedValue(3);

      const mockAlignment = { id: 'align-123', overallAlignment: 78 };
      prisma.applicationAlignment.upsert.mockResolvedValue(mockAlignment);

      const result = await service.getOrCreateAlignment('user-123', 'job-123');

      expect(result.alignment).toEqual(mockAlignment);
      expect(prisma.applicationEvidenceMatch.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            matchType: 'DEMONSTRATED_MATCH',
          }),
        }),
      );
    });
  });
});
