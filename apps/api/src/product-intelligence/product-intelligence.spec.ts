import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';

import {
  MetricCategory,
  FeatureHealthClassification,
  ImprovementPriority,
  ImprovementStatus,
  ExperimentStatus,
  ExperimentDecision,
} from './dto/product-intelligence.dto';
import { ActivationFunnelService } from './services/activation-funnel.service';
import { AiQualityMonitoringService } from './services/ai-quality-monitoring.service';
import { FeatureAdoptionService } from './services/feature-adoption.service';
import { FeedbackIntelligenceService } from './services/feedback-intelligence.service';
import { JourneyFrictionService } from './services/journey-friction.service';
import { MetricsRegistryService } from './services/metrics-registry.service';
import { ProductExperimentService } from './services/product-experiment.service';
import { ProductHealthService } from './services/product-health.service';
import { ProductPrioritizationService } from './services/product-prioritization.service';
import { RetentionCohortService } from './services/retention-cohort.service';
import { WeeklyReviewService } from './services/weekly-review.service';

describe('Phase 57 — Post-Launch Product Intelligence Tests', () => {
  let healthService: ProductHealthService;
  let metricsRegistry: MetricsRegistryService;
  let funnelService: ActivationFunnelService;
  let adoptionService: FeatureAdoptionService;
  let frictionService: JourneyFrictionService;
  let feedbackService: FeedbackIntelligenceService;
  let aiQualityService: AiQualityMonitoringService;
  let retentionService: RetentionCohortService;
  let experimentService: ProductExperimentService;
  let prioritizationService: ProductPrioritizationService;
  let weeklyReviewService: WeeklyReviewService;

  const mockPrismaService = {
    user: {
      count: jest.fn().mockResolvedValue(150),
    },
    profile: {
      count: jest.fn().mockResolvedValue(138),
    },
    userGoal: {
      count: jest.fn().mockResolvedValue(126),
      groupBy: jest.fn().mockResolvedValue([{ userId: 'u-1' }, { userId: 'u-2' }]),
    },
    userSkill: {
      groupBy: jest.fn().mockResolvedValue([{ userId: 'u-1' }]),
    },
    careerInsight: {
      groupBy: jest.fn().mockResolvedValue([{ userId: 'u-1' }]),
    },
    savedJob: {
      groupBy: jest.fn().mockResolvedValue([{ userId: 'u-1' }]),
    },
    application: {
      count: jest.fn().mockResolvedValue(95),
      groupBy: jest.fn().mockResolvedValue([{ userId: 'u-1' }]),
    },
    supportTicket: {
      count: jest.fn().mockResolvedValue(4),
      findMany: jest.fn().mockResolvedValue([
        { priority: 'CRITICAL', status: 'OPEN' },
        { priority: 'MEDIUM', status: 'RESOLVED' },
      ]),
    },
    userBehaviorEvent: {
      groupBy: jest.fn().mockResolvedValue([{ userId: 'u-1' }, { userId: 'u-2' }]),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation(({ data }) => ({
        id: 'event-1',
        ...data,
        createdAt: new Date(),
      })),
    },
    userFeedback: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'fb-1',
          type: 'FEATURE_REQUEST',
          rating: 5,
          status: 'OPEN',
          feedback: 'Calendar sync needed',
        },
      ]),
    },
    productExperiment: {
      create: jest.fn().mockImplementation(({ data }) => ({
        id: 'exp-1',
        ...data,
        createdAt: new Date(),
      })),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue({
        id: 'exp-1',
        status: ExperimentStatus.RUNNING,
        decision: ExperimentDecision.PENDING,
      }),
      update: jest.fn().mockImplementation(({ data }) => ({
        id: 'exp-1',
        ...data,
      })),
    },
    productImprovementItem: {
      create: jest.fn().mockImplementation(({ data }) => ({
        id: 'imp-1',
        ...data,
        createdAt: new Date(),
      })),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue({
        id: 'imp-1',
        status: ImprovementStatus.BACKLOG,
        priority: ImprovementPriority.P1,
      }),
      update: jest.fn().mockImplementation(({ data }) => ({
        id: 'imp-1',
        ...data,
      })),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductHealthService,
        MetricsRegistryService,
        ActivationFunnelService,
        FeatureAdoptionService,
        JourneyFrictionService,
        FeedbackIntelligenceService,
        AiQualityMonitoringService,
        RetentionCohortService,
        ProductExperimentService,
        ProductPrioritizationService,
        WeeklyReviewService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    healthService = module.get<ProductHealthService>(ProductHealthService);
    metricsRegistry = module.get<MetricsRegistryService>(MetricsRegistryService);
    funnelService = module.get<ActivationFunnelService>(ActivationFunnelService);
    adoptionService = module.get<FeatureAdoptionService>(FeatureAdoptionService);
    frictionService = module.get<JourneyFrictionService>(JourneyFrictionService);
    feedbackService = module.get<FeedbackIntelligenceService>(FeedbackIntelligenceService);
    aiQualityService = module.get<AiQualityMonitoringService>(AiQualityMonitoringService);
    retentionService = module.get<RetentionCohortService>(RetentionCohortService);
    experimentService = module.get<ProductExperimentService>(ProductExperimentService);
    prioritizationService = module.get<ProductPrioritizationService>(ProductPrioritizationService);
    weeklyReviewService = module.get<WeeklyReviewService>(WeeklyReviewService);
  });

  describe('1. Post-Launch Health Dashboard & Metrics Catalog', () => {
    it('should aggregate active users, activation rate, AI satisfaction, and reliability', async () => {
      const overview = await healthService.getHealthOverview();
      expect(overview.activeUsers.dau).toBeGreaterThan(0);
      expect(overview.activation.overallActivationRate).toBeGreaterThan(0);
      expect(overview.aiQuality.userSatisfactionScore).toBeGreaterThan(4.0);
      expect(overview.systemReliability.apiErrorRatePercentage).toBeLessThan(1.0);
    });

    it('should return defined metrics with formal formulas and targets across categories', () => {
      const metrics = metricsRegistry.getStandardMetrics();
      expect(metrics.length).toBeGreaterThanOrEqual(6);
      expect(metrics.some((m) => m.category === MetricCategory.ACTIVATION)).toBe(true);
      expect(metrics.some((m) => m.category === MetricCategory.RETENTION)).toBe(true);
      expect(metrics.every((m) => m.formula.length > 5)).toBe(true);
    });
  });

  describe('2. Core Activation Funnel & Drop-off Diagnostics', () => {
    it('should calculate 7-stage conversion funnel and identify drop-off stages', async () => {
      const funnel = await funnelService.getActivationFunnel();
      expect(funnel.stages.length).toBe(7);
      expect(funnel.overallConversionRate).toBeGreaterThan(0);
      expect(funnel.highestDropoffStage).toBeDefined();
      expect(funnel.recommendedAction).toBeDefined();
    });
  });

  describe('3. Feature Adoption & Health Classification', () => {
    it('should classify features into high value, growing, and underdiscovered categories', async () => {
      const matrix = await adoptionService.getFeatureAdoptionMatrix();
      expect(matrix.length).toBeGreaterThan(0);

      const highValue = matrix.filter(
        (f) => f.healthClassification === FeatureHealthClassification.HIGH_VALUE,
      );
      expect(highValue.length).toBeGreaterThan(0);
      expect(matrix.every((f) => f.rootCauseAnalysis.length > 5)).toBe(true);
    });
  });

  describe('4. Journey Friction & Churn Risk Signals', () => {
    it('should detect friction signals and evaluate churn risk profiles', async () => {
      const friction = await frictionService.detectFrictionSignals();
      expect(friction.length).toBeGreaterThan(0);
      expect(friction[0]?.recommendedMitigation).toBeDefined();

      const churn = await frictionService.getChurnRiskAnalysis();
      expect(churn.some((c) => c.riskLevel === 'CRITICAL')).toBe(true);
    });
  });

  describe('5. Feedback Intelligence & AI Quality Feedback Loop', () => {
    it('should cluster feedback trends and identify knowledge gaps', async () => {
      const trends = await feedbackService.getFeedbackTrends();
      expect(trends.length).toBeGreaterThan(0);
      expect(trends[0]?.growthRatePercentage).toBeDefined();

      const gaps = await feedbackService.getKnowledgeGaps();
      expect(gaps.length).toBeGreaterThan(0);
    });

    it('should monitor AI feature latency and produce prompt improvement proposals', async () => {
      const aiReport = await aiQualityService.getAiQualityReport();
      expect(aiReport.length).toBeGreaterThan(0);
      expect(aiReport[0]?.topPromptImprovementProposal).toBeDefined();
      expect(aiReport[0]?.successRatePercentage).toBeGreaterThan(95.0);
    });
  });

  describe('6. Retention Cohort Analysis & Engagement Model', () => {
    it('should compute cohort retention matrix and return engagement distribution', async () => {
      const cohorts = await retentionService.getCohortMatrix();
      expect(cohorts.length).toBeGreaterThan(0);
      expect(cohorts[0]?.d7Retention).toBeGreaterThan(50.0);

      const engagement = retentionService.getEngagementModel();
      expect(engagement.dimensions.length).toBe(4);
      expect(engagement.distribution.powerUsersPercentage).toBeGreaterThan(0);
    });
  });

  describe('7. A/B Experimentation & Product Improvement Queue', () => {
    it('should create and update A/B product experiments', async () => {
      const exp = await experimentService.createExperiment({
        experimentKey: 'EXP_TEST_MOCK_1',
        name: 'Mock Interview iCal CTA',
        hypothesis: 'Adding iCal sync boosts practice completion by 20%',
        targetMetric: 'PRACTICE_COMPLETION',
        variants: [
          { key: 'control', weight: 50 },
          { key: 'variant_a', weight: 50 },
        ],
      });

      expect(exp.id).toBe('exp-1');

      const updated = await experimentService.updateExperiment('exp-1', {
        decision: ExperimentDecision.KEEP,
        status: ExperimentStatus.CONCLUDED,
      });

      expect(updated.decision).toBe(ExperimentDecision.KEEP);
    });

    it('should calculate RICE score and prioritize backlog items', async () => {
      const rice = prioritizationService.calculateRiceScore(9.0, 8.0, 8.5, 9.0, 3.0, 50);
      expect(rice).toBeGreaterThan(100);

      const item = await prioritizationService.createImprovement({
        title: 'Instant 1-Click iCal Export for Mock Interviews',
        problemSummary: 'Candidates miss scheduled interviews',
        evidenceDetails: '18 support tickets',
        affectedFeature: 'INTERVIEWS',
        affectedUserCount: 65,
        severity: 'HIGH',
        frequency: 'RECURRING',
        userImpactScore: 9.0,
        implementationEffort: 3.0,
      });

      expect(item.id).toBe('imp-1');
      expect(item.calculatedRiceScore).toBeGreaterThan(0);
    });
  });

  describe('8. Weekly Executive Review Snapshot', () => {
    it('should generate executive summary distinguishing facts from hypotheses', async () => {
      const review = await weeklyReviewService.generateWeeklyReview();
      expect(review.measuredFacts.length).toBeGreaterThan(0);
      expect(review.inferences.length).toBeGreaterThan(0);
      expect(review.hypothesesForTesting.length).toBeGreaterThan(0);
      expect(review.releaseImpact.healthVerdict).toBe('HEALTHY');
    });
  });
});
