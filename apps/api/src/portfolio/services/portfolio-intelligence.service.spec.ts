import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { AiService } from '../../ai/services/ai.service';
import { CareerEventsService } from '../../career-center/services/career-events.service';
import { PrismaService } from '../../prisma/prisma.service';

import { EvidenceGraphService } from './evidence-graph.service';
import { PortfolioIntelligenceService } from './portfolio-intelligence.service';
import { ProjectAnalysisService } from './project-analysis.service';

describe('PortfolioIntelligence & Evidence Services', () => {
  let evidenceGraphService: EvidenceGraphService;
  let projectAnalysisService: ProjectAnalysisService;
  let intelligenceService: PortfolioIntelligenceService;

  const mockPrisma = {
    userSkill: {
      findMany: jest.fn().mockResolvedValue([
        {
          userId: 'user-id-123',
          skillId: 'skill-id-typescript',
          proficiency: 'INTERMEDIATE',
          confidenceScore: 0.5,
          addedAt: new Date(),
          skill: {
            id: 'skill-id-typescript',
            name: 'TypeScript',
            category: 'LANGUAGES',
          },
        },
      ]),
      update: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue({}),
      findUnique: jest.fn().mockResolvedValue(null),
    },
    skillEvidence: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'evidence-1',
          userId: 'user-id-123',
          skillId: 'skill-id-typescript',
          evidenceType: 'PROJECT',
          referenceId: 'proj-1',
          score: 100,
          description: 'Built a typescript backend system.',
          createdAt: new Date(),
        },
      ]),
      upsert: jest.fn().mockResolvedValue({}),
    },
    portfolio: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'port-1',
        userId: 'user-id-123',
        contentJson: {
          projects: [
            {
              id: 'proj-1',
              title: 'InternTracker API',
              description: 'TypeScript backend implementation.',
              technologies: ['TypeScript', 'Node.js'],
            },
          ],
        },
      }),
    },
    careerPreference: {
      findUnique: jest.fn().mockResolvedValue({
        userId: 'user-id-123',
        preferredRoles: ['Software Engineer'],
      }),
    },
    resume: {
      findFirst: jest.fn().mockResolvedValue({
        summary: 'Experienced software engineer',
      }),
    },
    projectAnalysis: {
      upsert: jest.fn().mockResolvedValue({}),
    },
    portfolioAssessment: {
      upsert: jest.fn().mockResolvedValue({}),
    },
    brandInsight: {
      upsert: jest.fn().mockResolvedValue({}),
    },
    skill: {
      findMany: jest.fn().mockResolvedValue([{ id: 'skill-id-typescript', name: 'TypeScript' }]),
    },
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue({ enabled: false }),
  };

  const mockAiService = {
    aiProvider: {
      generateStructuredOutput: jest.fn(),
    },
  };

  const mockCareerEventsService = {
    publish: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvidenceGraphService,
        ProjectAnalysisService,
        PortfolioIntelligenceService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AiService, useValue: mockAiService },
        { provide: CareerEventsService, useValue: mockCareerEventsService },
      ],
    }).compile();

    evidenceGraphService = module.get<EvidenceGraphService>(EvidenceGraphService);
    projectAnalysisService = module.get<ProjectAnalysisService>(ProjectAnalysisService);
    intelligenceService = module.get<PortfolioIntelligenceService>(PortfolioIntelligenceService);
  });

  it('should generate evidence graph successfully', async () => {
    const graph = await evidenceGraphService.getEvidenceGraph('user-id-123');
    expect(graph).toBeDefined();
    expect(graph.length).toBe(1);
    expect(graph[0]?.skillName).toBe('TypeScript');
    expect(graph[0]?.strengthLevel).toBe('PROJECT');
  });

  it('should analyze project using deterministic fallback and return gaps/recs', async () => {
    const analysis = await projectAnalysisService.analyzeProject('user-id-123', 'proj-1');
    expect(analysis).toBeDefined();
    expect(mockPrisma.projectAnalysis.upsert).toHaveBeenCalled();
  });

  it('should compute portfolio health and alignment correctly', async () => {
    const res = await intelligenceService.getPortfolioIntelligence('user-id-123');
    expect(res).toBeDefined();
    expect(res.health.overallScore).toBeGreaterThan(0);
    expect(res.alignment.targetRole).toBe('Software Engineer');
  });
});
