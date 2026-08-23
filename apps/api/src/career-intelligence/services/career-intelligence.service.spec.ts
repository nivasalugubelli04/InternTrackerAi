import { Test, TestingModule } from '@nestjs/testing';
import { TrajectoryPhase, CareerMomentumState, PathAlignmentCategory } from '@prisma/client';

import { AI_PROVIDER_TOKEN } from '../../ai/providers/ai-provider.interface';
import { ReadinessCalculatorService } from '../../career-center/services/readiness-calculator.service';
import { EvidenceGraphService } from '../../portfolio/services/evidence-graph.service';
import { PrismaService } from '../../prisma/prisma.service';

import { CareerIntelligenceService } from './career-intelligence.service';

// ─── Mocks ─────────────────────────────────────────────────────────────────────

const mockPrisma = {
  user: { findUnique: jest.fn() },
  userSkill: { findMany: jest.fn() },
  portfolio: { findUnique: jest.fn() },
  application: { findMany: jest.fn() },
  mockInterview: { findMany: jest.fn() },
  learningEnrollment: { findMany: jest.fn() },
  professionalContact: { findMany: jest.fn() },
  careerGoal: { findMany: jest.fn() },
  careerTrajectory: { upsert: jest.fn() },
  careerPathAnalysis: { deleteMany: jest.fn(), createMany: jest.fn() },
  careerScenario: { create: jest.fn() },
  careerEvent: { create: jest.fn() },
  userGoal: { findMany: jest.fn() },
  learningGoal: { findMany: jest.fn() },
  careerProfileSnapshot: { findMany: jest.fn() },
};

const mockAiProvider = {
  generateText: jest.fn().mockResolvedValue({
    text: 'Mock AI narrative.',
    usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
    model: 'mock',
  }),
};

const mockEvidenceGraph = {
  getEvidenceGraph: jest.fn().mockResolvedValue([]),
};

const mockReadiness = {
  calculateReadiness: jest.fn().mockResolvedValue({
    profile: 'READY',
    resume: 'READY',
    skills: 'DEVELOPING',
    applications: 'NEEDS ATTENTION',
    interviews: 'INSUFFICIENT DATA',
    learning: 'DEVELOPING',
    methodology: {},
  }),
};

// ─── Helper Factories ──────────────────────────────────────────────────────────

const makeUser = () => ({
  id: 'user-123',
  profile: {
    phone: '123',
    bio: 'test',
    headline: 'Dev',
    college: 'MIT',
    degree: 'CS',
    cgpa: 3.8,
    graduationYear: 2025,
    linkedinUrl: 'l',
    githubUrl: 'g',
  },
});

const makeSkills = (names: string[]) =>
  names.map((name) => ({
    skillId: name,
    skill: { id: name, name, category: 'PROGRAMMING' },
    proficiency: 'INTERMEDIATE',
  }));

const makeGoals = (roles: string[]) =>
  roles.map((role) => ({ targetRole: role, updatedAt: new Date() }));

// ─── Test Suite ─────────────────────────────────────────────────────────────────

