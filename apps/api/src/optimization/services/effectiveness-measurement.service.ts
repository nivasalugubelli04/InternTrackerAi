import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import {
  OutcomeCorrelationType,
  CareerOptimizationFeedbackResponse,
} from '../interfaces/optimization.interfaces';

@Injectable()
export class EffectivenessMeasurementService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Records an observed career outcome linking an intervention with career readiness impact.
   */
  async recordOutcome(params: {
    userId: string;
    actionName: string;
    actionCategory: string;
    observedOutcome: string;
    correlationType?: OutcomeCorrelationType;
    readinessImpact?: number;
    evidence?: string[];
  }) {
    return this.prisma.careerLearningOutcome.create({
      data: {
        userId: params.userId,
        actionName: params.actionName,
        actionCategory: params.actionCategory,
        observedOutcome: params.observedOutcome,
        correlationType: (params.correlationType || 'OBSERVED_CORRELATION') as any,
        readinessImpact: params.readinessImpact ?? 0.0,
        evidence: params.evidence || [],
      },
    });
  }

  /**
   * Records explicit user feedback on AI recommendations.
   */
  async recordRecommendationFeedback(params: {
    userId: string;
    recommendationId?: string | undefined;
    recommendationType: string;
    response: CareerOptimizationFeedbackResponse;
    comment?: string | undefined;
  }) {
    // 1. Record feedback
    const feedback = await this.prisma.careerOptimizationFeedback.create({
      data: {
        userId: params.userId,
        recommendationId: params.recommendationId || null,
        recommendationType: params.recommendationType,
        response: params.response as any,
        comment: params.comment || null,
      },
    });

    // 2. Also emit a Learning Signal for closed-loop learning
    await this.prisma.careerLearningSignal.create({
      data: {
        userId: params.userId,
        signalType: 'FEEDBACK_SUBMITTED',
        sourceEngine: 'OPTIMIZATION_ENGINE',
        payload: {
          recommendationType: params.recommendationType,
          response: params.response,
        },
        confidence: 1.0,
        qualityPassed: true,
      },
    });

    return feedback;
  }

  /**
   * Computes recommendation effectiveness metrics.
   */
  async getRecommendationEffectiveness(userId: string) {
    const feedbacks = await this.prisma.careerOptimizationFeedback.findMany({
      where: { userId },
    });

    const total = feedbacks.length;
    if (total === 0) {
      return {
        totalFeedbackCount: 0,
        helpfulRate: 0.0,
        unhelpfulRate: 0.0,
        feedbackSummary: 'Insufficient feedback data to evaluate recommendation effectiveness.',
      };
    }

    const helpfulCount = feedbacks.filter((f) => f.response === 'HELPFUL').length;
    const unhelpfulCount = feedbacks.filter((f) => f.response === 'NOT_HELPFUL').length;

    return {
      totalFeedbackCount: total,
      helpfulRate: Math.round((helpfulCount / total) * 100) / 100,
      unhelpfulRate: Math.round((unhelpfulCount / total) * 100) / 100,
      feedbackSummary: `${helpfulCount} helpful vs ${unhelpfulCount} not helpful out of ${total} reviews.`,
    };
  }
}
