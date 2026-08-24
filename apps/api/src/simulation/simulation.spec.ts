import { Test, TestingModule } from '@nestjs/testing';

import { CareerIntelligenceService } from '../career-intelligence/services/career-intelligence.service';
import { PrismaService } from '../prisma/prisma.service';

import { BaselineCareerSnapshot } from './interfaces/simulation.interfaces';
import { BaselineSnapshotService } from './services/baseline-snapshot.service';
import { DeterministicImpactService } from './services/deterministic-impact.service';
import { OpportunityForecastingService } from './services/opportunity-forecasting.service';
import { RealismConstraintService } from './services/realism-constraint.service';
import { ScenarioBuilderService } from './services/scenario-builder.service';
import { ScenarioComparisonService } from './services/scenario-comparison.service';
import { SimulationAiService } from './services/simulation-ai.service';
import { SimulationExecutionBridgeService } from './services/simulation-execution-bridge.service';
import { SimulationService } from './services/simulation.service';

describe('Phase 46 — Career Simulation & Opportunity Forecasting Engine', () => {
  let baselineService: BaselineSnapshotService;
  let constraintService: RealismConstraintService;
  let builderService: ScenarioBuilderService;
  let impactService: DeterministicImpactService;
  let forecastService: OpportunityForecastingService;
  let comparisonService: ScenarioComparisonService;
  let aiService: SimulationAiService;
  let bridgeService: SimulationExecutionBridgeService;
  let simulationService: SimulationService;

  const mockPrisma = {
    profile: { findUnique: jest.fn() },
    userExecutionPreference: { findUnique: jest.fn() },
    careerSprint: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    careerSprintItem: { create: jest.fn() },
    executionPlan: { create: jest.fn() },
    executionPlanItem: { create: jest.fn() },
    externalDataRecord: { findMany: jest.fn() },
    mockInterview: { findMany: jest.fn() },
    careerGoal: { findMany: jest.fn() },
    application: { findMany: jest.fn() },
    careerEvent: { create: jest.fn() },
    careerSimulation: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    simulationScenario: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    simulationComparison: { create: jest.fn() },
  };

  const mockCareerIntelligence = {
    buildCareerState: jest.fn(),
    computeTrajectory: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BaselineSnapshotService,
        RealismConstraintService,
        ScenarioBuilderService,
        DeterministicImpactService,
        OpportunityForecastingService,
        ScenarioComparisonService,
        SimulationAiService,
        SimulationExecutionBridgeService,
        SimulationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CareerIntelligenceService, useValue: mockCareerIntelligence },
      ],
    }).compile();

    baselineService = module.get<BaselineSnapshotService>(BaselineSnapshotService);
    constraintService = module.get<RealismConstraintService>(RealismConstraintService);
    builderService = module.get<ScenarioBuilderService>(ScenarioBuilderService);
    impactService = module.get<DeterministicImpactService>(DeterministicImpactService);
    forecastService = module.get<OpportunityForecastingService>(OpportunityForecastingService);
    comparisonService = module.get<ScenarioComparisonService>(ScenarioComparisonService);
    aiService = module.get<SimulationAiService>(SimulationAiService);
    bridgeService = module.get<SimulationExecutionBridgeService>(SimulationExecutionBridgeService);
    simulationService = module.get<SimulationService>(SimulationService);
  });

  const sampleBaseline: BaselineCareerSnapshot = {
    userId: 'user-123',
    targetRole: 'AI Engineer',
    careerGoals: ['Obtain Summer 2026 AI Internship'],
    skills: [
      { name: 'Python', category: 'Backend', proficiency: 'ADVANCED' },
      { name: 'PyTorch', category: 'AI', proficiency: 'INTERMEDIATE' },
      { name: 'TypeScript', category: 'Frontend', proficiency: 'INTERMEDIATE' },
    ],
    projects: [
      { title: 'Neural Style Transfer', isDeployed: true, techStack: ['Python', 'PyTorch'] },
      { title: 'Portfolio Site', isDeployed: true, techStack: ['React'] },
    ],
    evidenceNodeCount: 4,
    portfolioMaturity: 'DEVELOPING',
    activeApplicationCount: 3,
    totalApplications: 5,
    mockInterviewCount: 2,
    mockInterviewAvgScore: 82,
    networkingContactCount: 4,
    weeklyAvailableMinutes: 600, // 10 hours
    activeSprint: null,
    externalDataSummary: {
      githubReposTracked: 3,
      calendarEventsTracked: 1,
    },
    trajectoryPhase: 'ACCELERATING',
    careerMomentum: 'ACCELERATING',
    dataCompletenessScore: 85,
    dataLimitations: [],
    capturedAt: new Date().toISOString(),
  };

  describe('1. BaselineSnapshotService', () => {
    it('captures an immutable baseline snapshot with complete metrics and data limitations', async () => {
      mockCareerIntelligence.buildCareerState.mockResolvedValue({
        targetRole: 'AI Engineer',
        skills: [{ name: 'Python', category: 'Backend', proficiency: 'ADVANCED' }],
        evidenceNodeCount: 2,
        portfolioMaturity: 'STARTER',
        applicationCount: 2,
        networkingContactCount: 1,
        dataLimitations: [],
      });
      mockCareerIntelligence.computeTrajectory.mockResolvedValue({
        phase: 'GROWING',
        momentum: 'STABLE',
      });
      mockPrisma.profile.findUnique.mockResolvedValue({
        careerGoals: [{ title: 'Get Hired' }],
        projects: [{ title: 'Demo App', liveUrl: 'https://demo.app', technologies: ['React'] }],
      });
      mockPrisma.userExecutionPreference.findUnique.mockResolvedValue({
        dailyAvailableMinutes: 60,
      });
      mockPrisma.careerSprint.findFirst.mockResolvedValue(null);
      mockPrisma.externalDataRecord.findMany.mockResolvedValue([
        { recordType: 'GITHUB_REPOSITORY' },
      ]);
      mockPrisma.mockInterview.findMany.mockResolvedValue([{ score: 80 }]);

      const snapshot = await baselineService.captureBaseline('user-123');

      expect(snapshot).toBeDefined();
      expect(snapshot.targetRole).toBe('AI Engineer');
      expect(snapshot.weeklyAvailableMinutes).toBe(420);
      expect(snapshot.dataCompletenessScore).toBeGreaterThanOrEqual(50);
    });
  });

  describe('2. RealismConstraintService', () => {
    it('validates a sustainable scenario within configured capacity', () => {
      const result = constraintService.validateConstraints(
        sampleBaseline,
        {
          skillInvestment: { skillName: 'MLOps', weeklyHours: 3, durationWeeks: 4 },
          applicationStrategy: { additionalWeeklyApplications: 3 },
        },
        {
          learningPercent: 30,
          projectsPercent: 30,
          applicationsPercent: 20,
          interviewPrepPercent: 10,
          networkingPercent: 10,
        },
      );

      expect(result.isRealistic).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.utilizationPercentage).toBeLessThanOrEqual(125);
    });

    it('identifies and flags impossible overload (> 140% capacity) with adjustment suggestions', () => {
      const overloadVariables = {
        skillInvestment: { skillName: 'CUDA', weeklyHours: 15, durationWeeks: 4 },
        projectStrategy: {
          projectTitle: 'LLM Engine',
          deployToPublic: true,
          weeklyHours: 20,
          targetTechStack: ['C++'],
        },
        applicationStrategy: { additionalWeeklyApplications: 25 },
      };

      const result = constraintService.validateConstraints(
        sampleBaseline, // 10h available
        overloadVariables,
        {
          learningPercent: 40,
          projectsPercent: 40,
          applicationsPercent: 20,
          interviewPrepPercent: 0,
          networkingPercent: 0,
        },
      );

      expect(result.isRealistic).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.adjustmentsSuggested.length).toBeGreaterThan(0);
    });
  });

  describe('3. ScenarioBuilderService', () => {
    it('returns predefined archetypes tailored to baseline role and top project', () => {
      const archetypes = builderService.getPredefinedArchetypes(sampleBaseline);

      expect(archetypes.length).toBeGreaterThanOrEqual(4);
      expect(archetypes.some((a) => a.scenarioType === 'PROJECT_ACCELERATION')).toBe(true);
      expect(archetypes.some((a) => a.scenarioType === 'BALANCED_STRATEGY')).toBe(true);
    });
  });

  describe('4. DeterministicImpactService', () => {
    it('computes 9-dimension ratings, benefits, trade-offs, and sensitivity factors', () => {
      const constraints = constraintService.validateConstraints(
        sampleBaseline,
        {
          projectStrategy: {
            projectTitle: 'Flagship AI',
            deployToPublic: true,
            weeklyHours: 5,
            targetTechStack: ['PyTorch'],
          },
        },
        {
          learningPercent: 20,
          projectsPercent: 50,
          applicationsPercent: 10,
          interviewPrepPercent: 10,
          networkingPercent: 10,
        },
      );

      const impact = impactService.calculateImpact(
        sampleBaseline,
        {
          projectStrategy: {
            projectTitle: 'Flagship AI',
            deployToPublic: true,
            weeklyHours: 5,
            targetTechStack: ['PyTorch'],
          },
        },
        {
          learningPercent: 20,
          projectsPercent: 50,
          applicationsPercent: 10,
          interviewPrepPercent: 10,
          networkingPercent: 10,
        },
        constraints,
      );

      expect(impact.dimensions.PORTFOLIO_STRENGTH.score).toBeGreaterThan(50);
      expect(impact.dimensions.PORTFOLIO_STRENGTH.direction).toBe('STRONG_INCREASE');
      expect(impact.benefits.length).toBeGreaterThan(0);
      expect(impact.tradeOffs.length).toBeGreaterThan(0);
      expect(impact.sensitivityFactors.length).toBeGreaterThan(0);
    });
  });

  describe('5. OpportunityForecastingService', () => {
    it('forecasts readiness trends without fake certainty and compares career paths', async () => {
      mockPrisma.application.findMany.mockResolvedValue([
        {
          id: 'app-1',
          jobTitle: 'AI Research Intern',
          companyName: 'DeepScale AI',
        },
      ]);

      const constraints = constraintService.validateConstraints(
        sampleBaseline,
        {},
        {
          learningPercent: 20,
          projectsPercent: 20,
          applicationsPercent: 20,
          interviewPrepPercent: 20,
          networkingPercent: 20,
        },
      );
      const impact = impactService.calculateImpact(
        sampleBaseline,
        {},
        {
          learningPercent: 20,
          projectsPercent: 20,
          applicationsPercent: 20,
          interviewPrepPercent: 20,
          networkingPercent: 20,
        },
        constraints,
      );

      const forecasts = await forecastService.forecastOpportunities(
        'user-123',
        sampleBaseline,
        {},
        impact,
      );
      expect(forecasts).toHaveLength(1);
      expect(forecasts[0]?.companyName).toBe('DeepScale AI');
      expect(forecasts[0]?.readinessTrend).toBeDefined();

      const paths = forecastService.compareCareerPaths(sampleBaseline, impact);
      expect(paths.length).toBeGreaterThanOrEqual(2);
      expect(paths[0]?.pathTitle).toBeDefined();
    });
  });

  describe('6. ScenarioComparisonService', () => {
    it('selects the best balanced strategy based on composite score and sustainable workload', () => {
      const scenarioA: any = {
        scenarioKey: 'SCENARIO_A',
        title: 'Project Acceleration',
        isRealistic: true,
        confidenceLevel: 'HIGH',
        impactAssessment: {
          overallImpactScore: 82,
          dimensions: { EXECUTION_LOAD: { score: 95 } },
          benefits: ['Strong portfolio'],
          tradeOffs: ['Less apps'],
          risks: [],
        },
      };

      const scenarioB: any = {
        scenarioKey: 'SCENARIO_B',
        title: 'Application Overload',
        isRealistic: false,
        confidenceLevel: 'HIGH',
        impactAssessment: {
          overallImpactScore: 90,
          dimensions: { EXECUTION_LOAD: { score: 150 } },
          benefits: ['Many applications'],
          tradeOffs: ['Severe burnout'],
          risks: [{ description: 'High overload' }],
        },
      };

      const comparison = comparisonService.compareScenarios('sim-1', [scenarioA, scenarioB]);

      expect(comparison.bestOptionKey).toBe('SCENARIO_A');
      expect(comparison.recommendationReason).toContain('Project Acceleration');
    });
  });

  describe('7. SimulationExecutionBridgeService', () => {
    it('converts a simulated scenario into a ProposedPlanDiff and activates a Phase 45 sprint', async () => {
      const scenarioDto: any = {
        scenarioKey: 'SCENARIO_A',
        title: 'Project Acceleration',
        scenarioType: 'PROJECT_ACCELERATION',
        variables: {
          projectStrategy: {
            projectTitle: 'AI Platform',
            deployToPublic: true,
            weeklyHours: 5,
            targetTechStack: ['React'],
          },
        },
      };

      const planDiff = bridgeService.generateProposedPlanDiff(sampleBaseline, scenarioDto);
      expect(planDiff.sprintTitle).toContain('Project Sprint');
      expect(planDiff.suggestedActionItems.length).toBeGreaterThanOrEqual(2);

      // Activation
      mockPrisma.simulationScenario.findFirst.mockResolvedValue({
        id: 'sc-1',
        title: 'Project Acceleration',
        scenarioKey: 'SCENARIO_A',
        scenarioType: 'PROJECT_ACCELERATION',
        proposedPlan: planDiff,
        simulation: { userId: 'user-123' },
      });
      mockPrisma.careerSprint.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.careerSprint.create.mockResolvedValue({
        id: 'sprint-new',
        title: planDiff.sprintTitle,
        status: 'ACTIVE',
      });
      mockPrisma.careerSprintItem.create.mockResolvedValue({ id: 'item-1' });
      mockPrisma.executionPlan.create.mockResolvedValue({ id: 'plan-1' });
      mockPrisma.executionPlanItem.create.mockResolvedValue({ id: 'action-1' });
      mockPrisma.careerEvent.create.mockResolvedValue({ id: 'ev-1' });

      const activation = await bridgeService.activateScenarioPlan('user-123', 'sc-1');
      expect(activation.success).toBe(true);
      expect(activation.sprint.id).toBe('sprint-new');
    });
  });

  describe('8. SimulationAiService Resilience', () => {
    it('generates a deterministic fallback narrative if AI provider is not injected', () => {
      const constraints = constraintService.validateConstraints(
        sampleBaseline,
        {},
        {
          learningPercent: 20,
          projectsPercent: 30,
          applicationsPercent: 20,
          interviewPrepPercent: 20,
          networkingPercent: 10,
        },
      );
      const impact = impactService.calculateImpact(
        sampleBaseline,
        {},
        {
          learningPercent: 20,
          projectsPercent: 30,
          applicationsPercent: 20,
          interviewPrepPercent: 20,
          networkingPercent: 10,
        },
        constraints,
      );

      const narrative = aiService.generateDeterministicFallback(
        'Balanced Strategy',
        'BALANCED_STRATEGY',
        impact,
        constraints,
      );

      expect(narrative).toContain('Balanced Strategy');
      expect(narrative).toContain('Phase 45 Career Sprint');
    });
  });

  describe('9. End-to-End Simulation Execution Flow', () => {
    it('creates and completes a full simulation session across baseline, scenarios, comparison, and persistence', async () => {
      mockCareerIntelligence.buildCareerState.mockResolvedValue({
        targetRole: 'AI Engineer',
        skills: [{ name: 'Python', category: 'AI', proficiency: 'ADVANCED' }],
        projects: [{ title: 'ML App', liveUrl: 'https://ml.app' }],
        evidenceNodeCount: 3,
        portfolioMaturity: 'DEVELOPING',
        applicationCount: 4,
        networkingContactCount: 2,
        dataLimitations: [],
      });
      mockCareerIntelligence.computeTrajectory.mockResolvedValue({
        phase: 'ADVANCING',
        momentum: 'STRONG',
      });
      mockPrisma.careerGoal.findMany.mockResolvedValue([{ targetRole: 'AI Engineer' }]);
      mockPrisma.userExecutionPreference.findUnique.mockResolvedValue({
        dailyAvailableMinutes: 60,
      });
      mockPrisma.careerSprint.findFirst.mockResolvedValue(null);
      mockPrisma.externalDataRecord.findMany.mockResolvedValue([]);
      mockPrisma.mockInterview.findMany.mockResolvedValue([{ score: 85 }]);
      mockPrisma.application.findMany.mockResolvedValue([]);

      mockPrisma.careerSimulation.create.mockResolvedValue({
        id: 'sim-100',
        userId: 'user-123',
        title: 'Career Simulation',
        timeHorizon: 'ONE_MONTH',
        status: 'RUNNING',
        createdAt: new Date(),
      });
      mockPrisma.simulationScenario.create.mockResolvedValue({ id: 'sc-100' });
      mockPrisma.simulationComparison.create.mockResolvedValue({ id: 'comp-100' });
      mockPrisma.careerSimulation.update.mockResolvedValue({ id: 'sim-100', status: 'COMPLETED' });
      mockPrisma.careerEvent.create.mockResolvedValue({ id: 'evt-100' });

      const result = await simulationService.createAndRunSimulation('user-123', {
        title: 'My What-If Lab',
      });

      expect(result.simulation.id).toBe('sim-100');
      expect(result.scenarios.length).toBeGreaterThanOrEqual(3);
      expect(result.comparison.bestOptionKey).toBeDefined();
    });
  });
});
