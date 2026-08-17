import { Test, TestingModule } from '@nestjs/testing';

import { AiService } from '../../ai/services/ai.service';
import { RecommendationService } from '../../matching/services/recommendation.service';
import { PrismaService } from '../../prisma/prisma.service';

import { ActionOrchestrationService } from './action-orchestration.service';
import { CareerCenterAiService } from './career-center-ai.service';
import { CareerCenterService } from './career-center.service';
import { ReadinessCalculatorService } from './readiness-calculator.service';
import { TimelineAggregationService } from './timeline-aggregation.service';

describe('Phase 28 — Personal Career Command Center unit tests', () => {
  let readinessCalculator: ReadinessCalculatorService;
  let actionOrchestrator: ActionOrchestrationService;
  let timelineAggregation: TimelineAggregationService;
  let careerCenter: CareerCenterService;
  let careerCenterAi: CareerCenterAiService;

  // Mock Prisma Service
  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    profile: {
      findUnique: jest.fn(),
    },
    careerGoal: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    careerPreference: {
      findUnique: jest.fn(),
    },
    userSkill: {
      findMany: jest.fn(),
    },
    application: {
      findMany: jest.fn(),
    },
    hiringInterview: {
      findMany: jest.fn(),
    },
    offer: {
      findMany: jest.fn(),
    },
    mockInterview: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    assessmentAssignment: {
      findMany: jest.fn(),
    },
    learningGoal: {
      findMany: jest.fn(),
    },
    learningEnrollment: {
      findMany: jest.fn(),
    },
    careerCenterPreference: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    careerAction: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    role: {
      findFirst: jest.fn(),
    },
    notification: {
      findMany: jest.fn(),
    },
    recommendation: {
      findMany: jest.fn(),
    },
    aiConversation: {
      findFirst: jest.fn(),
      create: jest
        .fn()
        .mockImplementation((dto: any) => Promise.resolve({ id: 'conv-1', ...dto.data })),
    },
    aiMessage: {
      findMany: jest.fn(),
      create: jest
        .fn()
        .mockImplementation((dto: any) => Promise.resolve({ id: 'msg-1', ...dto.data })),
    },
  };

  // Mock Recommendation Service
  const mockRecommendationService = {
    getRecommendations: jest.fn().mockResolvedValue({
      data: [
        {
          id: 'rec-1',
          jobId: 'job-1',
          job: {
            title: 'Software Engineer Intern',
            company: { name: 'Google' },
            location: 'Remote',
            workMode: 'REMOTE',
            deadline: new Date(),
            createdAt: new Date(),
          },
          reasons: [{ description: 'Matches Javascript skill' }],
          matchScore: { overallScore: 88 },
        },
      ],
    }),
  };

  // Mock AI Service
  const mockAiService = {
    aiConfig: { provider: 'gemini', enabled: true },
    aiProvider: {
      generateText: jest.fn().mockResolvedValue({
        text: "- TODAY'S TOP PRIORITY: Complete SQL learning module\n- OPPORTUNITIES: 1 high-matching role at Google\n- DEADLINES & INTERVIEWS: None\n- LEARNING & PRACTICE: Javascript basics",
        model: 'gemini-1.5-pro',
        usage: { inputTokens: 50, outputTokens: 100 },
      }),
    },
    prisma: {},
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReadinessCalculatorService,
        ActionOrchestrationService,
        TimelineAggregationService,
        CareerCenterService,
        CareerCenterAiService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RecommendationService, useValue: mockRecommendationService },
        { provide: AiService, useValue: mockAiService },
      ],
    }).compile();

    readinessCalculator = module.get<ReadinessCalculatorService>(ReadinessCalculatorService);
    actionOrchestrator = module.get<ActionOrchestrationService>(ActionOrchestrationService);
    timelineAggregation = module.get<TimelineAggregationService>(TimelineAggregationService);
    careerCenter = module.get<CareerCenterService>(CareerCenterService);
    careerCenterAi = module.get<CareerCenterAiService>(CareerCenterAiService);

    jest.clearAllMocks();
  });

  describe('ReadinessCalculatorService', () => {
    it('should compute DEVELOPING profile readiness when some fields are populated', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        profile: {
          phone: '12345678',
          college: 'Stanford University',
          degree: 'Computer Science',
          cgpa: 3.8,
        },
        resume: null,
        userSkills: [],
        careerGoals: [],
        applications: [],
        mockInterviews: [],
        candidateHiringInterviews: [],
        learningGoals: [],
        learningEnrollments: [],
      });

      const result = await readinessCalculator.calculateReadiness('user-1');
      expect(result.profile).toBe('DEVELOPING');
      expect(result.resume).toBe('NEEDS ATTENTION');
      expect(result.methodology).toBeDefined();
    });

    it('should compute READY profile readiness when onboarding is completed and 7+ fields are populated', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        profile: {
          phone: '12345678',
          bio: 'Passionate coding intern',
          headline: 'Full-stack engineer',
          college: 'Stanford University',
          degree: 'Computer Science',
          cgpa: 3.8,
          graduationYear: 2027,
          linkedinUrl: 'https://linkedin.com',
        },
        resume: { fileUrl: 'https://storage/resume.pdf' },
        userSkills: [],
        careerGoals: [],
        applications: [],
        mockInterviews: [],
        candidateHiringInterviews: [],
        learningGoals: [],
        learningEnrollments: [],
      });

      const result = await readinessCalculator.calculateReadiness('user-1');
      expect(result.profile).toBe('READY');
      expect(result.resume).toBe('READY');
    });
  });

  describe('ActionOrchestrationService', () => {
    it('should query user states and sync prioritized daily actions', async () => {
      mockPrismaService.careerCenterPreference.findUnique.mockResolvedValue({
        userId: 'user-1',
        dailyTimeBudget: 30,
        careerMode: 'GENERAL_CAREER',
      });
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        resume: null,
        candidateHiringInterviews: [],
        candidateAssessmentAssignments: [],
        mockInterviews: [],
        learningEnrollments: [],
        recommendations: [],
      });
      mockPrismaService.careerAction.findMany.mockResolvedValue([
        {
          id: 'action-1',
          actionType: 'RESUME_UPDATE',
          entityType: 'User',
          entityId: 'user-1',
          priority: 'HIGH',
          status: 'PENDING',
          expiresAt: null,
        },
      ]);

      const actions = await actionOrchestrator.getPrioritizedActions('user-1');
      expect(actions.length).toBeGreaterThan(0);
      expect(actions[0]!.actionType).toBe('RESUME_UPDATE');
      expect(actions[0]!.priority).toBe('HIGH');
    });
  });

  describe('TimelineAggregationService', () => {
    it('should aggregate profile, application and skills events sorted chronologically', async () => {
      mockPrismaService.profile.findUnique.mockResolvedValue({
        id: 'prof-1',
        onboardingCompletedAt: new Date('2026-08-01T10:00:00Z'),
        degree: 'BS CS',
        college: 'Stanford',
      });
      mockPrismaService.careerGoal.findMany.mockResolvedValue([]);
      mockPrismaService.offer.findMany.mockResolvedValue([]);
      mockPrismaService.userSkill.findMany.mockResolvedValue([
        {
          skillId: 'skill-1',
          addedAt: new Date('2026-08-05T12:00:00Z'),
          proficiency: 'BEGINNER',
          skill: { name: 'Javascript' },
        },
      ]);
      mockPrismaService.learningEnrollment.findMany.mockResolvedValue([]);
      mockPrismaService.recommendation.findMany.mockResolvedValue([]);
      mockPrismaService.application.findMany.mockResolvedValue([]);
      mockPrismaService.hiringInterview.findMany.mockResolvedValue([]);
      mockPrismaService.assessmentAssignment.findMany.mockResolvedValue([]);
      mockPrismaService.mockInterview.findMany.mockResolvedValue([]);

      const timeline = await timelineAggregation.aggregateTimeline('user-1');
      expect(timeline.length).toBe(2);
      expect(timeline[0]!.eventType).toBe('SKILL_ADDED'); // Added later chronologically
      expect(timeline[1]!.eventType).toBe('PROFILE_COMPLETED');
    });
  });

  describe('CareerCenterService', () => {
    it('should compile the career center overview summary dashboard', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        profile: null,
        careerGoals: [],
        careerPreference: null,
        userSkills: [],
        applications: [],
        candidateHiringInterviews: [],
        candidateOffers: [],
        learningEnrollments: [],
        mockInterviews: [],
      });

      const res = await careerCenter.getSummary('user-1');
      expect(res).toBeDefined();
      expect(res!.targetRole).toBeDefined();
    });
  });

  describe('CareerCenterAiService', () => {
    it('should generate grounded chat response distinguishing verified and unknown data', async () => {
      mockPrismaService.aiConversation.findFirst.mockResolvedValue({ id: 'conv-1' });
      mockPrismaService.aiMessage.findMany.mockResolvedValue([]);
      mockPrismaService.aiMessage.create.mockImplementation((dto: any) =>
        Promise.resolve({
          id: 'msg-1',
          ...dto.data,
        }),
      );
      mockPrismaService.careerCenterPreference.findUnique.mockResolvedValue({
        userId: 'user-1',
        dailyTimeBudget: 30,
        careerMode: 'GENERAL_CAREER',
      });
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        resume: null,
        candidateHiringInterviews: [],
        candidateAssessmentAssignments: [],
        mockInterviews: [],
        learningEnrollments: [],
        recommendations: [],
      });
      mockPrismaService.careerAction.findMany.mockResolvedValue([]);

      const res = await careerCenterAi.handleChat('user-1', 'What should I do today?');
      expect(res.conversationId).toBeDefined();
      expect(res.message.content).toContain('Complete SQL learning module');
    });
  });
});
