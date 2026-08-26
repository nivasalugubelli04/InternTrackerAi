import { Test, TestingModule } from '@nestjs/testing';

import { AI_PROVIDER_TOKEN } from '../ai/providers/ai-provider.interface';
import { PrismaService } from '../prisma/prisma.service';

import { EffectivenessMeasurementService } from './services/effectiveness-measurement.service';
import { LearnedPreferenceService } from './services/learned-preference.service';
import { OptimizationInsightService } from './services/optimization-insight.service';
import { OptimizationService } from './services/optimization.service';
import { PatternAnalysisService } from './services/pattern-analysis.service';
import { SignalCollectorService } from './services/signal-collector.service';
import { StrategyExperimentService } from './services/strategy-experiment.service';
import { StrategyProposalService } from './services/strategy-proposal.service';

describe('Phase 49: Autonomous Career Optimization & Continuous Learning', () => {
  let signalCollector: SignalCollectorService;
  let patternAnalysis: PatternAnalysisService;
  let effectivenessService: EffectivenessMeasurementService;
  let insightService: OptimizationInsightService;
  let proposalService: StrategyProposalService;
  let experimentService: StrategyExperimentService;
  let preferenceService: LearnedPreferenceService;
  let optimizationService: OptimizationService;

  const mockUserId = '11111111-1111-1111-1111-111111111111';

  // In-memory data store for isolated testing
  const mockSignals: any[] = [];
  const mockOutcomes: any[] = [];
  const mockFeedbacks: any[] = [];
  const mockInsights: any[] = [];
  const mockProposals: any[] = [];
  const mockExperiments: any[] = [];
  const mockPreferences: any[] = [];
  const mockExecutionPlans: any[] = [];
  const mockPlanItems: any[] = [];
  const mockEvents: any[] = [];

  const mockPrisma = {
    careerLearningSignal: {
      create: jest.fn().mockImplementation(({ data }) => {
        const item = { id: `sig-${mockSignals.length + 1}`, ...data, createdAt: new Date() };
        mockSignals.push(item);
        return item;
      }),
      findMany: jest.fn().mockImplementation(({ where }) => {
        return mockSignals.filter(
          (s) =>
            s.userId === where.userId &&
            (where.qualityPassed === undefined || s.qualityPassed === where.qualityPassed),
        );
      }),
      count: jest.fn().mockImplementation(({ where }) => {
        return mockSignals.filter(
          (s) =>
            s.userId === where.userId &&
            (where.qualityPassed === undefined || s.qualityPassed === where.qualityPassed),
        ).length;
      }),
    },
    careerLearningOutcome: {
      create: jest.fn().mockImplementation(({ data }) => {
        const item = { id: `out-${mockOutcomes.length + 1}`, ...data, createdAt: new Date() };
        mockOutcomes.push(item);
        return item;
      }),
    },
    careerOptimizationFeedback: {
      create: jest.fn().mockImplementation(({ data }) => {
        const item = { id: `fb-${mockFeedbacks.length + 1}`, ...data, createdAt: new Date() };
        mockFeedbacks.push(item);
        return item;
      }),
      findMany: jest.fn().mockImplementation(({ where }) => {
        return mockFeedbacks.filter((f) => f.userId === where.userId);
      }),
    },
    optimizationInsight: {
      create: jest.fn().mockImplementation(({ data }) => {
        const item = {
          id: `ins-${mockInsights.length + 1}`,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockInsights.push(item);
        return item;
      }),
      deleteMany: jest.fn().mockImplementation(() => {
        mockInsights.length = 0;
        return { count: 0 };
      }),
      findMany: jest.fn().mockImplementation(({ where }) => {
        return mockInsights.filter((i) => i.userId === where.userId);
      }),
    },
    optimizationProposal: {
      create: jest.fn().mockImplementation(({ data }) => {
        const item = {
          id: `prop-${mockProposals.length + 1}`,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockProposals.push(item);
        return item;
      }),
      findMany: jest.fn().mockImplementation(({ where }) => {
        return mockProposals.filter(
          (p) => p.userId === where.userId && (!where.status || p.status === where.status),
        );
      }),
      findFirst: jest.fn().mockImplementation(({ where }) => {
        return mockProposals.find((p) => p.id === where.id && p.userId === where.userId) || null;
      }),
      update: jest.fn().mockImplementation(({ where, data }) => {
        const idx = mockProposals.findIndex((p) => p.id === where.id);
        if (idx >= 0) {
          mockProposals[idx] = { ...mockProposals[idx], ...data, updatedAt: new Date() };
          return mockProposals[idx];
        }
        return null;
      }),
    },
    strategyExperiment: {
      create: jest.fn().mockImplementation(({ data }) => {
        const item = {
          id: `exp-${mockExperiments.length + 1}`,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockExperiments.push(item);
        return item;
      }),
      findMany: jest.fn().mockImplementation(({ where }) => {
        return mockExperiments.filter((e) => e.userId === where.userId);
      }),
      findFirst: jest.fn().mockImplementation(({ where }) => {
        return mockExperiments.find((e) => e.id === where.id && e.userId === where.userId) || null;
      }),
      update: jest.fn().mockImplementation(({ where, data }) => {
        const idx = mockExperiments.findIndex((e) => e.id === where.id);
        if (idx >= 0) {
          mockExperiments[idx] = { ...mockExperiments[idx], ...data, updatedAt: new Date() };
          return mockExperiments[idx];
        }
        return null;
      }),
    },
    learnedPreference: {
      create: jest.fn().mockImplementation(({ data }) => {
        const item = {
          id: `pref-${mockPreferences.length + 1}`,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockPreferences.push(item);
        return item;
      }),
      findMany: jest.fn().mockImplementation(({ where }) => {
        return mockPreferences.filter((p) => p.userId === where.userId);
      }),
      findFirst: jest.fn().mockImplementation(({ where }) => {
        return mockPreferences.find((p) => p.id === where.id && p.userId === where.userId) || null;
      }),
      update: jest.fn().mockImplementation(({ where, data }) => {
        const idx = mockPreferences.findIndex((p) => p.id === where.id);
        if (idx >= 0) {
          mockPreferences[idx] = { ...mockPreferences[idx], ...data, updatedAt: new Date() };
          return mockPreferences[idx];
        }
        return null;
      }),
      delete: jest.fn().mockImplementation(({ where }) => {
        const idx = mockPreferences.findIndex((p) => p.id === where.id);
        if (idx >= 0) {
          const removed = mockPreferences.splice(idx, 1)[0];
          return removed;
        }
        return null;
      }),
    },
    executionPlan: {
      findFirst: jest.fn().mockImplementation(({ where }) => {
        return (
          mockExecutionPlans.find((p) => p.userId === where.userId && p.status === where.status) ||
          null
        );
      }),
      create: jest.fn().mockImplementation(({ data }) => {
        const item = {
          id: `plan-${mockExecutionPlans.length + 1}`,
          ...data,
          createdAt: new Date(),
        };
        mockExecutionPlans.push(item);
        return item;
      }),
    },
    executionPlanItem: {
      create: jest.fn().mockImplementation(({ data }) => {
        const item = { id: `item-${mockPlanItems.length + 1}`, ...data, createdAt: new Date() };
        mockPlanItems.push(item);
        return item;
      }),
    },
    careerEvent: {
      create: jest.fn().mockImplementation(({ data }) => {
        const item = { id: `evt-${mockEvents.length + 1}`, ...data, createdAt: new Date() };
        mockEvents.push(item);
        return item;
      }),
    },
    application: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'app-1', status: 'INTERVIEWING', resumeId: 'res-1' },
        { id: 'app-2', status: 'APPLIED', resumeId: 'res-2' },
      ]),
      count: jest.fn().mockResolvedValue(2),
    },
    savedJob: {
      count: jest.fn().mockResolvedValue(5),
    },
    dismissedJob: {
      count: jest.fn().mockResolvedValue(1),
    },
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SignalCollectorService,
        PatternAnalysisService,
        EffectivenessMeasurementService,
        OptimizationInsightService,
        StrategyProposalService,
        StrategyExperimentService,
        LearnedPreferenceService,
        OptimizationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AI_PROVIDER_TOKEN, useValue: { chat: jest.fn().mockResolvedValue('{}') } },
      ],
    }).compile();

    signalCollector = module.get<SignalCollectorService>(SignalCollectorService);
    patternAnalysis = module.get<PatternAnalysisService>(PatternAnalysisService);
    effectivenessService = module.get<EffectivenessMeasurementService>(
      EffectivenessMeasurementService,
    );
    insightService = module.get<OptimizationInsightService>(OptimizationInsightService);
    proposalService = module.get<StrategyProposalService>(StrategyProposalService);
    experimentService = module.get<StrategyExperimentService>(StrategyExperimentService);
    preferenceService = module.get<LearnedPreferenceService>(LearnedPreferenceService);
    optimizationService = module.get<OptimizationService>(OptimizationService);
  });

  describe('1. Learning Signal System & Data Quality Checks', () => {
    it('should validate and record learning signals', async () => {
      const signal = await signalCollector.recordSignal({
        userId: mockUserId,
        signalType: 'TASK_COMPLETED',
        sourceEngine: 'EXECUTION_ENGINE',
        payload: { estimatedMinutes: 30, taskTitle: 'Implement Prisma schema' },
        confidence: 1.0,
      });

      expect(signal).toBeDefined();
      expect(signal.qualityPassed).toBe(true);
      expect(mockSignals.length).toBe(1);
    });

    it('should evaluate data sufficiency correctly', async () => {
      // 1 signal -> insufficient (<5)
      const check1 = await signalCollector.checkDataSufficiency(mockUserId);
      expect(check1.isSufficient).toBe(false);

      // Add 4 more signals
      for (let i = 0; i < 4; i++) {
        await signalCollector.recordSignal({
          userId: mockUserId,
          signalType: 'TASK_COMPLETED',
          sourceEngine: 'EXECUTION_ENGINE',
          payload: { estimatedMinutes: 30 },
        });
      }

      // 5 signals -> sufficient
      const check2 = await signalCollector.checkDataSufficiency(mockUserId);
      expect(check2.isSufficient).toBe(true);
      expect(check2.totalSignals).toBe(5);
    });
  });

  describe('2. Pattern Discovery & Bottleneck Analysis', () => {
    it('should detect short task consistency vs long task delay patterns', async () => {
      // Add long tasks delayed/skipped
      await signalCollector.recordSignal({
        userId: mockUserId,
        signalType: 'TASK_DELAYED',
        sourceEngine: 'EXECUTION_ENGINE',
        payload: { estimatedMinutes: 120 },
      });
      await signalCollector.recordSignal({
        userId: mockUserId,
        signalType: 'TASK_SKIPPED',
        sourceEngine: 'EXECUTION_ENGINE',
        payload: { estimatedMinutes: 90 },
      });

      const patterns = await patternAnalysis.analyzeExecutionPatterns(mockUserId);
      expect(patterns.totalTasksRecorded).toBe(7);
      expect(patterns.shortTaskCompletionRate).toBeGreaterThanOrEqual(0.8);
      expect(patterns.longTaskCompletionRate).toBeLessThan(0.5);
      expect(patterns.frequentDelayCategory).toBe('DEEP_WORK_PROJECTS');
    });

    it('should discover high-match unapplied opportunity lag', async () => {
      const oppPatterns = await patternAnalysis.analyzeOpportunityPatterns(mockUserId);
      expect(oppPatterns.savedCount).toBe(5);
      expect(oppPatterns.appliedCount).toBe(2);
      expect(oppPatterns.highMatchUnappliedCount).toBe(3);
    });
  });

  describe('3. Outcome Tracking & Recommendation Effectiveness', () => {
    it('should record career outcomes with correlation types', async () => {
      const outcome = await effectivenessService.recordOutcome({
        userId: mockUserId,
        actionName: 'Deploy Portfolio Demo',
        actionCategory: 'PORTFOLIO',
        observedOutcome: 'Application readiness score increased by +12 points',
        correlationType: 'LIKELY_CONTRIBUTOR',
        readinessImpact: 12.0,
      });

      expect(outcome.actionName).toBe('Deploy Portfolio Demo');
      expect(outcome.correlationType).toBe('LIKELY_CONTRIBUTOR');
    });

    it('should record recommendation feedback and compute helpfulness rate', async () => {
      await effectivenessService.recordRecommendationFeedback({
        userId: mockUserId,
        recommendationType: 'SKILL_IMPROVEMENT',
        response: 'HELPFUL',
        comment: 'Very practical advice',
      });
      await effectivenessService.recordRecommendationFeedback({
        userId: mockUserId,
        recommendationType: 'TASK_DURATION',
        response: 'HELPFUL',
      });

      const eff = await effectivenessService.getRecommendationEffectiveness(mockUserId);
      expect(eff.totalFeedbackCount).toBe(2);
      expect(eff.helpfulRate).toBe(1.0);
    });
  });

  describe('4. Optimization Insight Synthesis (What is Working vs Needs Adjustment)', () => {
    it('should generate categorized insights with evidence, confidence, and freshness', async () => {
      const insights = await insightService.generateOptimizationInsights(mockUserId);
      expect(insights.length).toBeGreaterThanOrEqual(2);

      const working = insights.filter((i) => i.isWorking);
      const adjustment = insights.filter((i) => !i.isWorking);

      expect(working.length).toBeGreaterThan(0);
      expect(adjustment.length).toBeGreaterThan(0);

      const shortTaskInsight = working.find((i) => i.category === 'EXECUTION_INSIGHT');
      expect(shortTaskInsight).toBeDefined();
      expect(shortTaskInsight!.confidence).toBe('HIGH_CONFIDENCE');
      expect(shortTaskInsight!.evidence.length).toBeGreaterThan(0);
    });
  });

  describe('5. Strategy Proposal & User Approval Model', () => {
    it('should generate actionable proposals with expected benefit and trade-offs', async () => {
      const proposals = await proposalService.generateProposals(mockUserId);
      expect(proposals.length).toBeGreaterThan(0);
      expect(proposals[0].status).toBe('PENDING');
      expect(proposals[0].expectedBenefit).toBeDefined();
      expect(proposals[0].tradeOff).toBeDefined();
    });

    it('should execute proposal only upon explicit user approval and update Phase 45 Execution Plan', async () => {
      const proposal = mockProposals[0];
      const result = await proposalService.approveProposal(mockUserId, proposal.id);

      expect(result.success).toBe(true);
      expect(result.proposal.status).toBe('APPLIED');
      expect(mockPlanItems.length).toBeGreaterThan(0);
      expect(mockEvents.some((e) => e.eventType === 'StrategyOptimizationApproved')).toBe(true);
    });
  });

  describe('6. Controlled Strategy Experiments', () => {
    it('should create and track timeboxed 14-day A/B strategy experiments', async () => {
      const exp = await experimentService.createExperiment({
        userId: mockUserId,
        title: 'Portfolio Sprint vs Application Blitz',
        hypothesis: 'Dedication to live deployment will increase recruiter response rate.',
        durationDays: 14,
        strategyA: 'Continuous general applications (Control)',
        strategyB: 'Portfolio deployment first (Variant)',
      });

      expect(exp.id).toBeDefined();
      expect(exp.status).toBe('ACTIVE');
      expect(exp.metricsBaseline).toBeDefined();

      const stopped = await experimentService.stopExperiment(mockUserId, exp.id);
      expect(stopped.status).toBe('COMPLETED');
    });
  });

  describe('7. User-Controlled Learned Preferences', () => {
    it('should allow users to view, update toggle, and delete learned preferences', async () => {
      const prefs = await preferenceService.getPreferences(mockUserId);
      expect(prefs.length).toBeGreaterThanOrEqual(3);

      const prefId = prefs[0].id;
      const updated = await preferenceService.updatePreference(mockUserId, prefId, {
        isEnabled: false,
      });
      expect(updated.isEnabled).toBe(false);

      const deleted = await preferenceService.deletePreference(mockUserId, prefId);
      expect(deleted.id).toBe(prefId);
    });
  });

  describe('8. Aggregated Dashboard & End-to-End Closed Loop', () => {
    it('should return complete Optimization Dashboard data matching Phase 49 contract', async () => {
      const dashboard = await optimizationService.getDashboardData(mockUserId);

      expect(dashboard.whatIsWorking).toBeDefined();
      expect(dashboard.whatNeedsAdjustment).toBeDefined();
      expect(dashboard.executionPatterns).toBeDefined();
      expect(dashboard.proposals).toBeDefined();
      expect(dashboard.activeExperiments).toBeDefined();
      expect(dashboard.learnedPreferences).toBeDefined();
      expect(dashboard.dataSufficiency.isSufficient).toBe(true);
    });
  });
});
