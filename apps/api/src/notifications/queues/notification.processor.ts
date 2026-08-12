/**
 * Phase 6 — Main Notification Processor
 *
 * Consumes jobs from `notification-queue`.
 * For each job: looks up the notification, routes to the correct
 * channel queue (email / push / sms).
 */

import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { Queue } from 'bullmq';

import {
  NOTIFICATION_QUEUE,
  EMAIL_QUEUE,
  PUSH_QUEUE,
  SMS_QUEUE,
  JOB_SEND_EMAIL,
  JOB_SEND_PUSH,
  JOB_SEND_SMS,
  JOB_PROCESS_NOTIFICATION,
  DEFAULT_JOB_OPTIONS,
} from '../constants/notification.constants';
import { NotificationChannel } from '../enums/notification.enums';
import type { NotificationJobData } from '../interfaces/notification-decision.interface';
import { DeliveryTrackerService } from '../services/delivery-tracker.service';

@Processor(NOTIFICATION_QUEUE)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    @InjectQueue(EMAIL_QUEUE) private readonly emailQueue: Queue,
    @InjectQueue(PUSH_QUEUE) private readonly pushQueue: Queue,
    @InjectQueue(SMS_QUEUE) private readonly smsQueue: Queue,
    private readonly tracker: DeliveryTrackerService,
  ) {
    super();
  }

  async process(job: Job<NotificationJobData>): Promise<void> {
    const data = job.data;
    this.logger.log(
      { notificationId: data.notificationId, channel: data.channel },
      'Routing notification',
    );

    await this.tracker.trackQueued(data.notificationId);

    switch (data.channel) {
      case NotificationChannel.EMAIL:
        await this.emailQueue.add(JOB_SEND_EMAIL, data, {
          ...DEFAULT_JOB_OPTIONS,
          jobId: `email-${data.notificationId}`,
        });
        break;

      case NotificationChannel.PUSH:
        await this.pushQueue.add(JOB_SEND_PUSH, data, {
          ...DEFAULT_JOB_OPTIONS,
          jobId: `push-${data.notificationId}`,
        });
        break;

      case NotificationChannel.SMS:
        await this.smsQueue.add(JOB_SEND_SMS, data, {
          ...DEFAULT_JOB_OPTIONS,
          jobId: `sms-${data.notificationId}`,
        });
        break;

      default:
        this.logger.warn({ channel: data.channel }, 'Unknown channel — dropping job');
    }
  }
}

export { JOB_PROCESS_NOTIFICATION };