describe('CareerIntelligenceService', () => {
  let service: CareerIntelligenceService;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Default mock setup
    mockPrisma.user.findUnique.mockResolvedValue(makeUser());
    mockPrisma.userSkill.findMany.mockResolvedValue([]);
    mockPrisma.portfolio.findUnique.mockResolvedValue(null);
    mockPrisma.application.findMany.mockResolvedValue([]);
    mockPrisma.mockInterview.findMany.mockResolvedValue([]);
    mockPrisma.learningEnrollment.findMany.mockResolvedValue([]);
    mockPrisma.professionalContact.findMany.mockResolvedValue([]);
    mockPrisma.careerGoal.findMany.mockResolvedValue([]);
    mockPrisma.careerTrajectory.upsert.mockResolvedValue({});
    mockPrisma.careerPathAnalysis.deleteMany.mockResolvedValue({});
    mockPrisma.careerPathAnalysis.createMany.mockResolvedValue({});
    mockPrisma.careerScenario.create.mockResolvedValue({ id: 'scenario-1' });
    mockPrisma.careerEvent.create.mockResolvedValue({});
    mockPrisma.userGoal.findMany.mockResolvedValue([]);
    mockPrisma.learningGoal.findMany.mockResolvedValue([]);
    mockPrisma.careerProfileSnapshot.findMany.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CareerIntelligenceService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AI_PROVIDER_TOKEN, useValue: mockAiProvider },
        { provide: EvidenceGraphService, useValue: mockEvidenceGraph },
        { provide: ReadinessCalculatorService, useValue: mockReadiness },
      ],
    }).compile();

    service = module.get<CareerIntelligenceService>(CareerIntelligenceService);
  });

  // ── Test 1: buildCareerState ────────────────────────────────────────────────

  describe('buildCareerState', () => {
    it('returns a valid CareerState with no profile data', async () => {
      const state = await service.buildCareerState('user-123');
      expect(state.userId).toBe('user-123');
      expect(state.skills).toEqual([]);
      expect(state.projects).toEqual([]);
      expect(state.portfolioMaturity).toBe('NONE');
      expect(state.dataLimitations.length).toBeGreaterThan(0);
    });

    it('returns STRONG portfolioMaturity when 3+ projects present', async () => {
      mockPrisma.portfolio.findUnique.mockResolvedValue({
        contentJson: {
          projects: [
            {
              title: 'AI Recommender',
              description: 'ML project',
              technologies: ['Python', 'TensorFlow'],
            },
            { title: 'Data Pipeline', description: 'ETL', technologies: ['Spark'] },
            { title: 'API Backend', description: 'REST', technologies: ['Node.js'] },
          ],
        },
      });
      const state = await service.buildCareerState('user-123');
      expect(state.portfolioMaturity).toBe('STRONG');
      expect(state.projects.length).toBe(3);
    });

    it('computes mockInterviewAvgScore correctly', async () => {
      mockPrisma.mockInterview.findMany.mockResolvedValue([{ score: 80 }, { score: 90 }]);
      const state = await service.buildCareerState('user-123');
      expect(state.mockInterviewAvgScore).toBe(85);
    });
  });

  // ── Test 2: computeTrajectory ───────────────────────────────────────────────

  describe('computeTrajectory', () => {
    it('returns EXPLORING when no skills or projects', async () => {
      const result = await service.computeTrajectory('user-123');
      expect(result.phase).toBe(TrajectoryPhase.EXPLORING);
      expect(result.momentum).toBe(CareerMomentumState.INSUFFICIENT_DATA);
    });

    it('returns BUILDING when skills and projects exist but no applications', async () => {
      mockPrisma.userSkill.findMany.mockResolvedValue(makeSkills(['python', 'machine learning']));
      mockPrisma.portfolio.findUnique.mockResolvedValue({
        contentJson: {
          projects: [{ title: 'AI project', description: 'ML', technologies: ['Python'] }],
        },
      });
      const result = await service.computeTrajectory('user-123');
      expect(result.phase).toBe(TrajectoryPhase.BUILDING);
    });

    it('detects SPECIALIZING when strong alignment toward AI Engineer', async () => {
      mockPrisma.userSkill.findMany.mockResolvedValue(
        makeSkills(['python', 'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'nlp']),
      );
      mockPrisma.careerGoal.findMany.mockResolvedValue(makeGoals(['AI Engineer']));
      mockPrisma.portfolio.findUnique.mockResolvedValue({
        contentJson: {
          projects: [
            {
              title: 'AI Classifier',
              description: 'Neural network model',
              technologies: ['pytorch'],
            },
            {
              title: 'NLP recommendation',
              description: 'ML pipeline',
              technologies: ['tensorflow'],
            },
            {
              title: 'AI prediction model',
              description: 'Deep learning',
              technologies: ['python'],
            },
          ],
        },
      });
      const result = await service.computeTrajectory('user-123');
      expect([TrajectoryPhase.FOCUSING, TrajectoryPhase.SPECIALIZING]).toContain(result.phase);
      expect(result.primaryPathTitle).toBe('AI Engineer');
    });

    it('persists trajectory via prisma upsert', async () => {
      await service.computeTrajectory('user-123');
      expect(mockPrisma.careerTrajectory.upsert).toHaveBeenCalledTimes(1);
    });
  });

  // ── Test 3: generateCareerPaths ─────────────────────────────────────────────

  describe('generateCareerPaths', () => {
    it('returns array of 8 career path results', async () => {
      const paths = await service.generateCareerPaths('user-123');
      expect(paths.length).toBe(8);
    });

    it('marks AI Engineer as primary for AI-focused profile', async () => {
      mockPrisma.userSkill.findMany.mockResolvedValue(
        makeSkills([
          'python',
          'machine learning',
          'deep learning',
          'tensorflow',
          'pytorch',
          'nlp',
          'ai',
        ]),
      );
      mockPrisma.careerGoal.findMany.mockResolvedValue(makeGoals(['AI Engineer']));
      const paths = await service.generateCareerPaths('user-123');
      const primary = paths.find((p) => p.isPrimary);
      expect(primary).toBeDefined();
      expect(primary?.pathTitle).toBe('AI Engineer');
    });

    it('assigns INSUFFICIENT_DATA alignment when profile is empty', async () => {
      const paths = await service.generateCareerPaths('user-123');
      const allLow = paths.every(
        (p) =>
          p.alignmentCategory === PathAlignmentCategory.INSUFFICIENT_DATA ||
          p.alignmentCategory === PathAlignmentCategory.EXPLORATORY,
      );
      expect(allLow).toBe(true);
    });

    it('persists path analyses via prisma', async () => {
      await service.generateCareerPaths('user-123');
      expect(mockPrisma.careerPathAnalysis.deleteMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.careerPathAnalysis.createMany).toHaveBeenCalledTimes(1);
    });
  });

  // ── Test 4: runScenario ─────────────────────────────────────────────────────

  describe('runScenario', () => {
    it('returns deployment evidence improvement for deploy action', async () => {
      const result = await service.runScenario('user-123', {
        title: 'Deploy AI project',
        actionDescription: 'Deploy my AI project to the cloud',
        targetPathTitle: 'AI Engineer',
      });
      expect(result.potentialEvidenceImprovements.length).toBeGreaterThan(0);
      expect(result.potentialEvidenceImprovements.join(' ')).toContain('Deployment');
      expect(result.confidence).toBeDefined();
      expect(result.dataLimitations.length).toBeGreaterThan(0);
    });

    it('does NOT fabricate market data or guarantee outcomes', async () => {
      const result = await service.runScenario('user-123', {
        title: 'Deploy project',
        actionDescription: 'Deploy my project',
      });
      expect(result.dataLimitations.some((l) => l.includes('does NOT guarantee'))).toBe(true);
    });

    it('persists scenario to database', async () => {
      await service.runScenario('user-123', {
        title: 'Test',
        actionDescription: 'Build a backend API',
        targetPathTitle: 'Backend Engineer',
      });
      expect(mockPrisma.careerScenario.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.careerEvent.create).toHaveBeenCalledTimes(1);
    });

    it('returns fallback result without AI when LLM unavailable', async () => {
      mockAiProvider.generateText.mockRejectedValueOnce(new Error('LLM unavailable'));
      const result = await service.runScenario('user-123', {
        title: 'Deploy project',
        actionDescription: 'Deploy my project using Docker',
      });
      // Should still return deterministic result
      expect(result.potentialEvidenceImprovements.length).toBeGreaterThan(0);
      expect(result.aiNarrative).toBeNull();
    });
  });

  // ── Test 5: detectBottlenecks ───────────────────────────────────────────────

  describe('detectBottlenecks', () => {
    it('flags deployment evidence gap for AI profile without cloud skills', async () => {
      mockPrisma.userSkill.findMany.mockResolvedValue(makeSkills(['python', 'machine learning']));
      mockPrisma.portfolio.findUnique.mockResolvedValue({
        contentJson: {
          projects: [
            { title: 'AI recommendation', description: 'ML model', technologies: ['python'] },
          ],
        },
      });
      const bottlenecks = await service.detectBottlenecks('user-123');
      const deployBottleneck = bottlenecks.find((b) => b.label.includes('deployment'));
      expect(deployBottleneck).toBeDefined();
      expect(deployBottleneck?.severity).toBe('HIGH');
    });

    it('returns HIGH severity bottleneck for empty profile', async () => {
      const bottlenecks = await service.detectBottlenecks('user-123');
      const highSeverity = bottlenecks.find((b) => b.severity === 'HIGH');
      expect(highSeverity).toBeDefined();
    });
  });

  // ── Test 6: detectGoalConflicts ─────────────────────────────────────────────

  describe('detectGoalConflicts', () => {
    it('detects OVERLOAD when 5+ active goals', async () => {
      mockPrisma.userGoal.findMany.mockResolvedValue([
        { id: '1', status: 'ACTIVE' },
        { id: '2', status: 'ACTIVE' },
        { id: '3', status: 'ACTIVE' },
      ]);
      mockPrisma.learningGoal.findMany.mockResolvedValue([
        { id: '4', status: 'ACTIVE' },
        { id: '5', status: 'ACTIVE' },
        { id: '6', status: 'ACTIVE' },
      ]);
      const conflicts = await service.detectGoalConflicts('user-123');
      const overload = conflicts.find((c) => c.type === 'OVERLOAD');
      expect(overload).toBeDefined();
    });

    it('detects SYNERGY between AI Engineer and Data Engineering goals', async () => {
      mockPrisma.careerGoal.findMany.mockResolvedValue(
        makeGoals(['AI Engineer', 'Data Engineering']),
      );
      const conflicts = await service.detectGoalConflicts('user-123');
      const synergy = conflicts.find((c) => c.type === 'SYNERGY');
      expect(synergy).toBeDefined();
    });

    it('returns empty array when no conflicts detected', async () => {
      const conflicts = await service.detectGoalConflicts('user-123');
      expect(Array.isArray(conflicts)).toBe(true);
    });
  });

  // ── Test 7: getCareerReadinessDimensions ────────────────────────────────────

  describe('getCareerReadinessDimensions', () => {
    it('returns exactly 8 dimensions', async () => {
      const dimensions = await service.getCareerReadinessDimensions('user-123');
      expect(dimensions.length).toBe(8);
    });

    it('returns expected dimension names', async () => {
      const dimensions = await service.getCareerReadinessDimensions('user-123');
      const names = dimensions.map((d) => d.name);
      expect(names).toContain('Technical Foundation');
      expect(names).toContain('Practical Projects');
      expect(names).toContain('Portfolio Evidence');
      expect(names).toContain('Application Activity');
      expect(names).toContain('Interview Readiness');
      expect(names).toContain('Networking Readiness');
      expect(names).toContain('Career Clarity');
      expect(names).toContain('Execution Consistency');
    });

    it('returns STRONG career clarity when goals are set', async () => {
      mockPrisma.careerGoal.findMany.mockResolvedValue(makeGoals(['AI Engineer']));
      const dimensions = await service.getCareerReadinessDimensions('user-123');
      const clarity = dimensions.find((d) => d.name === 'Career Clarity');
      expect(clarity?.state).toBe('STRONG');
    });
  });

  // ── Test 8: getCareerEvolution ───────────────────────────────────────────────

  describe('getCareerEvolution', () => {
    it('returns no-snapshot message when no snapshots exist', async () => {
      const evolution = await service.getCareerEvolution('user-123');
      expect(evolution.snapshots).toHaveLength(0);
      expect(evolution.message).toContain('No historical snapshots');
    });

    it('returns snapshot history when snapshots exist', async () => {
      mockPrisma.careerProfileSnapshot.findMany.mockResolvedValue([
        {
          id: 'snap-1',
          trajectoryPhase: TrajectoryPhase.BUILDING,
          momentum: CareerMomentumState.STEADY,
          summary: 'Building phase',
          keySignals: ['2 skills recorded'],
          createdAt: new Date('2026-01-01'),
        },
      ]);
      const evolution = await service.getCareerEvolution('user-123');
      expect(evolution.snapshots.length).toBe(1);
    });
  });
});
