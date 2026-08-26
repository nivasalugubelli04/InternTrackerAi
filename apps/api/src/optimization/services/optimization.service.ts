import { Injectable, Logger } from '@nestjs/common';

import { OptimizationDashboardData } from '../interfaces/optimization.interfaces';

import { EffectivenessMeasurementService } from './effectiveness-measurement.service';
import { LearnedPreferenceService } from './learned-preference.service';
import { OptimizationInsightService } from './optimization-insight.service';
import { PatternAnalysisService } from './pattern-analysis.service';
import { SignalCollectorService } from './signal-collector.service';
import { StrategyExperimentService } from './strategy-experiment.service';
import { StrategyProposalService } from './strategy-proposal.service';

@Injectable()
export class OptimizationService {
  private readonly logger = new Logger(OptimizationService.name);

  constructor(
    private readonly signalCollector: SignalCollectorService,
    private readonly patternAnalysis: PatternAnalysisService,
    private readonly effectiveness: EffectivenessMeasurementService,
    private readonly insightService: OptimizationInsightService,
    private readonly proposalService: StrategyProposalService,
    private readonly experimentService: StrategyExperimentService,
    private readonly preferenceService: LearnedPreferenceService,
  ) {}

  /**
   * Aggregates the full optimization dashboard data.
   */
  async getDashboardData(userId: string): Promise<OptimizationDashboardData> {
    this.logger.log(`Generating optimization dashboard for user ${userId}`);

    const [
      sufficiency,
      execPatterns,
      insights,
      proposals,
      experiments,
      preferences,
      effectivenessData,
    ] = await Promise.all([
      this.signalCollector.checkDataSufficiency(userId),
      this.patternAnalysis.analyzeExecutionPatterns(userId),
      this.insightService.getInsights(userId),
      this.proposalService.generateProposals(userId),
      this.experimentService.getExperiments(userId),
      this.preferenceService.getPreferences(userId),
      this.effectiveness.getRecommendationEffectiveness(userId),
    ]);

    const whatIsWorking = insights
      .filter((i) => i.isWorking)
      .map((i) => ({
        id: i.id,
        category: i.category as any,
        title: i.title,
        observation: i.observation,
        evidence: i.evidence,
        confidence: i.confidence as any,
        observationDays: i.observationDays,
      }));

    const whatNeedsAdjustment = insights
      .filter((i) => !i.isWorking)
      .map((i) => ({
        id: i.id,
        category: i.category as any,
        title: i.title,
        observation: i.observation,
        evidence: i.evidence,
        confidence: i.confidence as any,
        suggestedAction: i.suggestedAction,
        observationDays: i.observationDays,
      }));

    return {
      whatIsWorking,
      whatNeedsAdjustment,
      executionPatterns: execPatterns,
      proposals: proposals.map((p) => ({
        id: p.id,
        currentStrategy: p.currentStrategy,
        observation: p.observation,
        proposedChange: p.proposedChange,
        expectedBenefit: p.expectedBenefit,
        tradeOff: p.tradeOff,
        confidence: p.confidence,
        status: p.status,
        actionPayload: p.actionPayload,
      })),
      activeExperiments: experiments.map((e) => ({
        id: e.id,
        title: e.title,
        hypothesis: e.hypothesis,
        durationDays: e.durationDays,
        strategyA: e.strategyA,
        strategyB: e.strategyB,
        status: e.status as any,
        metricsCurrent: e.metricsCurrent,
      })),
      learnedPreferences: preferences.map((pr) => ({
        id: pr.id,
        key: pr.key,
        value: pr.value,
        confidence: pr.confidence,
        isEnabled: pr.isEnabled,
      })),
      recommendationEffectiveness: effectivenessData,
      dataSufficiency: sufficiency,
    };
  }
}
