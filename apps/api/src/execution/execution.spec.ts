import { Test, TestingModule } from '@nestjs/testing';
import {
  EffortCategory,
  ExecutionPriority,
  HiringInterviewStatus,
  SprintStatus,
  SprintType,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import { ActionDecompositionService } from './services/action-decomposition.service';
import { AdaptiveReplanningService } from './services/adaptive-replanning.service';
import { CareerSprintService } from './services/career-sprint.service';
import { DeadlineIntelligenceService } from './services/deadline-intelligence.service';
import { DependencyEngineService } from './services/dependency-engine.service';
import { ExecutionAiService } from './services/execution-ai.service';
import { ExecutionEngineService } from './services/execution-engine.service';
import { FocusSessionService } from './services/focus-session.service';
import { NextBestActionService } from './services/next-best-action.service';
import { StopDeprioritizeService } from './services/stop-deprioritize.service';
import { UnifiedActionAggregatorService } from './services/unified-action-aggregator.service';
import { WeeklyReviewService } from './services/weekly-review.service';
import { WorkloadIntelligenceService } from './services/workload-intelligence.service';

describe('Execution Module Services', () => {
  let aggregator: UnifiedActionAggregatorService;
  let dependencyEngine: DependencyEngineService;
  let deadlineService: DeadlineIntelligenceService;
  let workloadService: WorkloadIntelligenceService;
  let nbaService: NextBestActionService;
  let decompositionService: ActionDecompositionService;
  let executionEngine: ExecutionEngineService;
  let sprintService: CareerSprintService;
  let focusService: FocusSessionService;
  let reviewService: WeeklyReviewService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
    },
    executionPlan: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    executionPlanItem: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    careerSprint: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    careerSprintItem: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    planReview: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    userExecutionPreference: {
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
    profile: {
      findUnique: jest.fn(),
    },
    careerPreference: {
      findUnique: jest.fn(),
    },
    userIntegration: {
      findFirst: jest.fn(),
    },
    hiringInterview: {
      findFirst: jest.fn(),
    },
    careerAction: {
      updateMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnifiedActionAggregatorService,
        DependencyEngineService,
        DeadlineIntelligenceService,
        WorkloadIntelligenceService,
        NextBestActionService,
        ActionDecompositionService,
        StopDeprioritizeService,
        CareerSprintService,
        FocusSessionService,
        WeeklyReviewService,
        AdaptiveReplanningService,
        {
          provide: ExecutionAiService,
          useValue: {
            synthesizePlanStrategy: jest.fn().mockResolvedValue({
              planObjective: 'Execute high leverage career actions',
              primaryFocus: 'Interview Readiness',
              secondaryFocus: 'Portfolio Deployment',
              maintainFocus: 'Applications',
              reasoning: 'Grounded priority order',
              workloadRisk: 'BALANCED',
            }),
            generateDeterministicPlan: jest.fn().mockReturnValue({
              planObjective: 'Execute high leverage career actions',
              primaryFocus: 'Interview Readiness',
              secondaryFocus: 'Portfolio Deployment',
              maintainFocus: 'Applications',
              reasoning: 'Grounded priority order',
              workloadRisk: 'BALANCED',
            }),
          },
        },
        ExecutionEngineService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    aggregator = module.get<UnifiedActionAggregatorService>(UnifiedActionAggregatorService);
    dependencyEngine = module.get<DependencyEngineService>(DependencyEngineService);
    deadlineService = module.get<DeadlineIntelligenceService>(DeadlineIntelligenceService);
    workloadService = module.get<WorkloadIntelligenceService>(WorkloadIntelligenceService);
    nbaService = module.get<NextBestActionService>(NextBestActionService);
    decompositionService = module.get<ActionDecompositionService>(ActionDecompositionService);
    executionEngine = module.get<ExecutionEngineService>(ExecutionEngineService);
    sprintService = module.get<CareerSprintService>(CareerSprintService);
    focusService = module.get<FocusSessionService>(FocusSessionService);
    reviewService = module.get<WeeklyReviewService>(WeeklyReviewService);
  });

  it('should be defined', () => {
    expect(executionEngine).toBeDefined();
    expect(aggregator).toBeDefined();
    expect(dependencyEngine).toBeDefined();
    expect(nbaService).toBeDefined();
  });

  describe('UnifiedActionAggregatorService', () => {
    it('should aggregate candidates across applications, interviews, learning, and networking', async () => {
      const scheduledDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        profile: { headline: 'AI Engineer' },
        resume: { versions: [] },
        careerPreference: { roles: ['AI Engineer'] },
        userGoals: [],
        applications: [
          {
            id: 'app-1',
            status: 'APPLICATION_STARTED',
            job: {
              title: 'AI Intern',
              company: { name: 'Google' },
              deadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
            },
          },
        ],
        candidateHiringInterviews: [
          {
            id: 'int-1',
            status: HiringInterviewStatus.SCHEDULED,
            scheduledStart: scheduledDate,
            job: { title: 'AI Intern', company: { name: 'Google' } },
          },
        ],
        learningEnrollments: [
          {
            id: 'learn-1',
            completedAt: null,
            module: { title: 'PyTorch Model Deployment', skill: { name: 'PyTorch' } },
          },
        ],
        portfolioRecommendations: [],
        professionalContacts: [],
        careerTrajectories: [],
        externalDataRecords: [],
        careerActions: [],
      });

      const candidates = await aggregator.aggregateCandidates('user-1');
      expect(candidates.length).toBeGreaterThanOrEqual(3);
      expect(candidates.some((c) => c.source === 'INTERVIEW')).toBe(true);
      expect(candidates.some((c) => c.source === 'APPLICATION')).toBe(true);
      expect(candidates.some((c) => c.source === 'LEARNING')).toBe(true);
    });
  });

  describe('DependencyEngineService', () => {
    it('should identify blocker relationships and order unblocked items first', () => {
      const candidates: any[] = [
        {
          title: 'Finalize & submit application for AI Engineer',
          source: 'APPLICATION',
          sourceEntityId: 'app-1',
          priority: 'HIGH',
        },
        {
          title: 'Tailor resume for AI Engineer',
          source: 'APPLICATION',
          sourceEntityId: 'app-1',
          priority: 'HIGH',
        },
      ];

      const result = dependencyEngine.analyzeDependencies(candidates);
      expect(result.blockedActions.length).toBe(1);
      expect(result.blockedActions[0]!.action.title).toContain('submit');
      expect(result.orderedActions[0]!.title).toContain('Tailor resume');
    });
  });

  describe('DeadlineIntelligenceService', () => {
    it('should categorize imminent deadlines accurately', () => {
      const actions: any[] = [
        {
          title: 'Google Interview',
          source: 'INTERVIEW',
          deadline: new Date(Date.now() + 20 * 60 * 60 * 1000),
        },
        {
          title: 'Meta Application',
          source: 'APPLICATION',
          deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        },
      ];

      const assessment = deadlineService.assessDeadlines(actions);
      expect(assessment.criticalDeadlines.length).toBe(1);
      expect(assessment.approachingDeadlines.length).toBe(1);
    });
  });

  describe('WorkloadIntelligenceService', () => {
    it('should flag overload when estimated time exceeds daily budget', () => {
      const actions: any[] = Array(8).fill({
        title: 'Deep task',
        estimatedMinutes: 60,
        priority: 'WHEN_POSSIBLE',
        isBlocked: false,
      });

      const assessment = workloadService.assessWorkload(actions, {
        dailyAvailableMinutes: 60,
        maxDailyActions: 3,
      });

      expect(assessment.risk).toBe('OVERLOADED');
      expect(assessment.deprioritizeSuggestions.length).toBeGreaterThan(0);
    });
  });

  describe('NextBestActionService', () => {
    it('should select upcoming interview as highest priority next best action', () => {
      const candidates: any[] = [
        {
          title: 'Prepare for technical interview with Google',
          source: 'INTERVIEW',
          priority: 'CRITICAL',
          estimatedMinutes: 60,
          deadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
          isBlocked: false,
          relevanceScore: 98,
        },
        {
          title: 'Review job posting',
          source: 'APPLICATION',
          priority: 'IMPORTANT',
          estimatedMinutes: 15,
          isBlocked: false,
          relevanceScore: 70,
        },
      ];

      const nba = nbaService.selectNextBestAction(candidates);
      expect(nba).toBeDefined();
      expect(nba?.action.title).toContain('Google');
      expect(nba?.urgencyLabel).toBe('Immediate Attention');
    });
  });

  describe('ActionDecompositionService', () => {
    it('should break interview preparation into 4 actionable steps', () => {
      const steps = decompositionService.decomposeAction({
        title: 'Prepare for technical interview with Meta',
        source: 'INTERVIEW',
        priority: ExecutionPriority.CRITICAL,
        focusLevel: 'HIGH',
        estimatedEffort: EffortCategory.DEEP_WORK,
        estimatedMinutes: 60,
        priorityExplanation: '',
        potentialImpact: '',
        suggestedNextStep: '',
      });

      expect(steps.length).toBe(4);
      expect(steps[0]!.title).toContain('Review company mission');
    });
  });

  describe('CareerSprintService', () => {
    it('should create sprint and calculate completion progress correctly', async () => {
      mockPrisma.careerSprint.create.mockResolvedValue({
        id: 'sprint-1',
        title: '7-Day AI Sprint',
        goal: 'Deploy AI model and submit 3 applications',
        sprintType: SprintType.APPLICATION,
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        durationDays: 7,
        status: SprintStatus.ACTIVE,
        progressPercent: 0,
        keyMilestones: ['Deploy AI model'],
        items: [
          { id: 'item-1', title: 'Task 1', isMilestone: false, status: 'PENDING', targetDay: 1 },
          { id: 'item-2', title: 'Task 2', isMilestone: true, status: 'PENDING', targetDay: 7 },
        ],
      });

      const sprint = await sprintService.createSprint('user-1', {
        title: '7-Day AI Sprint',
        goal: 'Deploy AI model and submit 3 applications',
        sprintType: SprintType.APPLICATION,
        durationDays: 7,
      });

      expect(sprint.id).toBe('sprint-1');
      expect(sprint.progressPercent).toBe(0);
    });
  });

  describe('FocusSessionService', () => {
    it('should return structured focus session with non-mutating calendar suggestion', async () => {
      mockPrisma.executionPlanItem.findFirst.mockResolvedValue({
        id: 'item-1',
        title: 'Prepare AI Interview',
        description: 'Review coding problems',
        priorityExplanation: 'High impact',
      });
      mockPrisma.userIntegration.findFirst.mockResolvedValue({
        id: 'int-cal',
        provider: 'GOOGLE_CALENDAR',
        status: 'CONNECTED',
      });

      const session = await focusService.createFocusSessionSuggestion('user-1', 'item-1', 90);
      expect(session.suggestedDurationMinutes).toBe(90);
      expect(session.calendarContext?.canAddToCalendar).toBe(true);
      expect(session.calendarContext?.suggestedEventTitle).toContain('[Career Focus]');
    });
  });

  describe('WeeklyReviewService', () => {
    it('should generate constructive non-punitive review', async () => {
      mockPrisma.executionPlan.findMany.mockResolvedValue([]);
      mockPrisma.user.findUnique.mockResolvedValue({
        applications: [],
        candidateHiringInterviews: [],
        mockInterviews: [],
        learningEnrollments: [],
      });
      mockPrisma.planReview.create.mockResolvedValue({
        id: 'rev-1',
        reviewPeriod: 'WEEKLY',
        periodStartDate: new Date(),
        periodEndDate: new Date(),
        whatWentWell: ['Maintained active career strategy tracking'],
        progressMade: ['Pipeline momentum refreshed'],
        actionsCarriedForward: [],
        currentBottlenecks: ['No blocking dependencies currently detected.'],
        nextFocusRecommendations: ['Focus primarily on high-leverage interview preparation'],
        completedActionsCount: 0,
        totalActionsCount: 0,
      });

      const review = await reviewService.generateWeeklyReview('user-1');
      expect(review.id).toBe('rev-1');
      expect(review.whatWentWell.length).toBeGreaterThan(0);
    });
  });
});
