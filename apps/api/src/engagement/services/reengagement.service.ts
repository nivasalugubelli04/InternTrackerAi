import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { ChurnRiskEvaluation, ChurnRiskType } from '../interfaces/engagement.interfaces';

import { ChannelSelectionService } from './channel-selection.service';

@Injectable()
export class ReengagementService {
  private readonly logger = new Logger(ReengagementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly channelDispatcher: ChannelSelectionService,
  ) {}

  /**
   * Evaluates user churn risk level with explainable reasoning.
   */
  async evaluateChurnRisk(userId: string): Promise<ChurnRiskEvaluation> {
    const [user, state, applications, savedJobs] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.userEngagementState.findUnique({ where: { userId } }),
      this.prisma.application.count({ where: { userId } }),
      this.prisma.savedJob.count({ where: { userId } }),
    ]);

    const lastAction = state?.lastMeaningfulActionAt || user?.createdAt || new Date();
    const daysSinceAction = Math.floor(
      (Date.now() - new Date(lastAction).getTime()) / (1000 * 60 * 60 * 24),
    );

    const reasons: string[] = [];
    let riskScore = 0.0; // 0 to 1.0

    if (daysSinceAction >= 14) {
      riskScore += 0.5;
      reasons.push(`No active platform session or career action in ${daysSinceAction} days.`);
    } else if (daysSinceAction >= 7) {
      riskScore += 0.3;
      reasons.push(`Inactive for ${daysSinceAction} days.`);
    }

    if (state?.activationProgress && state.activationProgress < 0.5) {
      riskScore += 0.3;
      reasons.push('Incomplete initial career onboarding and goal setup.');
    }

    if (applications === 0 && savedJobs === 0) {
      riskScore += 0.2;
      reasons.push('No opportunities saved or tracked yet.');
    }

    let churnRisk: ChurnRiskType = 'LOW';
    if (riskScore >= 0.7) {
      churnRisk = 'HIGH';
    } else if (riskScore >= 0.4) {
      churnRisk = 'MEDIUM';
    }

    const recommendedIntervention =
      churnRisk === 'HIGH'
        ? 'Send 1-click tailored opportunity digest with top 3 verified matches closing this week.'
        : churnRisk === 'MEDIUM'
          ? 'Show simplified Next Best Step on home screen.'
          : 'Maintain standard cadence.';

    await this.prisma.userEngagementState.upsert({
      where: { userId },
      create: {
        userId,
        churnRisk,
        churnRiskReason: reasons.join(' '),
      },
      update: {
        churnRisk,
        churnRiskReason: reasons.join(' '),
      },
    });

    return {
      userId,
      segment: state?.segment || 'ACTIVATED_USER',
      churnRisk,
      score: Math.min(1.0, riskScore),
      explainableReasons: reasons,
      recommendedIntervention,
    };
  }

  /**
   * Evaluates and triggers intelligent re-engagement for inactive users.
   */
  async processInactiveUsersBatch() {
    this.logger.log('Evaluating inactive users for context-aware re-engagement...');

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const inactiveStates = await this.prisma.userEngagementState.findMany({
      where: {
        OR: [{ lastMeaningfulActionAt: { lt: sevenDaysAgo } }, { lastMeaningfulActionAt: null }],
      },
      take: 20,
    });

    for (const state of inactiveStates) {
      const evaluation = await this.evaluateChurnRisk(state.userId);

      if (evaluation.churnRisk === 'HIGH' || evaluation.churnRisk === 'MEDIUM') {
        // Trigger a targeted opportunity alert to re-engage
        await this.channelDispatcher.triggerOpportunityAlert({
          userId: state.userId,
          jobTitle: 'AI & Software Engineering Intern',
          companyName: 'OpenAI / Anthropic Partner',
          matchScore: 94,
          jobId: 'reengage-featured-opp',
        });
      }
    }
  }
}
