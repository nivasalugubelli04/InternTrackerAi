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
    const hash = crypto
      .createHash('sha256')
      .update(input.rawBody || JSON.stringify(input.payload || {}))
      .digest('hex');

    // 1. Idempotency Check
    const existing = await this.prisma.webhookEvent.findUnique({
      where: { eventId: input.eventId },
    });

    if (existing && existing.status === WebhookStatus.PROCESSED) {
      this.logger.log(`Webhook ${input.eventId} already processed. Skipping duplicate.`);
      return;
    }

    let webhookEvent = existing;
    if (!webhookEvent) {
      webhookEvent = await this.prisma.webhookEvent.create({
        data: {
          provider: input.provider || 'STRIPE',
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
      this.logger.error(`Webhook signature verification failed for event ${input.eventId}`);
      throw e;
    }

    // 3. Process Domain Logic Based on Event Type
    try {
      await this.handleProviderEvent(input.eventType, parsedPayload || input.payload);

      await this.prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          status: WebhookStatus.PROCESSED,
          processedAt: new Date(),
        },
      });
    } catch (e) {
      this.logger.error(`Error processing webhook domain logic for event ${input.eventId}`, e);
      await this.prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: { status: WebhookStatus.FAILED },
      });
      throw e;
    }
  }

  private async handleProviderEvent(eventType: string, payload: any) {
    this.logger.log(`Handling billing webhook event: ${eventType}`);

    const subId =
      payload?.data?.object?.subscription ||
      payload?.data?.object?.id ||
      payload?.payload?.subscription?.entity?.id;

    // A. Successful Charge / Paid Invoice
    if (
      eventType === 'invoice.paid' ||
      eventType === 'invoice.payment_succeeded' ||
      eventType === 'subscription.charged'
    ) {
      const obj = payload?.data?.object || payload?.payload?.payment?.entity || {};
      const amount = (obj.amount_paid || obj.amount || 0) / 100;
      const currency = obj.currency?.toUpperCase() || 'USD';

      const subscription = await this.prisma.subscription.findFirst({
        where: {
          OR: [{ providerSubscriptionId: subId }, { id: subId }],
        },
      });

      if (subscription) {
        // Record payment
        await this.prisma.payment.create({
          data: {
            userId: subscription.userId,
            subscriptionId: subscription.id,
            provider: 'STRIPE',
            providerPaymentId: obj.payment_intent || obj.id || `pay_${Date.now()}`,
            amount,
            currency,
            status: PaymentStatus.COMPLETED,
          },
        });

        // Record Invoice
        await this.prisma.invoice.create({
          data: {
            userId: subscription.userId,
            subscriptionId: subscription.id,
            providerInvoiceId: obj.id || `inv_${Date.now()}`,
            amount,
            currency,
            status: 'PAID',
            invoiceUrl: obj.hosted_invoice_url || null,
          },
        });

        // Extend/activate subscription
        const periodStart = obj.period_start ? new Date(obj.period_start * 1000) : new Date();
        const periodEnd = obj.period_end
          ? new Date(obj.period_end * 1000)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: SubscriptionStatus.ACTIVE,
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
          },
        });
      }
    }

    // B. Failed Payment / Halted Subscription (Grace Period Trigger)
    else if (
      eventType === 'invoice.payment_failed' ||
      eventType === 'subscription.halted' ||
      eventType === 'subscription.pending'
    ) {
      const subscription = await this.prisma.subscription.findFirst({
        where: {
          OR: [{ providerSubscriptionId: subId }, { id: subId }],
        },
      });

      if (subscription) {
        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: SubscriptionStatus.PAST_DUE },
        });

        await this.prisma.payment.create({
          data: {
            userId: subscription.userId,
            subscriptionId: subscription.id,
            provider: 'STRIPE',
            providerPaymentId: `fail_${Date.now()}`,
            amount: 0,
            status: PaymentStatus.FAILED,
            failureReason: 'Payment method declined or invoice payment failed',
          },
        });
      }
    }

    // C. Subscription Cancelled / Deleted
    else if (
      eventType === 'customer.subscription.deleted' ||
      eventType === 'subscription.cancelled'
    ) {
      const subscription = await this.prisma.subscription.findFirst({
        where: {
          OR: [{ providerSubscriptionId: subId }, { id: subId }],
        },
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
