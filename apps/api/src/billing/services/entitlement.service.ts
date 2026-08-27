import { Injectable, ForbiddenException } from '@nestjs/common';
import { SubscriptionStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import {
  EntitlementCheckResult,
  PlanTier,
  BillingFeatureKey,
} from '../interfaces/billing.interfaces';

import { UsageTrackerService } from './usage-tracker.service';

export const BILLING_FEATURES = {
  OPPORTUNITY_DISCOVERY: 'OPPORTUNITY_DISCOVERY',
  APPLICATION_TRACKING: 'APPLICATION_TRACKING',
  AI_COPILOT: 'AI_COPILOT',
  CAREER_SIMULATION: 'CAREER_SIMULATION',
  CAREER_RESEARCH: 'CAREER_RESEARCH',
  PORTFOLIO_INTELLIGENCE: 'PORTFOLIO_INTELLIGENCE',
  RESUME_OPTIMIZATION: 'RESUME_OPTIMIZATION',
  INTERVIEW_PREP: 'INTERVIEW_PREP',
  CAREER_STRATEGY: 'CAREER_STRATEGY',
  EXTERNAL_INTEGRATIONS: 'EXTERNAL_INTEGRATIONS',
  ADVANCED_MATCHING: 'ADVANCED_MATCHING',
  PUSH_NOTIFICATION: 'PUSH_NOTIFICATION',
  AI_CHAT: 'AI_COPILOT',
  RESUME_ANALYSIS: 'RESUME_OPTIMIZATION',
  PORTFOLIO_AI: 'PORTFOLIO_INTELLIGENCE',
  COMPANY_TRACKING: 'OPPORTUNITY_DISCOVERY',
} as const;

export const DEFAULT_PLAN_LIMITS: Record<PlanTier, Record<string, number>> = {
  FREE: {
    OPPORTUNITY_DISCOVERY: 999999,
    APPLICATION_TRACKING: 999999,
    AI_COPILOT: 10,
    CAREER_SIMULATION: 3,
    CAREER_RESEARCH: 3,
    PORTFOLIO_INTELLIGENCE: 2,
    RESUME_OPTIMIZATION: 2,
    INTERVIEW_PREP: 2,
    CAREER_STRATEGY: 1,
    EXTERNAL_INTEGRATIONS: 0,
    ADVANCED_MATCHING: 0,
    PUSH_NOTIFICATION: 0,
  },
  PRO: {
    OPPORTUNITY_DISCOVERY: 999999,
    APPLICATION_TRACKING: 999999,
    AI_COPILOT: 250,
    CAREER_SIMULATION: 30,
    CAREER_RESEARCH: 30,
    PORTFOLIO_INTELLIGENCE: 25,
    RESUME_OPTIMIZATION: 25,
    INTERVIEW_PREP: 25,
    CAREER_STRATEGY: 20,
    EXTERNAL_INTEGRATIONS: 5,
    ADVANCED_MATCHING: 999999,
    PUSH_NOTIFICATION: 999999,
  },
  PREMIUM: {
    OPPORTUNITY_DISCOVERY: 999999,
    APPLICATION_TRACKING: 999999,
    AI_COPILOT: 1000,
    CAREER_SIMULATION: 150,
    CAREER_RESEARCH: 150,
    PORTFOLIO_INTELLIGENCE: 100,
    RESUME_OPTIMIZATION: 100,
    INTERVIEW_PREP: 100,
    CAREER_STRATEGY: 100,
    EXTERNAL_INTEGRATIONS: 999999,
    ADVANCED_MATCHING: 999999,
    PUSH_NOTIFICATION: 999999,
  },
  ENTERPRISE: {
    OPPORTUNITY_DISCOVERY: 999999,
    APPLICATION_TRACKING: 999999,
    AI_COPILOT: 999999,
    CAREER_SIMULATION: 999999,
    CAREER_RESEARCH: 999999,
    PORTFOLIO_INTELLIGENCE: 999999,
    RESUME_OPTIMIZATION: 999999,
    INTERVIEW_PREP: 999999,
    CAREER_STRATEGY: 999999,
    EXTERNAL_INTEGRATIONS: 999999,
    ADVANCED_MATCHING: 999999,
    PUSH_NOTIFICATION: 999999,
  },
};

@Injectable()
export class EntitlementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usageTracker: UsageTrackerService,
  ) {}

  /**
   * Resolves the effective plan tier for a user (admin overrides -> active subscription -> FREE).
   */
  async getUserPlanTier(userId: string): Promise<{
    tier: PlanTier;
    planName: string;
    isOverride: boolean;
    inGracePeriod: boolean;
  }> {
    // 1. Check for active, non-expired admin override
    const override = await this.prisma.adminBillingOverride.findFirst({
      where: {
        userId,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });

    if (override?.plan) {
      const planTier = (override.plan.tier as PlanTier) || 'PREMIUM';
      return {
        tier: planTier,
        planName: `${override.plan.name} (Admin Override)`,
        isOverride: true,
        inGracePeriod: false,
      };
    }

    // 2. Check for active or trialing subscription
    const activeSub = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: {
          in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING, SubscriptionStatus.PAST_DUE],
        },
      },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });

    if (activeSub) {
      let inGracePeriod = false;
      if (activeSub.status === SubscriptionStatus.PAST_DUE) {
        // 7-day grace period from last failed payment or period end
        const daysSincePeriodEnd =
          (Date.now() - new Date(activeSub.currentPeriodEnd).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSincePeriodEnd > 7) {
          return { tier: 'FREE', planName: 'Free Plan', isOverride: false, inGracePeriod: false };
        }
        inGracePeriod = true;
      }

      const planTier =
        (activeSub.plan.tier as PlanTier) ||
        (activeSub.plan.slug.toUpperCase() as PlanTier) ||
        'PRO';
      return {
        tier: planTier,
        planName: activeSub.plan.name,
        isOverride: false,
        inGracePeriod,
      };
    }

    // 3. Fallback to Free
    return {
      tier: 'FREE',
      planName: 'Free Plan',
      isOverride: false,
      inGracePeriod: false,
    };
  }

  /**
   * Determine if the user has an active paid subscription (PRO, PREMIUM, or ENTERPRISE).
   */
  async isPremium(userId: string): Promise<boolean> {
    const { tier } = await this.getUserPlanTier(userId);
    return tier === 'PRO' || tier === 'PREMIUM' || tier === 'ENTERPRISE';
  }

  /**
   * Evaluates feature limit for a given user and feature.
   */
  async getLimit(userId: string, feature: BillingFeatureKey | string): Promise<number> {
    const { tier } = await this.getUserPlanTier(userId);
    const tierLimits = DEFAULT_PLAN_LIMITS[tier] || DEFAULT_PLAN_LIMITS.FREE;
    return tierLimits[feature] ?? 0;
  }

  /**
   * Comprehensive entitlement evaluation with soft limit warnings.
   */
  async evaluateEntitlement(
    userId: string,
    feature: BillingFeatureKey | string,
    amount: number = 1,
  ): Promise<EntitlementCheckResult> {
    const [planInfo, currentUsage, period] = await Promise.all([
      this.getUserPlanTier(userId),
      this.usageTracker.getUsage(userId, feature),
      this.usageTracker.getCurrentPeriod(userId),
    ]);

    const tierLimits = DEFAULT_PLAN_LIMITS[planInfo.tier] || DEFAULT_PLAN_LIMITS.FREE;
    const limit = tierLimits[feature] ?? 0;

    // Feature not available in plan
    if (limit === 0) {
      return {
        allowed: false,
        isUsageLimited: false,
        currentUsage,
        limit: 0,
        remaining: 0,
        reason: `${feature.replace(/_/g, ' ')} is not included in the ${planInfo.planName}. Upgrade to Pro or Premium to unlock.`,
      };
    }

    // Unlimited access
    if (limit >= 99999) {
      return {
        allowed: true,
        isUsageLimited: false,
        currentUsage,
        limit: 999999,
        remaining: 999999,
      };
    }

    const projectedUsage = currentUsage + amount;

    // Hard limit reached
    if (projectedUsage > limit) {
      const resetDateStr = period.end.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      return {
        allowed: false,
        isUsageLimited: true,
        currentUsage,
        limit,
        remaining: 0,
        reason: `Monthly limit reached for ${feature.replace(/_/g, ' ').toLowerCase()} (${currentUsage}/${limit}). Quota resets on ${resetDateStr}. Upgrade your plan to increase limits.`,
      };
    }

    // Check soft warning
    const softWarningObj = this.usageTracker.evaluateSoftWarning(
      feature,
      projectedUsage,
      limit,
      period.end,
    );

    return {
      allowed: true,
      isUsageLimited: true,
      currentUsage,
      limit,
      remaining: limit - projectedUsage,
      softWarning: softWarningObj ? softWarningObj.warningMessage : undefined,
    };
  }

  /**
   * Helper that throws ForbiddenException if entitlement is denied.
   */
  async assertCanUse(
    userId: string,
    feature: BillingFeatureKey | string,
    amount: number = 1,
  ): Promise<void> {
    const result = await this.evaluateEntitlement(userId, feature, amount);
    if (!result.allowed) {
      throw new ForbiddenException(result.reason || 'Action disallowed by plan entitlements');
    }
  }

  /**
   * Evaluates if user can perform action (returns boolean or throws if throwOnDenial is true).
   */
  async canUse(
    userId: string,
    feature: BillingFeatureKey | string,
    amountOrThrow: number | boolean = 1,
  ): Promise<boolean> {
    const amount = typeof amountOrThrow === 'number' ? amountOrThrow : 1;
    const shouldThrow = typeof amountOrThrow === 'boolean' ? amountOrThrow : false;
    const result = await this.evaluateEntitlement(userId, feature, amount);
    if (!result.allowed && shouldThrow) {
      throw new ForbiddenException(result.reason || 'Action disallowed by plan entitlements');
    }
    return result.allowed;
  }

  /**
   * Enforces entitlement and automatically tracks consumption upon success.
   */
  async enforceUsage(
    userId: string,
    feature: BillingFeatureKey | string,
    amount: number = 1,
  ): Promise<void> {
    await this.assertCanUse(userId, feature, amount);
    await this.usageTracker.incrementUsage(userId, feature, amount);
  }
}
