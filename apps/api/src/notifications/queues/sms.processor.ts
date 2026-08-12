/**
 * Phase 6 — SMS Queue Processor
 * Feature-flagged: gracefully no-ops when Twilio is disabled.
 */

import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Job } from 'bullmq';
import { Queue } from 'bullmq';

import type { AppConfig } from '../../config/configuration';
import {
  SMS_QUEUE,
  DEAD_LETTER_QUEUE,
  JOB_DEAD_LETTER,
  DEFAULT_JOB_OPTIONS,
} from '../constants/notification.constants';
import type { NotificationJobData } from '../interfaces/notification-decision.interface';
import { SmsProvider } from '../providers/sms.provider';
import { DeliveryTrackerService } from '../services/delivery-tracker.service';

@Processor(SMS_QUEUE)
export class SmsProcessor extends WorkerHost {
  private readonly logger = new Logger(SmsProcessor.name);

  constructor(
    private readonly smsProvider: SmsProvider,
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

    if (!this.config.get('notifications.twilioEnabled', { infer: true })) {
      this.logger.debug(
        { notificationId: data.notificationId },
        'SMS feature flag disabled — skipping',
      );
      return;
    }

    this.logger.log({ notificationId: data.notificationId, attempt }, 'Sending SMS');

    const result = await this.smsProvider.send({
      notificationId: data.notificationId,
      userId: data.userId,
      recipient: data.recipient,
      title: data.title,
      message: data.message,
      channel: data.channel,
    });

    if (result.success) {
      await this.tracker.trackSent(data.notificationId, 'twilio', result, attempt);
      return;
    }

    const willRetry = attempt < maxRetries;
    await this.tracker.trackFailed(
      data.notificationId,
      'twilio',
      result.error ?? 'Unknown',
      attempt,
      willRetry,
    );

    if (!willRetry) {
      await this.dlq.add(
        JOB_DEAD_LETTER,
        { ...data, finalError: result.error },
        {
          ...DEFAULT_JOB_OPTIONS,
          jobId: `dlq-sms-${data.notificationId}`,
        },
      );
      return;
    }

    throw new Error(`SMS failed (attempt ${attempt}): ${result.error}`);
  }
}
