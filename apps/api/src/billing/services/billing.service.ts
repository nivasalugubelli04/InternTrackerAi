import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { SubscriptionStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { PAYMENT_PROVIDER_TOKEN, PaymentProvider } from '../providers/payment-provider.interface';

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_PROVIDER_TOKEN) private readonly paymentProvider: PaymentProvider,
  ) {}

  async getPlans() {
    return this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });
  }

  async getSubscription(userId: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { plan: true },
    });

    if (!sub) {
      // Return free plan implicitly
      const freePlan = await this.prisma.subscriptionPlan.findFirst({
        where: { price: 0 },
      });
      return { status: 'FREE', plan: freePlan };
    }

    return sub;
  }

  async createCheckoutSession(userId: string, planId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: planId } });

    if (!user || !plan) {
      throw new NotFoundException('User or Plan not found');
    }

    if (Number(plan.price) === 0) {
      throw new Error('Cannot checkout for a free plan');
    }

    // In Razorpay, planId here should map to the Razorpay plan_id stored in the slug or providerId field.
    // For this example, we assume slug contains the provider plan id (e.g. plan_abc123).
    const providerPlanId = plan.slug;

    const session = await this.paymentProvider.createCheckoutSession({
      userId: user.id,
      planId: providerPlanId,
      amount: Number(plan.price) * 100, // paise
      currency: plan.currency,
      email: user.email,
    });

    return session;
  }

  async cancelSubscription(userId: string) {
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
      throw new NotFoundException('No active subscription found');
    }

    const success = await this.paymentProvider.cancelSubscription(
      activeSub.providerSubscriptionId,
      true,
    );
    if (!success) {
      throw new Error('Failed to cancel subscription at provider');
    }

    return this.prisma.subscription.update({
      where: { id: activeSub.id },
      data: {
        cancelAtPeriodEnd: true,
      },
    });
  }

  async getPayments(userId: string) {
    return this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
