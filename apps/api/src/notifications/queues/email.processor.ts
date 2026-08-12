/**
 * Phase 6 — Email Queue Processor
 * Sends emails via EmailProvider with retry + DLQ support.
 */

import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Job } from 'bullmq';
import { Queue } from 'bullmq';

import type { AppConfig } from '../../config/configuration';
import {
  EMAIL_QUEUE,
  DEAD_LETTER_QUEUE,
  JOB_DEAD_LETTER,
  DEFAULT_JOB_OPTIONS,
} from '../constants/notification.constants';
import type { NotificationJobData } from '../interfaces/notification-decision.interface';
import { EmailProvider } from '../providers/email.provider';
import { DeliveryTrackerService } from '../services/delivery-tracker.service';

@Processor(EMAIL_QUEUE)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    private readonly emailProvider: EmailProvider,
    private readonly tracker: DeliveryTrackerService,
    private readonly config: ConfigService<AppConfig, true>,
    @InjectQueue(DEAD_LETTER_QUEUE) private readonly dlq: Queue,
  ) {
    super();
  }

  async process(job: Job<NotificationJobData>): Promise<void> {
    const data = job.data;
    const attempt = (data.attempt ?? 0) + 1;
    const maxRetries = this.config.get('notifications.maxRetries', { infer: true });

    this.logger.log({ notificationId: data.notificationId, attempt }, 'Sending email');

    const result = await this.emailProvider.send({
      notificationId: data.notificationId,
      userId: data.userId,
      recipient: data.recipient,
      title: data.title,
      message: data.message,
      channel: data.channel,
      actionUrl: data.actionUrl,
    });

    if (result.success) {
      await this.tracker.trackSent(data.notificationId, 'sendgrid', result, attempt);
      this.logger.log({ notificationId: data.notificationId }, 'Email delivered');
      return;
    }

    // Handle failure
    const willRetry = attempt < maxRetries;
    await this.tracker.trackFailed(
      data.notificationId,
      'sendgrid',
      result.error ?? 'Unknown',
      attempt,
      willRetry,
    );

    if (!willRetry) {
      this.logger.error(
        { notificationId: data.notificationId, attempt },
        'Email failed — moving to DLQ',
      );
      await this.dlq.add(
        JOB_DEAD_LETTER,
        { ...data, finalError: result.error },
        {
          ...DEFAULT_JOB_OPTIONS,
          jobId: `dlq-email-${data.notificationId}`,
        },
      );
      return;
    }

    // Re-throw to let BullMQ handle exponential backoff via job retry
    const baseDelay = this.config.get('notifications.retryBaseDelayMs', { infer: true });
    throw new Error(
      `Email failed (attempt ${attempt}): ${result.error}. Base delay: ${baseDelay}ms`,
    );
  }
}
