export const PAYMENT_PROVIDER_TOKEN = 'PAYMENT_PROVIDER';

export interface CheckoutSessionParams {
  userId: string;
  planId: string;
  amount: number; // In smallest currency unit (e.g. paise for INR)
  currency: string;
  email: string;
}

export interface CheckoutSessionResult {
  sessionId: string; // The order/subscription ID to pass to frontend
  provider: string;
}

export interface WebhookEventPayload {
  eventId: string;
  eventType: string;
  payload: any;
  rawBody: string;
  signature: string;
}

export interface PaymentProvider {
  /**
   * Creates a checkout session (or Order/Subscription in Razorpay)
   */
  createCheckoutSession(params: CheckoutSessionParams): Promise<CheckoutSessionResult>;

  /**
   * Verifies the webhook signature and returns the parsed event
   */
  verifyWebhook(payload: WebhookEventPayload): Promise<any>;

  /**
   * Cancels a subscription at the provider level
   */
  cancelSubscription(providerSubscriptionId: string, cancelAtPeriodEnd: boolean): Promise<boolean>;
}
