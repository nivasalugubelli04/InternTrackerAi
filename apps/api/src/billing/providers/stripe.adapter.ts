import * as crypto from 'crypto';

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  PaymentProvider,
  CheckoutSessionParams,
  CheckoutSessionResult,
  WebhookEventPayload,
} from './payment-provider.interface';

@Injectable()
export class StripeAdapter implements PaymentProvider {
  private readonly logger = new Logger(StripeAdapter.name);
  private readonly webhookSecret: string;

  constructor(private readonly config: ConfigService) {
    this.webhookSecret =
      this.config.get<string>('STRIPE_WEBHOOK_SECRET') || 'whsec_test_secret_intern_tracker';
  }

  async createCheckoutSession(params: CheckoutSessionParams): Promise<CheckoutSessionResult> {
    this.logger.log(
      `Creating Stripe checkout session for user ${params.userId}, plan ${params.planId}`,
    );

    // Simulation / production abstraction for Stripe Checkout
    const sessionId = `cs_test_${crypto.randomBytes(12).toString('hex')}`;
    return {
      sessionId,
      provider: 'STRIPE',
    };
  }

  async verifyWebhook(payload: WebhookEventPayload): Promise<any> {
    // In production with Stripe SDK, stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret) is used.
    if (!payload.signature) {
      this.logger.warn(
        `Missing signature for Stripe event with secret configured: ${this.webhookSecret.substring(0, 6)}...`,
      );
      throw new Error('Missing Stripe webhook signature');
    }

    return {
      id: payload.eventId || `evt_${crypto.randomBytes(8).toString('hex')}`,
      type: payload.eventType,
      data: { object: payload.payload },
    };
  }

  async cancelSubscription(
    providerSubscriptionId: string,
    cancelAtPeriodEnd: boolean,
  ): Promise<boolean> {
    this.logger.log(
      `Cancelling Stripe subscription ${providerSubscriptionId} (atPeriodEnd: ${cancelAtPeriodEnd})`,
    );
    return true;
  }
}
