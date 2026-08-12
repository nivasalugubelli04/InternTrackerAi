/**
 * Phase 6 — Push Queue Processor
 * Sends FCM push notifications via PushProvider.
 */

import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Job } from 'bullmq';
import { Queue } from 'bullmq';

import type { AppConfig } from '../../config/configuration';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PUSH_QUEUE,
  DEAD_LETTER_QUEUE,
  JOB_DEAD_LETTER,
  DEFAULT_JOB_OPTIONS,
} from '../constants/notification.constants';
import type { NotificationJobData } from '../interfaces/notification-decision.interface';
import { PushProvider } from '../providers/push.provider';
import { DeliveryTrackerService } from '../services/delivery-tracker.service';

@Processor(PUSH_QUEUE)
export class PushProcessor extends WorkerHost {
  private readonly logger = new Logger(PushProcessor.name);

  constructor(
    private readonly pushProvider: PushProvider,
    private readonly tracker: DeliveryTrackerService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppConfig, true>,
    @InjectQueue(DEAD_LETTER_QUEUE) private readonly dlq: Queue,
  ) {
    super();
  }

  async process(job: Job<NotificationJobData>): Promise<void> {
    const data = job.data;
    const attempt = (data.attempt ?? 0) + 1;
    const maxRetries = this.config.get('notifications.maxRetries', { infer: true });

    // Get FCM token from user preferences (any-cast for Phase 6 new fields)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pref = await (this.prisma as any).notificationPreference.findUnique({
      where: { userId: data.userId },
    });

    const fcmToken: string | undefined = pref?.fcmToken;

    if (!fcmToken) {
      this.logger.warn(
        { userId: data.userId, notificationId: data.notificationId },
        'No FCM token — skipping push',
      );
      return;
    }

    this.logger.log({ notificationId: data.notificationId, attempt }, 'Sending push notification');

    const result = await this.pushProvider.send({
      notificationId: data.notificationId,
      userId: data.userId,
      recipient: fcmToken,
      title: data.title,
      message: data.message,
      channel: data.channel,
      actionUrl: data.actionUrl,
    });

    if (result.success) {
      await this.tracker.trackSent(data.notificationId, 'fcm', result, attempt);
      this.logger.log({ notificationId: data.notificationId }, 'Push delivered');
      return;
    }

    const willRetry = attempt < maxRetries;
    await this.tracker.trackFailed(
      data.notificationId,
      'fcm',
      result.error ?? 'Unknown',
      attempt,
      willRetry,
    );

    if (!willRetry) {
      this.logger.error(
        { notificationId: data.notificationId, attempt },
        'Push failed — moving to DLQ',
      );
      await this.dlq.add(
        JOB_DEAD_LETTER,
        { ...data, finalError: result.error },
        {
          ...DEFAULT_JOB_OPTIONS,
          jobId: `dlq-push-${data.notificationId}`,
        },
      );
      return;
    }

    throw new Error(`Push failed (attempt ${attempt}): ${result.error}`);
  }
}
