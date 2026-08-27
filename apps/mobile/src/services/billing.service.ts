import api from '../services/api';

export interface PlanItem {
  id: string;
  name: string;
  slug: string;
  tier: 'FREE' | 'PRO' | 'PREMIUM' | 'ENTERPRISE';
  description: string;
  price: number;
  currency: string;
  billingInterval: string;
  featuresJson: string[];
  limitsJson: Record<string, number>;
  isPopular?: boolean;
}

export interface SubscriptionStatusData {
  status: string;
  tier: 'FREE' | 'PRO' | 'PREMIUM' | 'ENTERPRISE';
  planName: string;
  monthlyPrice: number;
  currency: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEndsAt?: string | null;
  inGracePeriod: boolean;
  usageSummary: Array<{
    feature: string;
    used: number;
    limit: number;
    usagePercent: number;
  }>;
}

export const billingService = {
  async getPlans(): Promise<PlanItem[]> {
    const { data } = await api.get('/billing/plans');
    return data;
  },

  async getSubscription(): Promise<SubscriptionStatusData> {
    const { data } = await api.get('/billing/subscription');
    return data;
  },

  async createCheckout(planId: string, promoCode?: string) {
    const { data } = await api.post('/billing/checkout', { planId, promoCode });
    return data;
  },

  async cancelSubscription(immediately: boolean = false) {
    const { data } = await api.post('/billing/cancel', { immediately });
    return data;
  },

  async validatePromoCode(code: string) {
    const { data } = await api.post('/billing/promo/validate', { code });
    return data;
  },

  async getInvoices() {
    const { data } = await api.get('/billing/invoices');
    return data;
  },
};
