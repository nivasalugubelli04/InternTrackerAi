import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { AddScenarioDto, CreateSimulationDto } from '../dto/create-simulation.dto';
import { ConfidenceLevel, ScenarioResultDto } from '../interfaces/simulation.interfaces';

import { BaselineSnapshotService } from './baseline-snapshot.service';
import { DeterministicImpactService } from './deterministic-impact.service';
import { OpportunityForecastingService } from './opportunity-forecasting.service';
import { RealismConstraintService } from './realism-constraint.service';
import { ScenarioBuilderService } from './scenario-builder.service';
import { ScenarioComparisonService } from './scenario-comparison.service';
import { SimulationAiService } from './simulation-ai.service';
import { SimulationExecutionBridgeService } from './simulation-execution-bridge.service';

@Injectable()
export class SimulationService {
  private readonly logger = new Logger(SimulationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly baselineSnapshotService: BaselineSnapshotService,
    private readonly constraintService: RealismConstraintService,
    private readonly scenarioBuilderService: ScenarioBuilderService,
    private readonly impactService: DeterministicImpactService,
    private readonly forecastingService: OpportunityForecastingService,
    private readonly comparisonService: ScenarioComparisonService,
    private readonly aiService: SimulationAiService,
    private readonly executionBridgeService: SimulationExecutionBridgeService,
  ) {}

