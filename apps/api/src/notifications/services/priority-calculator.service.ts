/**
 * Phase 6 — Priority Calculator Service
 *
 * Computes NotificationPriority from match score, deadline urgency,
 * and user's company tracking priority.
 */

import { Injectable } from '@nestjs/common';

import { NotificationPriority } from '../enums/notification.enums';
import type { RecommendationContext } from '../interfaces/notification-decision.interface';

@Injectable()
export class PriorityCalculatorService {
  calculate(ctx: RecommendationContext): NotificationPriority {
    const score = this.computeWeightedScore(ctx);

    if (score >= 90) return NotificationPriority.CRITICAL;
    if (score >= 75) return NotificationPriority.HIGH;
    if (score >= 55) return NotificationPriority.MEDIUM;
    return NotificationPriority.LOW;
  }

  private computeWeightedScore(ctx: RecommendationContext): number {
    let score = ctx.matchScore;

    // Boost for deadline urgency
    if (ctx.deadline) {
      const daysLeft = this.daysUntil(ctx.deadline);
      if (daysLeft <= 1) score += 15;
      else if (daysLeft <= 3) score += 10;
      else if (daysLeft <= 7) score += 5;
    }

    // Boost for tracked companies
    if (ctx.isCompanyTracked) {
      const priorityBoost: Record<string, number> = {
        HIGH: 10,
        MEDIUM: 5,
        LOW: 2,
      };
      score += priorityBoost[ctx.companyTrackingPriority ?? 'MEDIUM'] ?? 5;
    }

    return Math.min(score, 100);
  }

  private daysUntil(date: Date): number {
    const now = Date.now();
    const diff = date.getTime() - now;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }
}
