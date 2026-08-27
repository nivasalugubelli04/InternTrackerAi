import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { SoftLimitWarning } from '../interfaces/billing.interfaces';

@Injectable()
export class UsageTrackerService {
  private readonly logger = new Logger(UsageTrackerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Determine current billing period or default monthly period for the user.
   */
  async getCurrentPeriod(userId: string): Promise<{ start: Date; end: Date }> {
    const activeSub = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (activeSub?.currentPeriodStart && activeSub.currentPeriodEnd) {
      return { start: activeSub.currentPeriodStart, end: activeSub.currentPeriodEnd };
    }

    // Default for free tier: 1st of current month to end of current month
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    return { start, end };
  }

  /**
   * Retrieves the current usage count for a given feature within the active period.
   */
  async getUsage(userId: string, feature: string): Promise<number> {
    const { start, end } = await this.getCurrentPeriod(userId);

    const usage = await this.prisma.entitlementUsage.findFirst({
      where: {
        userId,
        feature,
        periodStart: { lte: end },
        periodEnd: { gte: start },
      },
    });

    return usage ? usage.usageCount : 0;
  }

  /**
   * Atomically increments usage count for a feature in the current period.
   */
  async incrementUsage(userId: string, feature: string, amount: number = 1): Promise<number> {
    const { start, end } = await this.getCurrentPeriod(userId);

    const usage = await this.prisma.entitlementUsage.upsert({
      where: {
        userId_feature_periodStart: {
          userId,
          feature,
          periodStart: start,
        },
      },
      update: {
        usageCount: { increment: amount },
        periodEnd: end,
      },
      create: {
        userId,
        feature,
        usageCount: amount,
        periodStart: start,
        periodEnd: end,
      },
    });

    this.logger.debug(
      `User ${userId} incremented ${feature} by ${amount} -> total: ${usage.usageCount}`,
    );
    return usage.usageCount;
  }

  /**
   * Checks if user usage has crossed soft warning thresholds (50%, 80%, 90%).
   */
  evaluateSoftWarning(
    feature: string,
    currentUsage: number,
    limit: number,
    periodEnd: Date,
  ): SoftLimitWarning | null {
    if (limit <= 0 || limit >= 99999) return null;

    const usagePercent = Math.round((currentUsage / limit) * 100);
    const resetDateStr = periodEnd.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });

    if (usagePercent >= 90 && usagePercent < 100) {
      return {
        feature,
        currentUsage,
        limit,
        usagePercent,
        warningMessage: `You have used ${currentUsage} of ${limit} ${feature.replace(/_/g, ' ').toLowerCase()} allowances (${usagePercent}%). Resets on ${resetDateStr}.`,
        resetDate: resetDateStr,
      };
    }

    if (usagePercent >= 80 && usagePercent < 90) {
      return {
        feature,
        currentUsage,
        limit,
        usagePercent,
        warningMessage: `You have used 80% of your monthly ${feature.replace(/_/g, ' ').toLowerCase()} quota.`,
        resetDate: resetDateStr,
      };
    }

    return null;
  }

  /**
   * Resets usage for a user/feature (used on billing cycle rollover).
   */
  async resetUsage(userId: string, feature?: string): Promise<void> {
    const { start } = await this.getCurrentPeriod(userId);

    await this.prisma.entitlementUsage.deleteMany({
      where: {
        userId,
        ...(feature ? { feature } : {}),
        periodStart: { lt: start },
      },
    });
  }
}