  /**
   * Creates and executes a multi-scenario career simulation session.
   */
  async createAndRunSimulation(userId: string, dto: CreateSimulationDto) {
    this.logger.log(`Starting Career Simulation for user ${userId}`);

    // 1. Capture non-destructive Baseline Snapshot
    const baseline = await this.baselineSnapshotService.captureBaseline(userId);

    const title =
      dto.title ||
      `Career Simulation (${new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})`;
    const timeHorizon = dto.timeHorizon || 'ONE_MONTH';
    const targetPathTitle = dto.targetPathTitle || baseline.targetRole || 'Software Engineering';

    const confidenceLevel: ConfidenceLevel =
      baseline.dataCompletenessScore >= 70
        ? 'HIGH'
        : baseline.dataCompletenessScore >= 40
          ? 'MEDIUM'
          : 'LIMITED';

    const confidenceReason =
      confidenceLevel === 'HIGH'
        ? 'High confidence grounded in rich profile skills, multiple projects, and tracked applications.'
        : confidenceLevel === 'MEDIUM'
          ? 'Medium confidence based on standard profile data and moderate evidence signals.'
          : 'Limited confidence due to minimal historical outcome and project data.';

    // 2. Persist root CareerSimulation record
    const simulation = await this.prisma.careerSimulation.create({
      data: {
        userId,
        title,
        description:
          dto.description ||
          'What-if strategic simulation exploring effort trade-offs and opportunity readiness.',
        timeHorizon,
        targetPathTitle,
        baselineSnapshot: baseline as any,
        status: 'RUNNING',
        confidenceLevel,
        confidenceReason,
      },
    });

    // 3. Build scenario templates (Predefined archetypes + custom if provided)
    const archetypes = this.scenarioBuilderService.getPredefinedArchetypes(baseline);
    const scenarioInputs = archetypes.slice(0, 3); // Default to Top 3: Project Acceleration, Application Sprint, Balanced Strategy

    if (dto.customVariables) {
      const custom = this.scenarioBuilderService.buildCustomScenario(
        baseline,
        'Custom User Strategy',
        dto.customVariables,
        dto.customTimeAllocation,
      );
      scenarioInputs.push(custom as any);
    }

    // 4. Process each scenario branch through Deterministic + AI + Forecasting engines
    const scenarioResults: ScenarioResultDto[] = [];

    for (const item of scenarioInputs) {
      const variables =
        typeof item.defaultVariables === 'function'
          ? item.defaultVariables(baseline)
          : (item as any).variables;
      const timeAllocation = item.defaultTimeAllocation || (item as any).timeAllocation;

      // Realism Constraint Engine
      const constraints = this.constraintService.validateConstraints(
        baseline,
        variables,
        timeAllocation,
      );

      // Deterministic Impact Analysis
      const impact = this.impactService.calculateImpact(
        baseline,
        variables,
        timeAllocation,
        constraints,
      );

      // Opportunity Forecasting & Path Comparison
      const opportunityForecasts = await this.forecastingService.forecastOpportunities(
        userId,
        baseline,
        variables,
        impact,
      );
      const careerPathComparisons = this.forecastingService.compareCareerPaths(baseline, impact);

      // AI Narrative with Fallback
      const aiNarrative = await this.aiService.generateScenarioNarrative(
        baseline,
        item.title,
        item.scenarioType,
        variables,
        timeAllocation,
        impact,
        constraints,
      );

      // Proposed Plan Diff for Phase 45
      const scenarioDto: ScenarioResultDto = {
        scenarioKey: item.scenarioKey,
        title: item.title,
        scenarioType: item.scenarioType,
        variables,
        timeAllocation,
        isRealistic: constraints.isRealistic,
        constraintViolations: constraints.violations,
        impactAssessment: impact,
        assumptions: item.assumptions || [],
        confidenceLevel,
        confidenceReason,
        isRecommended: false,
        aiNarrative,
        opportunityForecasts,
        careerPathComparisons,
      };

      const proposedPlan = this.executionBridgeService.generateProposedPlanDiff(
        baseline,
        scenarioDto,
      );
      scenarioDto.proposedPlan = proposedPlan;

      // Persist SimulationScenario in DB
      const dbScenario = await this.prisma.simulationScenario.create({
        data: {
          simulationId: simulation.id,
          scenarioKey: item.scenarioKey,
          title: item.title,
          scenarioType: item.scenarioType,
          variables: variables,
          timeAllocation: timeAllocation as any,
          isRealistic: constraints.isRealistic,
          constraintViolations: constraints.violations,
          impactScores: impact.dimensions as any,
          benefits: impact.benefits,
          tradeOffs: impact.tradeOffs,
          risks: impact.risks as any,
          sensitivityFactors: impact.sensitivityFactors as any,
          assumptions: item.assumptions || [],
          confidenceLevel,
          isRecommended: false,
          aiNarrative,
          proposedPlan: proposedPlan as any,
        },
      });

      scenarioDto.id = dbScenario.id;
      scenarioResults.push(scenarioDto);
    }

    // 5. Compare Scenarios Side-by-Side & Determine Best Balanced Option
    const comparison = this.comparisonService.compareScenarios(simulation.id, scenarioResults);

    // Update isRecommended flag in DB and in memory
    for (const sc of scenarioResults) {
      if (sc.scenarioKey === comparison.bestOptionKey) {
        sc.isRecommended = true;
        if (sc.id) {
          await this.prisma.simulationScenario.update({
            where: { id: sc.id },
            data: { isRecommended: true },
          });
        }
      }
    }

    // Persist SimulationComparison
    await this.prisma.simulationComparison.create({
      data: {
        simulationId: simulation.id,
        bestOptionKey: comparison.bestOptionKey,
        recommendationReason: comparison.recommendationReason,
        comparisonMatrix: comparison.comparisonMatrix as any,
      },
    });

    // Mark Simulation Status COMPLETED
    await this.prisma.careerSimulation.update({
      where: { id: simulation.id },
      data: { status: 'COMPLETED' },
    });

    // Emit CareerEvent
    await this.prisma.careerEvent.create({
      data: {
        userId,
        eventType: 'CareerSimulationCreated',
        source: 'CAREER_SIMULATION',
        entityType: 'CareerSimulation',
        entityId: simulation.id,
        importance: 'INFO',
        metadata: {
          simulationId: simulation.id,
          scenarioCount: scenarioResults.length,
          bestOptionKey: comparison.bestOptionKey,
          confidenceLevel,
        },
      },
    });

    return {
      simulation: {
        id: simulation.id,
        title: simulation.title,
        description: simulation.description,
        timeHorizon: simulation.timeHorizon,
        targetPathTitle: simulation.targetPathTitle,
        confidenceLevel,
        confidenceReason,
        status: 'COMPLETED',
        createdAt: simulation.createdAt,
      },
      baseline,
      scenarios: scenarioResults,
      comparison,
    };
  }

