export type PlanTier = 'FREE' | 'PRO' | 'PREMIUM' | 'ENTERPRISE';

export type BillingFeatureKey =
  | 'OPPORTUNITY_DISCOVERY'
  | 'APPLICATION_TRACKING'
  | 'AI_COPILOT'
  | 'CAREER_SIMULATION'
  | 'CAREER_RESEARCH'
  | 'PORTFOLIO_INTELLIGENCE'
  | 'RESUME_OPTIMIZATION'
  | 'INTERVIEW_PREP'
  | 'CAREER_STRATEGY'
  | 'EXTERNAL_INTEGRATIONS'
  | 'ADVANCED_MATCHING'
  | 'PUSH_NOTIFICATION';

export interface EntitlementCheckResult {
  allowed: boolean;
  isUsageLimited: boolean;
  currentUsage: number;
  limit: number;
  remaining: number;
  softWarning?: string | undefined;
  reason?: string | undefined;
}

export interface SoftLimitWarning {
  feature: string;
  currentUsage: number;
  limit: number;
  usagePercent: number;
  warningMessage: string;
  resetDate: string;
}

export interface PlanConfig {
  slug: string;
  name: string;
  tier: PlanTier;
  description: string;
  price: number;
  currency: string;
  billingInterval: 'MONTHLY' | 'YEARLY';
  features: string[];
  limits: Record<string, number>;
  isPopular?: boolean;
}

export interface UserSubscriptionSummary {
  status: string;
  tier: PlanTier;
  planName: string;
  monthlyPrice: number;
  currency: string;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialEndsAt?: Date | null | undefined;
  inGracePeriod: boolean;
  usageSummary: Array<{
    feature: string;
    used: number;
    limit: number;
    usagePercent: number;
  }>;
}

export interface MonetizationMetrics {
  mrr: number;
  arr: number;
  totalSubscribers: number;
  freeUsers: number;
  paidUsers: number;
  conversionRate: number;
  churnRate: number;
  planDistribution: Record<string, number>;
  featureUsageByTier: Record<string, Record<string, number>>;
  paywallFunnel: {
    limitReachedCount: number;
    upgradePromptShown: number;
    pricingPageViews: number;
    checkoutStarted: number;
    checkoutCompleted: number;
  };
}
