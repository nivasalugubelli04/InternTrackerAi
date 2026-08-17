import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SkillRelationType, RoleSkillRequirement } from '@prisma/client';

import { AIProvider, AI_PROVIDER_TOKEN } from '../ai/providers/ai-provider.interface';
import { SkillDemandService } from '../market/services/skill-demand.service';
import { PrismaService } from '../prisma/prisma.service';

import { CareerPathService } from './services/career-path.service';
import { CareerRecommendationService } from './services/career-recommendation.service';
import { RoleTaxonomyService } from './services/role-taxonomy.service';
import { SkillGraphService } from './services/skill-graph.service';
import { TalentIntelligenceService } from './services/talent-intelligence.service';

describe('Phase 25 — Skill Graph, Talent & Career path Intelligence unit tests', () => {
  let skillGraphService: SkillGraphService;
  let roleTaxonomyService: RoleTaxonomyService;
  let careerPathService: CareerPathService;
  let talentIntelligenceService: TalentIntelligenceService;
  let careerRecommendationService: CareerRecommendationService;

  // Mock Prisma Service
  const mockPrismaService = {
    skill: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    skillRelationship: {
      findMany: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    role: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    roleSkill: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    careerPath: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    careerPathStep: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    careerPathSkill: {
      upsert: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    userSkill: {
      findMany: jest.fn(),
    },
    careerRecommendation: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  // Mock SkillDemandService
  const mockSkillDemandService = {
    getSkillDemandAnalysis: jest.fn().mockResolvedValue({
      topDemandedSkills: [
        {
          skill: 'React',
          count: 120,
          percentage: 80,
          growthRate: 5.5,
          sampleSize: 150,
          hasSufficientData: true,
        },
        {
          skill: 'PostgreSQL',
          count: 90,
          percentage: 60,
          growthRate: 3.2,
          sampleSize: 150,
          hasSufficientData: true,
        },
      ],
      fastestGrowingSkills: [],
      topSkillCombinations: [],
    }),
  };

  // Mock AIProvider
  const mockAIProvider: jest.Mocked<AIProvider> = {
    generateText: jest.fn().mockResolvedValue({
      text: JSON.stringify({
        summary:
          'Candidates targeting a Backend Engineer role usually start with a foundation of Java and database systems.',
        nextSteps: ['Learn Spring Boot', 'Practice Docker fundamentals', 'Build a SQL project'],
      }),
    } as any),
    generateStructuredOutput: jest.fn(),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SkillGraphService,
        RoleTaxonomyService,
        CareerPathService,
        TalentIntelligenceService,
        CareerRecommendationService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: SkillDemandService, useValue: mockSkillDemandService },
        { provide: AI_PROVIDER_TOKEN, useValue: mockAIProvider },
      ],
    }).compile();

    skillGraphService = module.get<SkillGraphService>(SkillGraphService);
    roleTaxonomyService = module.get<RoleTaxonomyService>(RoleTaxonomyService);
    careerPathService = module.get<CareerPathService>(CareerPathService);
    talentIntelligenceService = module.get<TalentIntelligenceService>(TalentIntelligenceService);
    careerRecommendationService = module.get<CareerRecommendationService>(
      CareerRecommendationService,
    );

    jest.clearAllMocks();
  });

  describe('SkillGraphService — Circular Precedence Check', () => {
    it('should throw BadRequestException if creating a self-referencing relationship', async () => {
      await expect(
        skillGraphService.addRelationship('skill-a', 'skill-a', SkillRelationType.PRECEDES),
      ).rejects.toThrow(BadRequestException);
    });

    it('should detect a circular precedence dependency', async () => {
      // Setup mock: skill-b PRECEDES skill-a
      mockPrismaService.skillRelationship.findMany.mockResolvedValueOnce([
        { fromSkillId: 'skill-b', toSkillId: 'skill-a', relationType: SkillRelationType.PRECEDES },
      ]);

      // Attempt to add: skill-a PRECEDES skill-b (which creates circle skill-b -> skill-a -> skill-b)
      await expect(
        skillGraphService.addRelationship('skill-a', 'skill-b', SkillRelationType.PRECEDES),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('RoleTaxonomyService — Inherited Skills Traversal', () => {
    it('should correctly traverse parent role hierarchies to resolve inherited requirements', async () => {
      // Mock hierarchy: Backend Engineer (role-b) parent is Software Engineer (role-a)
      // role-a requires Java
      // role-b requires Spring Boot
      mockPrismaService.role.findUnique
        // Call 1 for role-b (Backend)
        .mockResolvedValueOnce({
          id: 'role-b',
          name: 'Backend Engineer',
          parentId: 'role-a',
          roleSkills: [
            {
              skillId: 'skill-spring',
              requirement: RoleSkillRequirement.REQUIRED,
              importance: 'HIGH',
              weight: 1.0,
              skill: { name: 'Spring Boot' },
            },
          ],
        })
        // Call 2 for role-a (SWE)
        .mockResolvedValueOnce({
          id: 'role-a',
          name: 'Software Engineer',
          parentId: null,
          roleSkills: [
            {
              skillId: 'skill-java',
              requirement: RoleSkillRequirement.REQUIRED,
              importance: 'HIGH',
              weight: 1.0,
              skill: { name: 'Java' },
            },
          ],
        });

      const inherited = await roleTaxonomyService.getInheritedSkills('role-b');
      expect(inherited).toHaveLength(2);
      expect(inherited.map((i) => i.name)).toContain('Spring Boot');
      expect(inherited.map((i) => i.name)).toContain('Java');
    });
  });

  describe('CareerPathService — Path Analysis and Gap Scoring', () => {
    it('should analyze path gaps and compute correct completeness scores', async () => {
      // Mock career path steps
      mockPrismaService.careerPath.findUnique.mockResolvedValueOnce({
        id: 'path-a',
        title: 'Backend Path',
        steps: [
          {
            id: 'step-1',
            stepNumber: 1,
            role: { name: 'Software Engineer' },
            skills: [
              { skill: { id: 'skill-java', name: 'Java' } },
              { skill: { id: 'skill-sql', name: 'SQL' } },
            ],
          },
        ],
      });

      // Mock user has only Java
      mockPrismaService.userSkill.findMany.mockResolvedValueOnce([
        { skillId: 'skill-java', skill: { name: 'Java' } },
      ]);

      const analysis = await careerPathService.analyzePathGaps('user-1', 'path-a');
      expect(analysis.steps).toBeDefined();
      expect(analysis.steps[0]!).toBeDefined();
      expect(analysis.steps[0]!.completenessRate).toBe(50.0);
      expect(analysis.steps[0]!.overlapSkills).toContain('Java');
      expect(analysis.steps[0]!.missingSkills).toContain('SQL');
    });
  });

  describe('TalentIntelligenceService — Next Best Skill & Priority Score', () => {
    it('should compute valid priority scores and determine priorities accurately', async () => {
      // Mock user skills (missing React, PostgreSQL)
      mockPrismaService.userSkill.findMany.mockResolvedValueOnce([]);

      // Mock target role requirements (React is required, PostgreSQL is preferred)
      mockPrismaService.roleSkill.findMany.mockResolvedValueOnce([
        {
          skillId: 'skill-react',
          requirement: 'REQUIRED',
          skill: { id: 'skill-react', name: 'React' },
        },
        {
          skillId: 'skill-postgres',
          requirement: 'PREFERRED',
          skill: { id: 'skill-postgres', name: 'PostgreSQL' },
        },
      ]);

      // Mock zero transferable mapping
      mockPrismaService.skillRelationship.count.mockResolvedValue(0);

      const recommendations = await talentIntelligenceService.recommendNextBestSkills(
        'user-1',
        'role-b',
      );
      expect(recommendations).toHaveLength(2);
      // React (required) should have a higher score than PostgreSQL (preferred)
      expect(recommendations[0]!).toBeDefined();
      expect(recommendations[0]!.skillName).toBe('React');
      expect(recommendations[0]!.priority).toBe('HIGH');
    });
  });

  describe('CareerRecommendationService — Confidence and AI Explanations', () => {
    it('should assign correct confidence level based on missing skill count', async () => {
      // Mock User profile (has 0 skills)
      mockPrismaService.user.findUnique.mockResolvedValueOnce({
        id: 'user-1',
        userSkills: [],
      });
      // Mock Role (requires Java)
      mockPrismaService.role.findUnique.mockResolvedValueOnce({
        id: 'role-b',
        name: 'Backend Engineer',
        roleSkills: [{ skillId: 'skill-java', requirement: 'REQUIRED', skill: { name: 'Java' } }],
      });

      // Mock sub-service prisma calls
      mockPrismaService.userSkill.findMany.mockResolvedValue([]);
      mockPrismaService.roleSkill.findMany.mockResolvedValue([
        {
          skillId: 'skill-java',
          requirement: 'REQUIRED',
          skill: { id: 'skill-java', name: 'Java' },
        },
      ]);
      mockPrismaService.skillRelationship.findMany.mockResolvedValue([]);

      mockPrismaService.careerRecommendation.create.mockImplementation((args) => args.data);

      const recommendation = await careerRecommendationService.generateRecommendation(
        'user-1',
        'role-b',
      );
      // 0 skills yields INSUFFICIENT_DATA
      expect(recommendation.confidence).toBe('INSUFFICIENT_DATA');
    });

    it('should set HIGH confidence if user has 100% of required skills', async () => {
      // Mock User profile (has Java)
      mockPrismaService.user.findUnique.mockResolvedValueOnce({
        id: 'user-1',
        userSkills: [{ skillId: 'skill-java', skill: { name: 'Java' } }],
      });
      // Mock Role (requires Java)
      mockPrismaService.role.findUnique.mockResolvedValueOnce({
        id: 'role-b',
        name: 'Backend Engineer',
        roleSkills: [{ skillId: 'skill-java', requirement: 'REQUIRED', skill: { name: 'Java' } }],
      });

      // Mock sub-service prisma calls
      mockPrismaService.userSkill.findMany.mockResolvedValue([
        { skillId: 'skill-java', skill: { name: 'Java' } },
      ]);
      mockPrismaService.roleSkill.findMany.mockResolvedValue([
        {
          skillId: 'skill-java',
          requirement: 'REQUIRED',
          skill: { id: 'skill-java', name: 'Java' },
        },
      ]);
      mockPrismaService.skillRelationship.findMany.mockResolvedValue([]);

      mockPrismaService.careerRecommendation.create.mockImplementation((args) => args.data);

      const recommendation = await careerRecommendationService.generateRecommendation(
        'user-1',
        'role-b',
      );
      expect(recommendation.confidence).toBe('HIGH');
    });
  });
});