  /**
   * Retrieves all simulation sessions for a user.
   */
  async getUserSimulations(userId: string) {
    return this.prisma.careerSimulation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        scenarios: {
          select: {
            id: true,
            scenarioKey: true,
            title: true,
            scenarioType: true,
            isRealistic: true,
            isRecommended: true,
            confidenceLevel: true,
            benefits: true,
            tradeOffs: true,
          },
        },
        comparison: true,
      },
    });
  }

  /**
   * Retrieves full details for a specific simulation session.
   */
  async getSimulationById(userId: string, simulationId: string) {
    const simulation = await this.prisma.careerSimulation.findFirst({
      where: { id: simulationId, userId },
      include: {
        scenarios: true,
        comparison: true,
      },
    });

    if (!simulation) {
      throw new NotFoundException('Career simulation session not found.');
    }

    return simulation;
  }

  /**
   * Adds a custom scenario to an existing simulation session.
   */
  async addScenario(userId: string, simulationId: string, dto: AddScenarioDto) {
    const simulation = await this.prisma.careerSimulation.findFirst({
      where: { id: simulationId, userId },
      include: { scenarios: true },
    });

    if (!simulation) {
      throw new NotFoundException('Career simulation session not found.');
    }

    const baseline = simulation.baselineSnapshot as any;
    const timeAllocation = dto.timeAllocation || {
      learningPercent: 20,
      projectsPercent: 30,
      applicationsPercent: 20,
      interviewPrepPercent: 20,
      networkingPercent: 10,
    };

    const constraints = this.constraintService.validateConstraints(
      baseline,
      dto.variables,
      timeAllocation as any,
    );
    const impact = this.impactService.calculateImpact(
      baseline,
      dto.variables,
      timeAllocation as any,
      constraints,
    );
    const opportunityForecasts = await this.forecastingService.forecastOpportunities(
      userId,
      baseline,
      dto.variables,
      impact,
    );
    const careerPathComparisons = this.forecastingService.compareCareerPaths(baseline, impact);

    const aiNarrative = await this.aiService.generateScenarioNarrative(
      baseline,
      dto.title,
      dto.scenarioType || 'CUSTOM',
      dto.variables,
      timeAllocation as any,
      impact,
      constraints,
    );

    const scenarioKey = `CUSTOM_${simulation.scenarios.length + 1}`;

    const scenarioDto: ScenarioResultDto = {
      scenarioKey,
      title: dto.title,
      scenarioType: dto.scenarioType || 'CUSTOM',
      variables: dto.variables,
      timeAllocation: timeAllocation as any,
      isRealistic: constraints.isRealistic,
      constraintViolations: constraints.violations,
      impactAssessment: impact,
      assumptions: dto.assumptions || ['User maintains current weekly availability.'],
      confidenceLevel: (simulation.confidenceLevel as any) || 'MEDIUM',
      confidenceReason: simulation.confidenceReason || '',
      isRecommended: false,
      aiNarrative,
      opportunityForecasts,
      careerPathComparisons,
    };

    const proposedPlan = this.executionBridgeService.generateProposedPlanDiff(
      baseline,
      scenarioDto,
    );
    scenarioDto.proposedPlan = proposedPlan;

    const dbScenario = await this.prisma.simulationScenario.create({
      data: {
        simulationId: simulation.id,
        scenarioKey,
        title: dto.title,
        scenarioType: dto.scenarioType || 'CUSTOM',
        variables: dto.variables as any,
        timeAllocation: timeAllocation as any,
        isRealistic: constraints.isRealistic,
        constraintViolations: constraints.violations,
        impactScores: impact.dimensions as any,
        benefits: impact.benefits,
        tradeOffs: impact.tradeOffs,
        risks: impact.risks as any,
        sensitivityFactors: impact.sensitivityFactors as any,
        assumptions: dto.assumptions || [],
        confidenceLevel: simulation.confidenceLevel,
        isRecommended: false,
        aiNarrative,
        proposedPlan: proposedPlan as any,
      },
    });

    scenarioDto.id = dbScenario.id;
    return scenarioDto;
  }

  /**
   * Converts a simulated scenario into an active Phase 45 Career Sprint.
   */
  async activateScenario(userId: string, scenarioId: string) {
    return this.executionBridgeService.activateScenarioPlan(userId, scenarioId);
  }

  /**
   * Deletes a simulation session.
   */
  async deleteSimulation(userId: string, simulationId: string) {
    const simulation = await this.prisma.careerSimulation.findFirst({
      where: { id: simulationId, userId },
    });

    if (!simulation) {
      throw new NotFoundException('Career simulation session not found.');
    }

    await this.prisma.careerSimulation.delete({
      where: { id: simulationId },
    });

    return { success: true, message: 'Career simulation session deleted.' };
  }
}
