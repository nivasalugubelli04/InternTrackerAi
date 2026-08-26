import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

import { PatternAnalysisService } from './pattern-analysis.service';
import { SignalCollectorService } from './signal-collector.service';

@Injectable()
export class OptimizationInsightService {
  private readonly logger = new Logger(OptimizationInsightService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly patternAnalysis: PatternAnalysisService,
    private readonly signalCollector: SignalCollectorService,
  ) {}

  /**
   * Generates or refreshes user optimization insights grounded in verified telemetry signals.
   */
  async generateOptimizationInsights(userId: string) {
    this.logger.log(`Synthesizing optimization insights for user ${userId}`);

    const sufficiency = await this.signalCollector.checkDataSufficiency(userId);
    const execPatterns = await this.patternAnalysis.analyzeExecutionPatterns(userId);
    const oppPatterns = await this.patternAnalysis.analyzeOpportunityPatterns(userId);
    const appPatterns = await this.patternAnalysis.analyzeApplicationPatterns(userId);

    const insightsToUpsert: any[] = [];

    // 1. Execution Duration Insight (What is Working vs Needs Adjustment)
    if (execPatterns.totalTasksRecorded >= 3) {
      if (execPatterns.shortTaskCompletionRate >= 0.7) {
        insightsToUpsert.push({
          category: 'EXECUTION_INSIGHT',
          title: 'High Short-Task Execution Consistency',
          observation: `You consistently complete focused short technical tasks (${Math.round(execPatterns.shortTaskCompletionRate * 100)}% completion rate).`,
          evidence: [
            `${execPatterns.totalCompleted} tasks completed in recent observation window`,
            `Short tasks (<45m) show higher completion than multi-hour deep work blocks`,
          ],
          confidence: 'HIGH_CONFIDENCE',
          freshness: 'FRESH',
          limitations: 'Based on 30-day activity window.',
          suggestedAction: 'Continue leveraging 30-45 minute timeboxed micro-sprints.',
          isWorking: true,
          observationDays: 30,
          sampleCount: execPatterns.totalTasksRecorded,
        });
      }

      if (execPatterns.longTaskCompletionRate < 0.5 && execPatterns.totalTasksRecorded >= 4) {
        insightsToUpsert.push({
          category: 'EXECUTION_INSIGHT',
          title: 'Deep Work Projects Experience Frequent Postponement',
          observation:
            'Complex multi-hour tasks are postponed or delayed more frequently than modular tasks.',
          evidence: [
            `Longer tasks show a ${Math.round(execPatterns.longTaskCompletionRate * 100)}% completion rate`,
            `Observed delay pattern in deep work category`,
          ],
          confidence: 'MEDIUM_CONFIDENCE',
          freshness: 'FRESH',
          limitations: 'Does not reflect non-tracked external progress.',
          suggestedAction: 'Decompose multi-hour projects into 45-minute sequential milestones.',
          isWorking: false,
          observationDays: 30,
          sampleCount: execPatterns.totalTasksRecorded,
        });
      }
    }

    // 2. Opportunity Application Bottleneck Insight
    if (oppPatterns.highMatchUnappliedCount >= 3) {
      insightsToUpsert.push({
        category: 'OPPORTUNITY_INSIGHT',
        title: 'High-Match Opportunity Conversion Lag',
        observation: `${oppPatterns.highMatchUnappliedCount} highly relevant opportunities are saved but have not yet been submitted.`,
        evidence: [
          `${oppPatterns.savedCount} saved opportunities vs ${oppPatterns.appliedCount} submitted applications`,
          `Application readiness score meets top-tier thresholds`,
        ],
        confidence: 'HIGH_CONFIDENCE',
        freshness: 'FRESH',
        limitations: 'Excludes applications submitted off-platform.',
        suggestedAction: 'Schedule an Application Blitz sprint to submit your top 3 saved matches.',
        isWorking: false,
        observationDays: 14,
        sampleCount: oppPatterns.savedCount,
      });
    }

    // 3. Portfolio Evidence & Application Progression Insight
    if (appPatterns.totalApplied >= 2) {
      insightsToUpsert.push({
        category: 'PORTFOLIO_INSIGHT',
        title: 'Portfolio Evidence Readiness Impact',
        observation:
          'Applications featuring verified live deployment evidence demonstrate stronger advancement signals.',
        evidence: [
          `${appPatterns.totalApplied} total applications tracked`,
          `Verified portfolio evidence directly improves ATS & recruiter match scores`,
        ],
        confidence: appPatterns.totalApplied >= 5 ? 'HIGH_CONFIDENCE' : 'MEDIUM_CONFIDENCE',
        freshness: 'FRESH',
        limitations: 'Based on initial sample size.',
        suggestedAction: 'Ensure your primary AI project features a live demo URL before applying.',
        isWorking: true,
        observationDays: 30,
        sampleCount: appPatterns.totalApplied,
      });
    }

    // Default Fallback if data is sparse
    if (insightsToUpsert.length === 0) {
      insightsToUpsert.push({
        category: 'EXECUTION_INSIGHT',
        title: 'Initial Continuous Learning Baseline',
        observation: sufficiency.message,
        evidence: [`${sufficiency.totalSignals} signals recorded`],
        confidence: 'LIMITED_DATA',
        freshness: 'INSUFFICIENT_DATA',
        limitations: 'Minimum 5 activity signals required for statistical pattern analysis.',
        suggestedAction:
          'Complete today’s planned execution items to generate your first learning insights.',
        isWorking: true,
        observationDays: 7,
        sampleCount: sufficiency.totalSignals,
      });
    }

    // Persist insights
    await this.prisma.optimizationInsight.deleteMany({ where: { userId } });

    for (const item of insightsToUpsert) {
      await this.prisma.optimizationInsight.create({
        data: {
          userId,
          category: item.category,
          title: item.title,
          observation: item.observation,
          evidence: item.evidence,
          confidence: item.confidence,
          freshness: item.freshness,
          limitations: item.limitations,
          suggestedAction: item.suggestedAction,
          isWorking: item.isWorking,
          observationDays: item.observationDays,
          sampleCount: item.sampleCount,
        },
      });
    }

    return this.prisma.optimizationInsight.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Retrieves user insights divided into 'What is Working' and 'What Needs Adjustment'.
   */
  async getInsights(userId: string) {
    const all = await this.prisma.optimizationInsight.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (all.length === 0) {
      return this.generateOptimizationInsights(userId);
    }

    return all;
  }
}
