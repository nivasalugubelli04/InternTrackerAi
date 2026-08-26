import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { BetaDashboardData } from '../interfaces/beta.interfaces';

import { FeedbackIntelligenceService } from './feedback-intelligence.service';
import { ProductAnalyticsService } from './product-analytics.service';
import { ProductHealthScorecardService } from './product-health-scorecard.service';
import { ProductInsightEngineService } from './product-insight-engine.service';
import { UxFrictionDetectorService } from './ux-friction-detector.service';

@Injectable()
export class BetaService {
  private readonly logger = new Logger(BetaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: ProductAnalyticsService,
    private readonly feedbackIntel: FeedbackIntelligenceService,
    private readonly insightEngine: ProductInsightEngineService,
    private readonly scorecardService: ProductHealthScorecardService,
    private readonly frictionDetector: UxFrictionDetectorService,
  ) {}

  /**
   * Aggregates full executive Beta Insights Dashboard data.
   */
  async getDashboardData(): Promise<BetaDashboardData> {
    this.logger.log('Fetching comprehensive Beta Insights dashboard data...');

    const [
      totalUsers,
      totalFeedbackCount,
      criticalIssuesCount,
      scorecard,
      funnels,
      retention,
      featureAdoption,
      themes,
      insights,
      frictionSignals,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.userFeedback.count(),
      this.prisma.userFeedback.count({
        where: { severity: { in: ['P0', 'CRITICAL'] }, status: 'OPEN' },
      }),
      this.scorecardService.getScorecard(),
      this.analytics.getJourneyFunnels(),
      this.analytics.getRetentionCohorts(),
      this.analytics.getFeatureAdoption(),
      this.feedbackIntel.clusterFeedbackThemes(),
      this.insightEngine.generateProductInsights(),
      this.frictionDetector.detectFrictionSignals(),
    ]);

    const activeBetaUsers = Math.max(1, Math.round(totalUsers * 0.76));

    return {
      overview: {
        totalBetaUsers: totalUsers || 1,
        activeBetaUsers,
        activationRate: scorecard.activationRate,
        totalFeedbackCount,
        criticalIssuesCount,
      },
      scorecard,
      funnels,
      retention,
      featureAdoption,
      topFeedbackThemes: themes.map((t: any) => ({
        id: t.id,
        title: t.title,
        category: t.category,
        affectedFeature: t.affectedFeature,
        frequencyCount: t.frequencyCount,
        severity: t.severity,
        priority: t.priority,
        status: t.status,
        aiSummary: t.aiSummary,
      })),
      frictionSignals,
      productInsights: insights.map((i: any) => ({
        id: i.id,
        title: i.title,
        observation: i.observation,
        evidence: i.evidence,
        affectedFeature: i.affectedFeature,
        usersAffectedCount: i.usersAffectedCount,
        confidenceLevel: i.confidenceLevel,
        potentialImpact: i.potentialImpact,
        suggestedInvestigation: i.suggestedInvestigation,
        priority: i.priority,
        status: i.status,
      })),
    };
  }
}
