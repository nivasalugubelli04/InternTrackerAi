/**
 * Phase 6 — Delivery Tracker Service
 *
 * Writes NotificationEvent and DeliveryAttempt records.
 * All methods are fire-and-forget safe — they swallow errors
 * so a tracking failure never disrupts delivery.
 */

import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import {
  NotificationEventType,
  NotificationStatus,
  DeliveryAttemptStatus,
} from '../enums/notification.enums';
import type { ProviderSendResult } from '../interfaces/notification-provider.interface';

@Injectable()
export class DeliveryTrackerService {
  private readonly logger = new Logger(DeliveryTrackerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Convenience accessor that bypasses stale Prisma generated types.
   * Phase 6 models (notification, notificationEvent, deliveryAttempt) are in
   * the schema but the generated client may be outdated until `prisma generate` runs.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private get p(): any {
    return this.prisma;
  }

  // ── Lifecycle events ────────────────────────────────────────────────────────

  async trackCreated(notificationId: string): Promise<void> {
    await this.logEvent(notificationId, NotificationEventType.CREATED);
  }

  async trackQueued(notificationId: string): Promise<void> {
    await Promise.all([
      this.logEvent(notificationId, NotificationEventType.QUEUED),
      this.updateStatus(notificationId, NotificationStatus.QUEUED),
    ]);
  }

  async trackSent(
    notificationId: string,
    provider: string,
    result: ProviderSendResult,
    attempt: number,
  ): Promise<void> {
    await Promise.all([
      this.logEvent(notificationId, NotificationEventType.SENT, {
        provider,
        messageId: result.messageId,
        attempt,
      }),
      this.updateStatus(notificationId, NotificationStatus.SENT, { sentAt: new Date() }),
      this.logDeliveryAttempt(
        notificationId,
        attempt,
        DeliveryAttemptStatus.SUCCESS,
        provider,
        result,
      ),
    ]);
  }

  async trackFailed(
    notificationId: string,
    provider: string,
    error: string,
    attempt: number,
    willRetry: boolean,
  ): Promise<void> {
    await Promise.all([
      this.logEvent(
        notificationId,
        willRetry ? NotificationEventType.RETRY : NotificationEventType.FAILED,
        {
          provider,
          error,
          attempt,
          willRetry,
        },
      ),
      willRetry ? Promise.resolve() : this.updateStatus(notificationId, NotificationStatus.FAILED),
      this.logDeliveryAttempt(notificationId, attempt, DeliveryAttemptStatus.FAILURE, provider, {
        success: false,
        error,
      }),
    ]);
  }

  async trackDelivered(notificationId: string, metadata?: Record<string, unknown>): Promise<void> {
    await Promise.all([
      this.logEvent(notificationId, NotificationEventType.DELIVERED, metadata),
      this.updateStatus(notificationId, NotificationStatus.DELIVERED),
    ]);
  }

  async trackOpened(notificationId: string): Promise<void> {
    await Promise.all([
      this.logEvent(notificationId, NotificationEventType.OPENED),
      this.p.notification.update({
        where: { id: notificationId },
        data: { readAt: new Date() },
      }),
    ]);
  }

  async trackClicked(notificationId: string): Promise<void> {
    await Promise.all([
      this.logEvent(notificationId, NotificationEventType.CLICKED),
      this.p.notification.update({
        where: { id: notificationId },
        data: { clickedAt: new Date() },
      }),
    ]);
  }

  async trackBounced(notificationId: string, reason?: string): Promise<void> {
    await Promise.all([
      this.logEvent(notificationId, NotificationEventType.BOUNCED, { reason }),
      this.updateStatus(notificationId, NotificationStatus.FAILED),
    ]);
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private async logEvent(
    notificationId: string,
    eventType: NotificationEventType,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.p.notificationEvent.create({
        data: {
          notificationId,
          eventType,
          metadata: metadata ?? {},
        },
      });
    } catch (error) {
      this.logger.error({ notificationId, eventType, error }, 'Failed to log notification event');
    }
  }

  private async updateStatus(
    notificationId: string,
    status: NotificationStatus,
    extra?: { sentAt?: Date },
  ): Promise<void> {
    try {
      await this.p.notification.update({
        where: { id: notificationId },
        data: { status, ...extra },
      });
    } catch (error) {
      this.logger.error({ notificationId, status, error }, 'Failed to update notification status');
    }
  }

  private async logDeliveryAttempt(
    notificationId: string,
    attempt: number,
    status: DeliveryAttemptStatus,
    provider: string,
    result: ProviderSendResult,
  ): Promise<void> {
    try {
      await this.p.deliveryAttempt.create({
        data: {
          notificationId,
          attempt,
          status,
          provider,
          response: JSON.stringify(result.rawResponse ?? result.error ?? {}),
        },
      });
    } catch (error) {
      this.logger.error({ notificationId, provider, error }, 'Failed to log delivery attempt');
    }
  }
}
