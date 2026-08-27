import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { SubscriptionStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { CreateCheckoutSessionDto, CancelSubscriptionDto } from '../dto/billing.dto';
import { UserSubscriptionSummary } from '../interfaces/billing.interfaces';
import { PAYMENT_PROVIDER_TOKEN, PaymentProvider } from '../providers/payment-provider.interface';

import { EntitlementService, DEFAULT_PLAN_LIMITS } from './entitlement.service';
import { UsageTrackerService } from './usage-tracker.service';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly usageTracker: UsageTrackerService,
    private readonly entitlementService: EntitlementService,
    @Inject(PAYMENT_PROVIDER_TOKEN) private readonly paymentProvider: PaymentProvider,
  ) {}

  /**
   * Retrieves all active subscription plans or seeds default tiers if none exist.
   */
  async getPlans() {
    let plans = await this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });

    if (plans.length === 0) {
      // Seed initial plans
      const defaults = [
        {
          name: 'Free Starter',
          slug: 'free',
          tier: 'FREE',
          description:
            'Essential opportunity discovery, application tracker, and basic AI copilot.',
          price: 0,
          currency: 'USD',
          billingInterval: 'MONTHLY' as any,
          featuresJson: [
            'Verified Internship Discovery',
            'Full Application Tracker',
            '10 AI Copilot Messages / mo',
            '3 Career Simulations / mo',
            '2 Resume Optimizations / mo',
          ],
          limitsJson: DEFAULT_PLAN_LIMITS.FREE,
          isPopular: false,
          sortOrder: 1,
        },
        {
          name: 'Career Pro',
          slug: 'pro',
          tier: 'PRO',
          description:
            'Accelerated placement engine with high AI limits and advanced skill optimization.',
          price: 19,
          currency: 'USD',
          billingInterval: 'MONTHLY' as any,
          featuresJson: [
            'All Free Tier features',
            '250 AI Copilot Messages / mo',
            '30 Career Simulations / mo',
            '25 Resume Optimizations / mo',
            'Priority 90%+ Match Alerts',
            'Mock Interview Intelligence',
          ],
          limitsJson: DEFAULT_PLAN_LIMITS.PRO,
          isPopular: true,
          sortOrder: 2,
        },
        {
          name: 'Premium Accelerator',
          slug: 'premium',
          tier: 'PREMIUM',
          description:
            'Maximum AI compute, priority recruiter indexing, and unlimited career intelligence.',
          price: 39,
          currency: 'USD',
          billingInterval: 'MONTHLY' as any,
          featuresJson: [
            'All Pro Tier features',
            '1,000 AI Copilot Messages / mo',
            '150 Career Simulations / mo',
            '100 Resume Optimizations / mo',
            'Unlimited Research Runs',
            'External Calendar & Portal Sync',
            'Dedicated Career Strategy Center',
          ],
          limitsJson: DEFAULT_PLAN_LIMITS.PREMIUM,
          isPopular: false,
          sortOrder: 3,
        },
      ];

      for (const p of defaults) {
        await this.prisma.subscriptionPlan.create({ data: p as any });
      }

      plans = await this.prisma.subscriptionPlan.findMany({
        where: { isActive: true },
        orderBy: { price: 'asc' },
      });
    }

    return plans;
  }

  /**
   * Retrieves full subscription status and real-time usage meters for a user.
   */
  async getSubscription(userId: string): Promise<UserSubscriptionSummary> {
    const planInfo = await this.entitlementService.getUserPlanTier(userId);
    const period = await this.usageTracker.getCurrentPeriod(userId);

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

    const keyFeatures = [
      'AI_COPILOT',
      'CAREER_SIMULATION',
      'RESUME_OPTIMIZATION',
      'CAREER_RESEARCH',
      'PORTFOLIO_INTELLIGENCE',
    ];

    const usageSummary = await Promise.all(
      keyFeatures.map(async (feature) => {
        const used = await this.usageTracker.getUsage(userId, feature);
        const limit = await this.entitlementService.getLimit(userId, feature);
        const usagePercent =
          limit > 0 && limit < 99999 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
        return {
          feature,
          used,
          limit: limit >= 99999 ? -1 : limit,
          usagePercent,
        };
      }),
    );

    return {
      status: activeSub?.status || 'ACTIVE',
      tier: planInfo.tier,
      planName: planInfo.planName,
      monthlyPrice: activeSub?.plan ? Number(activeSub.plan.price) : 0,
      currency: activeSub?.plan?.currency || 'USD',
      currentPeriodEnd: period.end,
      cancelAtPeriodEnd: activeSub?.cancelAtPeriodEnd || false,
      trialEndsAt: activeSub?.trialEndsAt,
      inGracePeriod: planInfo.inGracePeriod,
      usageSummary,
    };
  }

  /**
   * Generates a checkout session for subscribing or upgrading.
   */
  async createCheckoutSession(userId: string, dto: CreateCheckoutSessionDto) {
    const [user, plan] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.subscriptionPlan.findUnique({ where: { id: dto.planId } }),
    ]);

    if (!user || !plan) {
      throw new NotFoundException('User or Plan not found');
    }

    if (Number(plan.price) === 0) {
      throw new BadRequestException('Free plan does not require checkout.');
    }

    let finalPrice = Number(plan.price);

    // Apply promo code discount if provided
    if (dto.promoCode) {
      const promo = await this.prisma.promotionCode.findUnique({
        where: { code: dto.promoCode.toUpperCase() },
      });
      if (promo && promo.isActive && (!promo.expiresAt || promo.expiresAt > new Date())) {
        if (promo.discountPercent) {
          finalPrice = finalPrice * (1 - promo.discountPercent / 100);
        } else if (promo.discountAmount) {
          finalPrice = Math.max(0, finalPrice - promo.discountAmount);
        }
      }
    }

    const session = await this.paymentProvider.createCheckoutSession({
      userId: user.id,
      planId: plan.slug,
      amount: Math.round(finalPrice * 100), // in cents / paise
      currency: plan.currency,
      email: user.email,
    });

    return session;
  }

  /**
   * Cancels an active subscription safely at period end or immediately.
   */
  async cancelSubscription(userId: string, dto: CancelSubscriptionDto) {
    const activeSub = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: {
          in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING, SubscriptionStatus.PAST_DUE],
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeSub) {
      throw new NotFoundException('No active subscription found to cancel.');
    }

    await this.paymentProvider.cancelSubscription(
      activeSub.providerSubscriptionId,
      !dto.immediately,
    );

    const updated = await this.prisma.subscription.update({
      where: { id: activeSub.id },
      data: {
        cancelAtPeriodEnd: !dto.immediately,
        ...(dto.immediately ? { status: SubscriptionStatus.CANCELED } : {}),
        cancelledAt: new Date(),
      },
    });

    this.logger.log(
      `Subscription ${activeSub.id} marked as cancelled (immediate: ${!!dto.immediately}) for user ${userId}`,
    );
    return updated;
  }

  /**
   * Validates and applies a promotion code.
   */
  async validatePromoCode(code: string) {
    const promo = await this.prisma.promotionCode.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!promo || !promo.isActive || (promo.expiresAt && promo.expiresAt < new Date())) {
      throw new BadRequestException('Invalid or expired promotion code.');
    }

    if (promo.maxRedemptions && promo.redemptionsCount >= promo.maxRedemptions) {
      throw new BadRequestException('Promotion code redemption limit reached.');
    }

    return {
      valid: true,
      code: promo.code,
      description: promo.description,
      discountPercent: promo.discountPercent,
      discountAmount: promo.discountAmount,
    };
  }

  /**
   * Retrieves invoices for a user.
   */
  async getInvoices(userId: string) {
    return this.prisma.invoice.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
