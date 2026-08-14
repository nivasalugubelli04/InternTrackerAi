import * as crypto from 'crypto';

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Razorpay from 'razorpay';

import {
  CheckoutSessionParams,
  CheckoutSessionResult,
  PaymentProvider,
  WebhookEventPayload,
} from './payment-provider.interface';

// Dynamically import razorpay to avoid issues if it fails to install

@Injectable()
export class RazorpayAdapter implements PaymentProvider {
  private readonly logger = new Logger(RazorpayAdapter.name);
  private razorpay: Razorpay;
  private webhookSecret: string;

  constructor(private readonly configService: ConfigService) {
    const keyId = this.configService.get<string>('RAZORPAY_KEY_ID') || 'rzp_test_mock123';
    const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET') || 'mock_secret';
    this.webhookSecret =
      this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET') || 'mock_webhook_secret';

    this.razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }

  async createCheckoutSession(params: CheckoutSessionParams): Promise<CheckoutSessionResult> {
    try {
      // For subscription, Razorpay requires a plan_id registered in their dashboard.
      // Assuming params.planId is mapped to a Razorpay plan_id in the database.
      // If not, for the sake of this mock/adapter, we will just try to create a subscription
      // or fallback to an order if it's a one-time thing. We assume it's a subscription.

      const subscription = await this.razorpay.subscriptions.create({
        plan_id: params.planId, // Must be a valid Razorpay Plan ID (e.g. plan_abc123)
        customer_notify: 1,
        total_count: 12, // e.g. 12 months
        notes: {
          userId: params.userId,
        },
      });

      return {
        sessionId: subscription.id,
        provider: 'RAZORPAY',
      };
    } catch (e) {
      this.logger.error('Failed to create Razorpay checkout session', e);
      throw new Error('Payment provider error');
    }
  }

  async verifyWebhook(payload: WebhookEventPayload): Promise<any> {
    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payload.rawBody)
      .digest('hex');

    if (expectedSignature !== payload.signature) {
      throw new Error('Invalid webhook signature');
    }

    return payload.payload; // Parsed JSON
  }

  async cancelSubscription(
    providerSubscriptionId: string,
    cancelAtPeriodEnd: boolean,
  ): Promise<boolean> {
    try {
      const cancelOption = cancelAtPeriodEnd ? 1 : 0;
      await this.razorpay.subscriptions.cancel(providerSubscriptionId, cancelOption);
      return true;
    } catch (e) {
      this.logger.error('Failed to cancel Razorpay subscription', e);
      return false;
    }
  }
}
