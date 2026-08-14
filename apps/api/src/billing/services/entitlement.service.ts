import { Injectable, ForbiddenException } from '@nestjs/common';
import { SubscriptionStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { UsageTrackerService } from './usage-tracker.service';

export const BILLING_FEATURES = {
  COMPANY_TRACKING: 'COMPANY_TRACKING',
  AI_CHAT: 'AI_CHAT',
  RESUME_ANALYSIS: 'RESUME_ANALYSIS',
  MOCK_INTERVIEW: 'MOCK_INTERVIEW',
  ADVANCED_MATCHING: 'ADVANCED_MATCHING',
  PUSH_NOTIFICATION: 'PUSH_NOTIFICATION',
};

const DEFAULT_FREE_LIMITS = {
  [BILLING_FEATURES.COMPANY_TRACKING]: 5,
  [BILLING_FEATURES.AI_CHAT]: 10,
  [BILLING_FEATURES.RESUME_ANALYSIS]: 2,
  [BILLING_FEATURES.MOCK_INTERVIEW]: 1,
};

const DEFAULT_PREMIUM_LIMITS = {
  [BILLING_FEATURES.COMPANY_TRACKING]: 999999, // unlimited
  [BILLING_FEATURES.AI_CHAT]: 500,
  [BILLING_FEATURES.RESUME_ANALYSIS]: 50,
  [BILLING_FEATURES.MOCK_INTERVIEW]: 50,
};

const PREMIUM_ONLY_FEATURES = [
  BILLING_FEATURES.ADVANCED_MATCHING,
  BILLING_FEATURES.PUSH_NOTIFICATION,
];

@Injectable()
export class EntitlementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usageTracker: UsageTrackerService,
  ) {}

  /**
   * Determine if the user has an active premium subscription (including grace period).
   * Grace period: PAST_DUE subscriptions are considered premium if the payment failure was within the last 7 days.
   */
  async isPremium(userId: string): Promise<boolean> {
    const activeSub = await this.prisma.subscription.findFirst({
      where: {
        OR: [{ userId }, { organization: { members: { some: { userId, status: 'ACTIVE' } } } }],
        status: {
          in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING, SubscriptionStatus.PAST_DUE],
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeSub) {
      return false;
    }

    if (activeSub.status === SubscriptionStatus.PAST_DUE) {
      // 7-day grace period
      const lastPayment = await this.prisma.payment.findFirst({
        where: { subscriptionId: activeSub.id, status: 'FAILED' },
        orderBy: { createdAt: 'desc' },
      });
      if (lastPayment) {
        const daysSinceFailure =
          (Date.now() - lastPayment.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceFailure > 7) {
          return false;
        }
      }
    }

    return true;
  }

  async getLimit(userId: string, feature: string): Promise<number> {
    const isPrem = await this.isPremium(userId);
    if (isPrem) {
      return DEFAULT_PREMIUM_LIMITS[feature] || 0;
    }
    return DEFAULT_FREE_LIMITS[feature] || 0;
  }

  async canUse(userId: string, feature: string, throwError: boolean = false): Promise<boolean> {
    const isPrem = await this.isPremium(userId);

    // 1. Check if it's a Premium-only feature
    if (PREMIUM_ONLY_FEATURES.includes(feature)) {
      if (!isPrem) {
        if (throwError)
          throw new ForbiddenException({
            code: 'UPGRADE_REQUIRED',
            message: 'Premium subscription required',
          });
        return false;
      }
      return true;
    }

    // 2. Check limits
    const limit = await this.getLimit(userId, feature);
    if (limit === 0) {
      if (throwError)
        throw new ForbiddenException({
          code: 'UPGRADE_REQUIRED',
          message: 'Feature not available on your plan',
        });
      return false;
    }

    const currentUsage = await this.usageTracker.getUsage(userId, feature);
    if (currentUsage >= limit) {
      if (throwError)
        throw new ForbiddenException({
          code: 'LIMIT_REACHED',
          message: `You have reached your limit of ${limit} for ${feature}`,
        });
      return false;
    }

    return true;
  }

  async enforceUsage(userId: string, feature: string, amount: number = 1): Promise<void> {
    await this.canUse(userId, feature, true);
    await this.usageTracker.incrementUsage(userId, feature, amount);
  }
}
