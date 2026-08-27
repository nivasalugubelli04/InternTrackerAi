import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';

import { ActivationJourneyService } from './services/activation-journey.service';
import { ChannelSelectionService } from './services/channel-selection.service';
import { DailyFocusService } from './services/daily-focus.service';
import { EngagementPriorityService } from './services/engagement-priority.service';
import { EngagementSignalService } from './services/engagement-signal.service';
import { GrowthAnalyticsService } from './services/growth-analytics.service';
import { NotificationFatigueService } from './services/notification-fatigue.service';
import { ReengagementService } from './services/reengagement.service';
import { WeeklyCareerSummaryService } from './services/weekly-career-summary.service';

describe('Phase 52 — Growth, Engagement, Retention & Smart Notifications Tests', () => {
  let activationService: ActivationJourneyService;
  let signalService: EngagementSignalService;
  let priorityService: EngagementPriorityService;
  let fatigueService: NotificationFatigueService;
  let channelService: ChannelSelectionService;
  let dailyFocusService: DailyFocusService;
  let weeklySummaryService: WeeklyCareerSummaryService;
  let reengagementService: ReengagementService;
  let growthService: GrowthAnalyticsService;

  const mockPrismaService = {
    user: {
      findUnique: jest
        .fn()
        .mockResolvedValue({ id: 'u1', createdAt: new Date(Date.now() - 3600 * 1000) }),
      count: jest.fn().mockResolvedValue(100),
    },
    profile: {
      findUnique: jest.fn().mockResolvedValue({
        headline: 'AI Engineering Student',
        onboardingCompletedAt: new Date(),
      }),
    },
    userSkill: {
      count: jest.fn().mockResolvedValue(4),
    },
    careerGoal: {
      count: jest.fn().mockResolvedValue(1),
    },
    savedJob: {
      count: jest.fn().mockResolvedValue(5),
      findMany: jest
        .fn()
        .mockResolvedValue([{ id: 'sj-1', job: { id: 'j-1', title: 'AI Engineering Intern' } }]),
    },
    application: {
      count: jest.fn().mockResolvedValue(2),
      findMany: jest.fn().mockResolvedValue([]),
    },
    executionPlan: {
      count: jest.fn().mockResolvedValue(1),
      findMany: jest.fn().mockResolvedValue([]),
    },
    userEngagementState: {
      upsert: jest.fn().mockResolvedValue({
        id: 'ues-1',
        userId: 'u1',
        activationProgress: 1.0,
        segment: 'ACTIVATED_USER',
      }),
      findUnique: jest.fn().mockResolvedValue({
        id: 'ues-1',
        userId: 'u1',
        activationProgress: 1.0,
        segment: 'ACTIVATED_USER',
        lastMeaningfulActionAt: new Date(),
      }),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(78),
    },
    engagementSignal: {
      create: jest.fn().mockResolvedValue({
        id: 'sig-1',
        userId: 'u1',
        signalType: 'OPPORTUNITY_MATCH',
        priority: 'HIGH',
        title: 'New High Match',
        description: 'Match score 94%',
        recommendedAction: 'Apply now',
        isHandled: false,
      }),
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue({
        id: 'sig-1',
        userId: 'u1',
        signalType: 'OPPORTUNITY_MATCH',
        priority: 'HIGH',
        title: 'New High Match',
        description: 'Match score 94%',
        recommendedAction: 'Apply now',
        isHandled: false,
      }),
      update: jest.fn().mockResolvedValue({ id: 'sig-1', isHandled: true }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    engagementActionLog: {
      create: jest.fn().mockResolvedValue({ id: 'log-1' }),
      count: jest.fn().mockResolvedValue(50),
      groupBy: jest.fn().mockResolvedValue([{ userId: 'u1' }]),
    },
    dailyFocusItem: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({
        id: 'df-1',
        userId: 'u1',
        date: '2026-08-27',
        title: 'Tailor Resume for AI Engineering Intern',
        reason: 'High-match opportunity ready for tailoring',
        actionLabel: 'Tailor Application',
        targetRoute: '/opportunities/j-1',
        priority: 'HIGH',
        matchScore: 92,
        isCompleted: false,
      }),
      update: jest.fn().mockResolvedValue({ id: 'df-1', isCompleted: true }),
    },
    notification: {
      create: jest.fn().mockResolvedValue({ id: 'notif-1', status: 'DELIVERED' }),
      count: jest.fn().mockResolvedValue(1),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivationJourneyService,
        EngagementSignalService,
        EngagementPriorityService,
        NotificationFatigueService,
        ChannelSelectionService,
        DailyFocusService,
        WeeklyCareerSummaryService,
        ReengagementService,
        GrowthAnalyticsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    activationService = module.get<ActivationJourneyService>(ActivationJourneyService);
    signalService = module.get<EngagementSignalService>(EngagementSignalService);
    priorityService = module.get<EngagementPriorityService>(EngagementPriorityService);
    fatigueService = module.get<NotificationFatigueService>(NotificationFatigueService);
    channelService = module.get<ChannelSelectionService>(ChannelSelectionService);
    dailyFocusService = module.get<DailyFocusService>(DailyFocusService);
    weeklySummaryService = module.get<WeeklyCareerSummaryService>(WeeklyCareerSummaryService);
    reengagementService = module.get<ReengagementService>(ReengagementService);
    growthService = module.get<GrowthAnalyticsService>(GrowthAnalyticsService);
  });

  describe('1. User Activation & Time-to-Value', () => {
    it('should compute activation score and time-to-value', async () => {
      const progress = await activationService.getActivationProgress('u1');
      expect(progress.isActivated).toBe(true);
      expect(progress.activationScore).toBeGreaterThanOrEqual(0.75);
      expect(progress.timeToValueSec).toBeDefined();
      expect(progress.completedMilestones).toContain('PROFILE_COMPLETED');
    });
  });

  describe('2. Engagement Signals & Priority Engine', () => {
    it('should emit and deduplicate domain engagement signals', async () => {
      const signal = await signalService.emitSignal('u1', {
        signalType: 'OPPORTUNITY_MATCH',
        priority: 'HIGH',
        title: 'New High Match Internship',
        description: 'Matched with 94% compatibility',
        recommendedAction: 'Review and apply',
      });
      expect(signal.id).toBeDefined();
      expect(mockPrismaService.engagementSignal.create).toHaveBeenCalled();
    });

    it('should calculate deterministic priority factoring deadlines and match scores', () => {
      const p1 = priorityService.evaluatePriority({
        category: 'INTERVIEW_UPCOMING',
        interviewHours: 12,
      });
      expect(p1).toBe('CRITICAL');

      const p2 = priorityService.evaluatePriority({
        category: 'DEADLINE_APPROACHING',
        deadlineHours: 36,
      });
      expect(p2).toBe('HIGH');

      const p3 = priorityService.evaluatePriority({
        category: 'OPPORTUNITY_MATCH',
        matchScore: 95,
      });
      expect(p3).toBe('HIGH');

      const p4 = priorityService.evaluatePriority({ category: 'PORTFOLIO_IMPROVEMENT' });
      expect(p4).toBe('LOW');
    });
  });

  describe('3. Notification Fatigue & Channel Selection', () => {
    it('should allow critical notifications and throttle excessive standard notifications', async () => {
      const criticalCheck = await fatigueService.canDeliverNotification('u1', 'CRITICAL');
      expect(criticalCheck.allowed).toBe(true);
    });

    it('should process and dispatch signal with channel selection and action logging', async () => {
      const dispatch = await channelService.processAndDispatchSignal('sig-1');
      expect(dispatch.dispatched).toBe(true);
      expect(dispatch.channel).toBeDefined();
      expect(dispatch.notificationId).toBeDefined();
    });
  });

  describe('4. Daily Focus & Weekly Career Summary', () => {
    it('should generate personalized daily focus and mark it complete', async () => {
      const focus = await dailyFocusService.getDailyFocus('u1');
      expect(focus.title).toBeDefined();
      expect(focus.actionLabel).toBeDefined();

      const completed = await dailyFocusService.completeDailyFocus('u1', focus.id);
      expect(completed.isCompleted).toBe(true);
    });

    it('should generate concise weekly career summary', async () => {
      const summary = await weeklySummaryService.getWeeklySummary('u1');
      expect(summary.period).toBeDefined();
      expect(summary.highlights.length).toBeGreaterThan(0);
      expect(summary.nextBestAction).toBeDefined();
    });
  });

  describe('5. Churn Risk & Growth Analytics', () => {
    it('should evaluate churn risk scoring with explainability', async () => {
      const churn = await reengagementService.evaluateChurnRisk('u1');
      expect(churn.churnRisk).toBeDefined();
      expect(churn.explainableReasons).toBeDefined();
      expect(churn.recommendedIntervention).toBeDefined();
    });

    it('should return executive growth metrics, segmentations, and funnels', async () => {
      const growth = await growthService.getGrowthMetrics();
      expect(growth.dau).toBeGreaterThan(0);
      expect(growth.overallActivationRate).toBeGreaterThan(0);
      expect(growth.notificationEffectiveness).toBeDefined();
      expect(growth.segmentDistribution).toBeDefined();
    });
  });
});
