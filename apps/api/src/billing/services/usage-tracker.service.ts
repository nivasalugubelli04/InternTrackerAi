import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsageTrackerService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Determine current billing period or default monthly period
   */
  async getCurrentPeriod(userId: string): Promise<{ start: Date; end: Date }> {
    const activeSub = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: { in: ['ACTIVE', 'TRIALING'] }, // We will treat past due under grace period separately
      },
      orderBy: { createdAt: 'desc' },
    });

    if (activeSub) {
      return { start: activeSub.currentPeriodStart, end: activeSub.currentPeriodEnd };
    }

    // Default for free users (beginning of current month to end of current month)
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    return { start, end };
  }

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

    return usage.usageCount;
  }

  async resetUsage(userId: string, feature: string): Promise<void> {
    const { start } = await this.getCurrentPeriod(userId);

    await this.prisma.entitlementUsage.updateMany({
      where: {
        userId,
        feature,
        periodStart: start,
      },
      data: {
        usageCount: 0,
      },
    });
  }
}
