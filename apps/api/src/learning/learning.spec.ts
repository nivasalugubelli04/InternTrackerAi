import { Test, TestingModule } from '@nestjs/testing';

import { AI_PROVIDER_TOKEN } from '../ai/providers/ai-provider.interface';
import { PrismaService } from '../prisma/prisma.service';

import { LearningCoachService } from './services/learning-coach.service';
import { PracticeService } from './services/practice.service';
import { PrerequisiteService } from './services/prerequisite.service';
import { RoadmapGenerationService } from './services/roadmap-generation.service';
import { SkillMasteryService } from './services/skill-mastery.service';

describe('Phase 26 — Personalized Learning & Adaptive Roadmaps unit tests', () => {
  let prerequisiteService: PrerequisiteService;
  let roadmapGenerationService: RoadmapGenerationService;
  let practiceService: PracticeService;
  let skillMasteryService: SkillMasteryService;
  let learningCoachService: LearningCoachService;

  // Mock Prisma Service
  const mockPrismaService = {
    userSkill: {
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    skillRelationship: {
      findMany: jest.fn(),
    },
    learningGoal: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    learningRoadmap: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    learningRoadmapVersion: {
      create: jest.fn(),
    },
    learningModule: {
      findUnique: jest.fn(),
    },
    learningEnrollment: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    practiceActivity: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    practiceAttempt: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    skillEvidence: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    skill: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    role: {
      findFirst: jest.fn(),
    },
  };

  // Mock AIProvider
  const mockAIProvider = {
    generateText: jest.fn().mockResolvedValue({
      text: 'Mock concept explanation showing Docker containers and virtual networks.',
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrerequisiteService,
        RoadmapGenerationService,
        PracticeService,
        SkillMasteryService,
        LearningCoachService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AI_PROVIDER_TOKEN, useValue: mockAIProvider },
      ],
    }).compile();

    prerequisiteService = module.get<PrerequisiteService>(PrerequisiteService);
    roadmapGenerationService = module.get<RoadmapGenerationService>(RoadmapGenerationService);
    practiceService = module.get<PracticeService>(PracticeService);
    skillMasteryService = module.get<SkillMasteryService>(SkillMasteryService);
    learningCoachService = module.get<LearningCoachService>(LearningCoachService);

    jest.clearAllMocks();
  });

  describe('PrerequisiteService', () => {
    it('should identify missing prerequisites based on user skills mapping', async () => {
      // Mock user has Java (skill-java)
      mockPrismaService.userSkill.findMany.mockResolvedValueOnce([{ skillId: 'skill-java' }]);
      // Mock skill-spring depends on skill-java and skill-sql
      mockPrismaService.skillRelationship.findMany.mockResolvedValueOnce([
        { fromSkillId: 'skill-java' },
        { fromSkillId: 'skill-sql' },
      ]);

      const missing = await prerequisiteService.getMissingPrerequisites('user-1', 'skill-spring');
      // Java is possessed, SQL is missing
      expect(missing).toContain('skill-sql');
      expect(missing).not.toContain('skill-java');
    });
  });

  describe('RoadmapGenerationService — Custom Compilation and Versioning', () => {
    it('should compile new roadmaps and save previous ones as a roadmap version', async () => {
      // Mock learning goal (target skill: React)
      mockPrismaService.learningGoal.findUnique.mockResolvedValueOnce({
        id: 'goal-1',
        title: 'Learn React',
        targetSkillId: 'skill-react',
      });
      mockPrismaService.userSkill.findMany.mockResolvedValue([]);
      // Mock React depends on JavaScript (skill-js)
      mockPrismaService.skillRelationship.findMany.mockResolvedValue([{ fromSkillId: 'skill-js' }]);
      mockPrismaService.skill.findUnique.mockImplementation((args) => {
        const id = args.where.id;
        return {
          id,
          name: id === 'skill-js' ? 'JavaScript' : 'React',
          learningModules: [],
        };
      });

      // Mock existing roadmap to trigger archiving/versioning
      mockPrismaService.learningRoadmap.findFirst.mockResolvedValueOnce({
        id: 'roadmap-1',
        goalId: 'goal-1',
        version: 1,
        roadmapJson: { test: true },
      });

      mockPrismaService.learningRoadmap.update.mockImplementation((args) => args.data);

      const updatedRoadmap = await roadmapGenerationService.generateRoadmap(
        'user-1',
        'goal-1',
        'Manual refresh',
      );

      expect(mockPrismaService.learningRoadmapVersion.create).toHaveBeenCalled();
      expect(updatedRoadmap.version).toBe(2);
    });
  });

  describe('PracticeService — Adaptive Difficulty', () => {
    it('should increment quiz difficulty to ADVANCED on 3 consecutive correct answers', async () => {
      // Mock 3 consecutive correct attempts
      mockPrismaService.practiceAttempt.findMany.mockResolvedValueOnce([
        { isCorrect: true },
        { isCorrect: true },
        { isCorrect: true },
      ]);

      mockPrismaService.practiceActivity.findMany.mockResolvedValueOnce([]);

      await practiceService.getAdaptiveActivities('user-1', 'skill-sql');

      expect(mockPrismaService.practiceActivity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            difficulty: 'ADVANCED',
          }),
        }),
      );
    });

    it('should downgrade quiz difficulty to BEGINNER on 2 consecutive incorrect answers', async () => {
      // Mock 2 consecutive incorrect attempts
      mockPrismaService.practiceAttempt.findMany.mockResolvedValueOnce([
        { isCorrect: false },
        { isCorrect: false },
        { isCorrect: true },
      ]);

      mockPrismaService.practiceActivity.findMany.mockResolvedValueOnce([]);

      await practiceService.getAdaptiveActivities('user-1', 'skill-sql');

      expect(mockPrismaService.practiceActivity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            difficulty: 'BEGINNER',
          }),
        }),
      );
    });
  });

  describe('SkillMasteryService — Mastery scoring & Sync', () => {
    it('should compute valid scores and return profile sync choice options', async () => {
      mockPrismaService.skill.findUnique.mockResolvedValueOnce({
        id: 'skill-react',
        name: 'React',
      });
      // Mock skill evidence (Quiz score: 80, Project score: 100)
      mockPrismaService.skillEvidence.findMany.mockResolvedValueOnce([
        { evidenceType: 'QUIZ', score: 80.0 },
        { evidenceType: 'PROJECT', score: 100.0 },
      ]);

      const syncOptions = await skillMasteryService.getProfileSyncOptions('user-1', 'skill-react');

      expect(syncOptions.suggestedLevel).toBe('INTERMEDIATE');
      expect(syncOptions.options).toContainEqual({ key: 'ADD', label: 'Yes, add to my profile' });
    });
  });

  describe('LearningCoachService — Custom Explanations', () => {
    it('should generate personalized concept explanations using AIProvider', async () => {
      mockPrismaService.skill.findUnique.mockResolvedValueOnce({
        id: 'skill-docker',
        name: 'Docker',
      });
      mockPrismaService.userSkill.findMany.mockResolvedValueOnce([]);

      const explanation = await learningCoachService.explainConcept(
        'user-1',
        'skill-docker',
        'Containers',
      );

      expect(explanation).toContain('Docker containers');
      expect(mockAIProvider.generateText).toHaveBeenCalled();
    });
  });
});
