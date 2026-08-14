import * as crypto from 'crypto';

import { Injectable, Inject, Logger } from '@nestjs/common';
import { SubscriptionStatus, PaymentStatus, WebhookStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { PAYMENT_PROVIDER_TOKEN, PaymentProvider } from '../providers/payment-provider.interface';

export interface RawWebhookInput {
  provider: string;
  eventId: string;
  eventType: string;
  payload: any;
  rawBody: string;
  signature: string;
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_PROVIDER_TOKEN) private readonly paymentProvider: PaymentProvider,
  ) {}

  async processWebhook(input: RawWebhookInput) {
    const hash = crypto.createHash('sha256').update(input.rawBody).digest('hex');

    // 1. Idempotency Check
    const existing = await this.prisma.webhookEvent.findUnique({
      where: { eventId: input.eventId },
    });

    if (existing && existing.status === WebhookStatus.PROCESSED) {
      this.logger.log(`Webhook ${input.eventId} already processed.`);
      return;
    }

    let webhookEvent = existing;
    if (!webhookEvent) {
      webhookEvent = await this.prisma.webhookEvent.create({
        data: {
          provider: input.provider,
          eventId: input.eventId,
          eventType: input.eventType || 'unknown',
          payloadHash: hash,
          status: WebhookStatus.PENDING,
        },
      });
    }

    // 2. Verify Signature
    let parsedPayload;
    try {
      parsedPayload = await this.paymentProvider.verifyWebhook({
        eventId: input.eventId,
        eventType: input.eventType,
        payload: input.payload,
        rawBody: input.rawBody,
        signature: input.signature,
      });
    } catch (e) {
      await this.prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: { status: WebhookStatus.FAILED },
      });
      this.logger.error(`Webhook signature verification failed for ${input.eventId}`);
      throw e; // Reraise so provider knows to retry or we return 400
    }

    // 3. Process Domain Logic Based on Event Type
    try {
      await this.handleProviderEvent(input.eventType, parsedPayload);

      await this.prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          status: WebhookStatus.PROCESSED,
          processedAt: new Date(),
        },
      });
    } catch (e) {
      this.logger.error(`Error processing webhook domain logic for ${input.eventId}`, e);
      await this.prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: { status: WebhookStatus.FAILED },
      });
      throw e;
    }
  }

  private async handleProviderEvent(eventType: string, payload: any) {
    // Razorpay specific event mapping for this MVP
    // Examples: 'subscription.charged', 'subscription.cancelled', 'subscription.halted'

    // Safety check - depending on provider format, extract the right entity
    const entity = payload?.payload?.subscription?.entity || payload?.payload?.payment?.entity;

    if (eventType === 'subscription.charged') {
      const subId = entity.id;
      // We must find the corresponding local subscription
      const subscription = await this.prisma.subscription.findUnique({
        where: { providerSubscriptionId: subId },
      });

      if (subscription) {
        // Record payment
        await this.prisma.payment.create({
          data: {
            userId: subscription.userId,
            subscriptionId: subscription.id,
            provider: 'RAZORPAY',
            providerPaymentId: payload?.payload?.payment?.entity?.id || `pay_${Date.now()}`,
            amount: (payload?.payload?.payment?.entity?.amount || 0) / 100, // convert paise to INR
            status: PaymentStatus.COMPLETED,
          },
        });

        // Update Subscription limits/period
        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: SubscriptionStatus.ACTIVE,
            currentPeriodStart: new Date(entity.current_start * 1000),
            currentPeriodEnd: new Date(entity.current_end * 1000),
          },
        });
      }
    } else if (eventType === 'subscription.halted' || eventType === 'subscription.pending') {
      const subId = entity.id;
      const subscription = await this.prisma.subscription.findUnique({
        where: { providerSubscriptionId: subId },
      });
      if (subscription) {
        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: SubscriptionStatus.PAST_DUE },
        });

        // Record a failed payment to trigger the 7-day grace period logic in EntitlementService
        await this.prisma.payment.create({
          data: {
            userId: subscription.userId,
            subscriptionId: subscription.id,
            provider: 'RAZORPAY',
            providerPaymentId: `fail_${Date.now()}`,
            amount: 0,
            status: PaymentStatus.FAILED,
            failureReason: 'Subscription halted or pending',
          },
        });
      }
    } else if (eventType === 'subscription.cancelled') {
      const subId = entity.id;
      const subscription = await this.prisma.subscription.findUnique({
        where: { providerSubscriptionId: subId },
      });
      if (subscription) {
        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: SubscriptionStatus.CANCELED,
            cancelledAt: new Date(),
          },
        });
      }
    }
  }
}
