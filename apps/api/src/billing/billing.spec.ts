import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';

import { PAYMENT_PROVIDER_TOKEN } from './providers/payment-provider.interface';
import { BillingService } from './services/billing.service';
import { EntitlementService } from './services/entitlement.service';
import { MonetizationAnalyticsService } from './services/monetization-analytics.service';
import { UsageTrackerService } from './services/usage-tracker.service';
import { WebhookService } from './services/webhook.service';

describe('Phase 53 — Monetization, Subscriptions & Billing Architecture Tests', () => {
  let entitlementService: EntitlementService;
  let usageTracker: UsageTrackerService;
  let billingService: BillingService;
  let webhookService: WebhookService;
  let analyticsService: MonetizationAnalyticsService;

  const mockPaymentProvider = {
    createCheckoutSession: jest.fn().mockResolvedValue({
      sessionId: 'cs_test_session_123',
      provider: 'STRIPE',
    }),
    verifyWebhook: jest.fn().mockResolvedValue({
      id: 'evt_test_123',
      type: 'invoice.paid',
      data: { object: { id: 'sub_123', amount_paid: 1900, currency: 'usd' } },
    }),
    cancelSubscription: jest.fn().mockResolvedValue(true),
  };

  const mockPrismaService = {
    subscriptionPlan: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'plan-1',
          name: 'Free Starter',
          slug: 'free',
          tier: 'FREE',
          price: 0,
          currency: 'USD',
          isActive: true,
        },
        {
          id: 'plan-2',
          name: 'Career Pro',
          slug: 'pro',
          tier: 'PRO',
          price: 19,
          currency: 'USD',
          isActive: true,
        },
      ]),
      findUnique: jest.fn().mockResolvedValue({
        id: 'plan-2',
        name: 'Career Pro',
        slug: 'pro',
        tier: 'PRO',
        price: 19,
        currency: 'USD',
      }),
      create: jest.fn().mockResolvedValue({ id: 'plan-1' }),
    },
    subscription: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'sub-1',
        userId: 'u1',
        status: 'ACTIVE',
        providerSubscriptionId: 'sub_prov_123',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        cancelAtPeriodEnd: false,
        plan: {
          id: 'plan-2',
          name: 'Career Pro',
          slug: 'pro',
          tier: 'PRO',
          price: 19,
          currency: 'USD',
        },
      }),
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'sub-1',
          status: 'ACTIVE',
          plan: { price: 19, tier: 'PRO', slug: 'pro' },
        },
      ]),
      update: jest.fn().mockResolvedValue({ id: 'sub-1', status: 'ACTIVE' }),
    },
    adminBillingOverride: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'override-1' }),
    },
    entitlementUsage: {
      findFirst: jest.fn().mockResolvedValue({
        userId: 'u1',
        feature: 'AI_COPILOT',
        usageCount: 8,
      }),
      findMany: jest.fn().mockResolvedValue([{ feature: 'AI_COPILOT', usageCount: 8 }]),
      upsert: jest.fn().mockResolvedValue({
        userId: 'u1',
        feature: 'AI_COPILOT',
        usageCount: 9,
      }),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    webhookEvent: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'wh-1', status: 'PENDING' }),
      update: jest.fn().mockResolvedValue({ id: 'wh-1', status: 'PROCESSED' }),
    },
    payment: {
      create: jest.fn().mockResolvedValue({ id: 'pay-1', status: 'COMPLETED' }),
    },
    invoice: {
      create: jest.fn().mockResolvedValue({ id: 'inv-1', status: 'PAID' }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    promotionCode: {
      findUnique: jest.fn().mockResolvedValue({
        code: 'STUDENT50',
        discountPercent: 50,
        isActive: true,
      }),
      create: jest.fn().mockResolvedValue({ id: 'promo-1' }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue({ id: 'u1', email: 'student@mit.edu' }),
      count: jest.fn().mockResolvedValue(100),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EntitlementService,
        UsageTrackerService,
        BillingService,
        WebhookService,
        MonetizationAnalyticsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: PAYMENT_PROVIDER_TOKEN, useValue: mockPaymentProvider },
      ],
    }).compile();

    entitlementService = module.get<EntitlementService>(EntitlementService);
    usageTracker = module.get<UsageTrackerService>(UsageTrackerService);
    billingService = module.get<BillingService>(BillingService);
    webhookService = module.get<WebhookService>(WebhookService);
    analyticsService = module.get<MonetizationAnalyticsService>(MonetizationAnalyticsService);
  });

  describe('1. Feature Entitlement & Plan Tiers', () => {
    it('should resolve active plan tier and evaluate feature allowances', async () => {
      const planInfo = await entitlementService.getUserPlanTier('u1');
      expect(planInfo.tier).toBe('PRO');
      expect(planInfo.planName).toBe('Career Pro');

      const evaluation = await entitlementService.evaluateEntitlement('u1', 'AI_COPILOT');
      expect(evaluation.allowed).toBe(true);
      expect(evaluation.limit).toBe(250);
      expect(evaluation.currentUsage).toBe(8);
    });

    it('should calculate feature limits based on plan tier defaults', async () => {
      const limit = await entitlementService.getLimit('u1', 'CAREER_SIMULATION');
      expect(limit).toBe(30);
    });
  });

  describe('2. Usage Tracking & Soft Warning Thresholds', () => {
    it('should increment usage atomically', async () => {
      const count = await usageTracker.incrementUsage('u1', 'AI_COPILOT', 1);
      expect(count).toBe(9);
      expect(mockPrismaService.entitlementUsage.upsert).toHaveBeenCalled();
    });

    it('should trigger soft warnings when usage crosses 80% and 90% threshold', () => {
      const warning90 = usageTracker.evaluateSoftWarning('AI_COPILOT', 9, 10, new Date());
      expect(warning90).not.toBeNull();
      expect(warning90?.usagePercent).toBe(90);

      const warning80 = usageTracker.evaluateSoftWarning('AI_COPILOT', 8, 10, new Date());
      expect(warning80).not.toBeNull();
      expect(warning80?.usagePercent).toBe(80);

      const safe = usageTracker.evaluateSoftWarning('AI_COPILOT', 4, 10, new Date());
      expect(safe).toBeNull();
    });
  });

  describe('3. Checkout, Promotions & Subscription Management', () => {
    it('should create a checkout session and apply promo code discount', async () => {
      const session = await billingService.createCheckoutSession('u1', {
        planId: 'plan-2',
        promoCode: 'STUDENT50',
      });
      expect(session.sessionId).toBeDefined();
      expect(session.provider).toBe('STRIPE');
    });

    it('should retrieve full subscription summary with usage meters', async () => {
      const sub = await billingService.getSubscription('u1');
      expect(sub.tier).toBe('PRO');
      expect(sub.status).toBe('ACTIVE');
      expect(sub.usageSummary.length).toBeGreaterThan(0);
    });

    it('should safely cancel subscription at period end', async () => {
      const cancelResult = await billingService.cancelSubscription('u1', { immediately: false });
      expect(cancelResult.id).toBe('sub-1');
      expect(mockPaymentProvider.cancelSubscription).toHaveBeenCalledWith('sub_prov_123', true);
    });
  });

  describe('4. Secure Webhook Processing & Idempotency', () => {
    it('should process webhook idempotently and record paid invoice', async () => {
      await webhookService.processWebhook({
        provider: 'STRIPE',
        eventId: 'evt_test_123',
        eventType: 'invoice.paid',
        payload: { id: 'sub_prov_123', amount_paid: 1900, currency: 'usd' },
        rawBody: JSON.stringify({ id: 'sub_prov_123' }),
        signature: 'valid_test_sig',
      });

      expect(mockPrismaService.webhookEvent.create).toHaveBeenCalled();
      expect(mockPrismaService.webhookEvent.update).toHaveBeenCalled();
    });
  });

  describe('5. Monetization Analytics & Paywall Tracking', () => {
    it('should calculate commercial SaaS metrics (MRR, conversion, churn, funnel)', async () => {
      const metrics = await analyticsService.getMonetizationMetrics();
      expect(metrics.mrr).toBeGreaterThan(0);
      expect(metrics.arr).toBe(metrics.mrr * 12);
      expect(metrics.conversionRate).toBeGreaterThan(0);
      expect(metrics.planDistribution['PRO']).toBeDefined();
      expect(metrics.paywallFunnel).toBeDefined();
    });
  });
});
