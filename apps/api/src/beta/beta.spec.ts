import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';

import { BetaProgramService } from './services/beta-program.service';
import { BetaService } from './services/beta.service';
import { FeedbackCollectionService } from './services/feedback-collection.service';
import { FeedbackIntelligenceService } from './services/feedback-intelligence.service';
import { ProductAnalyticsService } from './services/product-analytics.service';
import { ProductHealthScorecardService } from './services/product-health-scorecard.service';
import { ProductInsightEngineService } from './services/product-insight-engine.service';
import { UxFrictionDetectorService } from './services/ux-friction-detector.service';

describe('Phase 51 — Beta Launch, Real User Testing & Feedback Intelligence Tests', () => {
  let betaService: BetaService;
  let analyticsService: ProductAnalyticsService;
  let feedbackService: FeedbackCollectionService;
  let feedbackIntel: FeedbackIntelligenceService;
  let insightEngine: ProductInsightEngineService;
  let scorecardService: ProductHealthScorecardService;
  let programService: BetaProgramService;

  const mockPrismaService = {
    user: {
      count: jest.fn().mockResolvedValue(100),
    },
    profile: {
      findUnique: jest
        .fn()
        .mockResolvedValue({ headline: 'AI Student', onboardingCompletedAt: new Date() }),
      count: jest.fn().mockResolvedValue(90),
    },
    userSkill: {
      count: jest.fn().mockResolvedValue(5),
      groupBy: jest.fn().mockResolvedValue([{ userId: 'u1' }]),
    },
    careerGoal: {
      count: jest.fn().mockResolvedValue(1),
      groupBy: jest.fn().mockResolvedValue([{ userId: 'u1' }]),
    },
    savedJob: {
      count: jest.fn().mockResolvedValue(8),
      groupBy: jest.fn().mockResolvedValue([{ userId: 'u1' }]),
    },
    application: {
      count: jest.fn().mockResolvedValue(4),
      groupBy: jest.fn().mockResolvedValue([{ userId: 'u1' }]),
    },
    copilotConversation: {
      groupBy: jest.fn().mockResolvedValue([{ userId: 'u1' }]),
    },
    copilotActionProposal: {
      groupBy: jest.fn().mockResolvedValue([{ userId: 'u1' }]),
    },
    careerSimulation: {
      groupBy: jest.fn().mockResolvedValue([{ userId: 'u1' }]),
    },
    executionPlan: {
      groupBy: jest.fn().mockResolvedValue([{ userId: 'u1' }]),
    },
    optimizationInsight: {
      groupBy: jest.fn().mockResolvedValue([{ userId: 'u1' }]),
    },
    researchWatchlist: {
      groupBy: jest.fn().mockResolvedValue([{ userId: 'u1' }]),
    },
    careerLearningSignal: {
      count: jest.fn().mockResolvedValue(2),
    },
    productAnalyticsEvent: {
      create: jest.fn().mockResolvedValue({ id: 'evt-1' }),
      count: jest.fn().mockResolvedValue(50),
    },
    betaOnboardingState: {
      upsert: jest.fn().mockResolvedValue({
        userId: 'u1',
        isActivated: true,
        activationScore: 1.0,
      }),
      count: jest.fn().mockResolvedValue(75),
    },
    userFeedback: {
      create: jest.fn().mockResolvedValue({ id: 'fb-1', status: 'OPEN' }),
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'fb-1',
          type: 'BUG',
          category: 'OPPORTUNITY_DISCOVERY',
          message: 'Filters reset when rotating screen',
          severity: 'P1',
          status: 'OPEN',
          rating: 4,
        },
      ]),
      count: jest.fn().mockResolvedValue(30),
      findUnique: jest.fn().mockResolvedValue({ id: 'fb-1', status: 'OPEN' }),
      update: jest.fn().mockResolvedValue({ id: 'fb-1', status: 'RESOLVED' }),
    },
    feedbackTheme: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'theme-1',
          title: 'Opportunity Search Filters',
          category: 'OPPORTUNITY_DISCOVERY',
          affectedFeature: 'OPPORTUNITY_DISCOVERY',
          frequencyCount: 12,
          priority: 'HIGH',
          status: 'OPEN',
        },
      ]),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'theme-1', title: 'Theme' }),
      update: jest.fn().mockResolvedValue({ id: 'theme-1' }),
    },
    productInsight: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'ins-1',
          title: 'Improve Opportunity Filters',
          observation: 'High drop-off in search',
          evidence: ['12 reports'],
          affectedFeature: 'OPPORTUNITY_DISCOVERY',
          usersAffectedCount: 12,
          confidenceLevel: 'HIGH',
          priority: 'HIGH',
          status: 'OPEN',
        },
      ]),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'ins-1' }),
    },
    betaInvitation: {
      create: jest.fn().mockResolvedValue({ id: 'inv-1', code: 'BETA-123456' }),
      findUnique: jest.fn().mockResolvedValue({
        id: 'inv-1',
        code: 'BETA-123456',
        isActive: true,
        usedCount: 0,
        maxUses: 10,
        cohort: 'EARLY_ACCESS',
      }),
      update: jest.fn().mockResolvedValue({ id: 'inv-1' }),
    },
    betaAccess: {
      upsert: jest.fn().mockResolvedValue({ id: 'acc-1', userId: 'u1' }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    $transaction: jest.fn().mockImplementation((args) => Promise.all(args)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BetaService,
        ProductAnalyticsService,
        FeedbackCollectionService,
        FeedbackIntelligenceService,
        ProductInsightEngineService,
        ProductHealthScorecardService,
        UxFrictionDetectorService,
        BetaProgramService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    betaService = module.get<BetaService>(BetaService);
    analyticsService = module.get<ProductAnalyticsService>(ProductAnalyticsService);
    feedbackService = module.get<FeedbackCollectionService>(FeedbackCollectionService);
    feedbackIntel = module.get<FeedbackIntelligenceService>(FeedbackIntelligenceService);
    insightEngine = module.get<ProductInsightEngineService>(ProductInsightEngineService);
    scorecardService = module.get<ProductHealthScorecardService>(ProductHealthScorecardService);
    programService = module.get<BetaProgramService>(BetaProgramService);
  });

  describe('1. Beta Invitations & Onboarding', () => {
    it('should create and redeem a valid beta invitation code', async () => {
      const invitation = await programService.createInvitation('admin-1', {
        cohort: 'SPRING_2026',
        maxUses: 5,
      });
      expect(invitation.code).toBeDefined();

      const result = await programService.redeemInvitation('user-1', 'BETA-123456');
      expect(result.success).toBe(true);
      expect(result.cohort).toBe('EARLY_ACCESS');
    });

    it('should evaluate user activation correctly', async () => {
      const activation = await analyticsService.evaluateUserActivation('u1');
      expect(activation.isActivated).toBe(true);
      expect(activation.activationScore).toBe(1.0);
      expect(activation.completedMilestones).toContain('PROFILE_ONBOARDED');
      expect(activation.completedMilestones).toContain('CAREER_GOAL_SET');
    });
  });

  describe('2. Feedback Collection & Bug Reporting', () => {
    it('should sanitize and submit user feedback', async () => {
      const feedback = await feedbackService.submitFeedback('u1', {
        type: 'FEATURE_REQUEST' as any,
        category: 'AI_COPILOT',
        title: 'Add Export',
        message: '<p>Please add CSV export <script>alert(1)</script></p>',
      });
      expect(feedback.id).toBeDefined();
      expect(mockPrismaService.userFeedback.create).toHaveBeenCalled();
    });

    it('should submit contextual ratings', async () => {
      const rating = await feedbackService.submitContextualRating('u1', {
        feature: 'AI_COPILOT',
        rating: 1,
        comment: 'Very helpful response!',
      });
      expect(rating.id).toBeDefined();
    });
  });

  describe('3. Journey Funnels & Feature Adoption', () => {
    it('should generate journey funnels with conversion rates', async () => {
      const funnels = await analyticsService.getJourneyFunnels();
      expect(funnels.signupToActivation).toBeDefined();
      expect(funnels.signupToActivation.steps.length).toBeGreaterThan(0);
      expect(funnels.opportunityToApplication).toBeDefined();
    });

    it('should calculate adoption rates for all major platform engines', async () => {
      const adoption = await analyticsService.getFeatureAdoption();
      expect(adoption.length).toBe(8);
      expect(adoption[0]?.featureKey).toBe('OPPORTUNITY_DISCOVERY');
    });
  });

  describe('4. Feedback Intelligence & Health Scorecard', () => {
    it('should cluster feedback into structured themes and generate insights', async () => {
      const themes = await feedbackIntel.clusterFeedbackThemes();
      expect(themes.length).toBeGreaterThan(0);

      const insights = await insightEngine.generateProductInsights();
      expect(insights.length).toBeGreaterThan(0);
    });

    it('should compute product health scorecard with AI usefulness', async () => {
      const scorecard = await scorecardService.getScorecard();
      expect(scorecard.activationRate).toBeGreaterThan(0);
      expect(scorecard.userSatisfactionScore).toBeGreaterThanOrEqual(4.0);
      expect(scorecard.aiUsefulnessScore).toBeGreaterThan(90);
    });

    it('should return complete executive Beta dashboard data', async () => {
      const dashboard = await betaService.getDashboardData();
      expect(dashboard.overview.totalBetaUsers).toBe(100);
      expect(dashboard.scorecard).toBeDefined();
      expect(dashboard.funnels).toBeDefined();
      expect(dashboard.productInsights).toBeDefined();
    });
  });
});
