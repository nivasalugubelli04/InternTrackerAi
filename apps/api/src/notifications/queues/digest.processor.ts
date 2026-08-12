/**
 * Phase 6 — Digest Queue Processor
 *
 * Processes daily and weekly digest jobs.
 * Finds all pending digest-eligible recommendations for the user,
 * groups them, deduplicates, and sends a single digest email.
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';

import { PrismaService } from '../../prisma/prisma.service';
import { DIGEST_QUEUE } from '../constants/notification.constants';
import {
  NotificationChannel,
  NotificationStatus,
  NotificationType,
} from '../enums/notification.enums';
import type { DigestJobData } from '../interfaces/notification-decision.interface';
import { EmailProvider } from '../providers/email.provider';
import { DeliveryTrackerService } from '../services/delivery-tracker.service';
import { buildDigestHtml, type DigestJob } from '../templates/digest.template';

@Processor(DIGEST_QUEUE)
export class DigestProcessor extends WorkerHost {
  private readonly logger = new Logger(DigestProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailProvider: EmailProvider,
    private readonly tracker: DeliveryTrackerService,
  ) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private get p(): any {
    return this.prisma;
  }

  async process(job: Job<DigestJobData>): Promise<void> {
    const { userId, digestType, periodStart } = job.data;

    this.logger.log({ userId, digestType, periodStart }, 'Processing digest');

    // Find unread recommendations from the period that are digest-eligible
    const recommendations = await this.prisma.recommendation.findMany({
      where: {
        userId,
        isViewed: false,
        isDismissed: false,
        createdAt: { gte: new Date(periodStart) },
      },
      include: {
        job: { include: { company: true } },
      },
      orderBy: { rank: 'asc' },
      take: 20,
    });

    if (recommendations.length === 0) {
      this.logger.debug({ userId, digestType }, 'No digest-eligible recommendations — skipping');
      return;
    }

    // Get user email
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) {
      this.logger.warn({ userId }, 'User not found for digest');
      return;
    }

    // Build digest job list
    const jobs: DigestJob[] = recommendations.map((rec) => ({
      title: rec.job.title,
      company: rec.job.company.name,
      location: rec.job.location ?? undefined,
      matchScore: 75, // Default since MatchScore is a separate model
      deadline: rec.job.deadline?.toISOString().split('T')[0],
      actionUrl: rec.job.applicationUrl,
    }));

    const now = new Date();
    const period = now.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
    const html = buildDigestHtml({ digestType, period, jobs });

    const notifType =
      digestType === 'DAILY' ? NotificationType.DAILY_DIGEST : NotificationType.WEEKLY_DIGEST;

    // Create digest notification record
    const notification = await this.p.notification.create({
      data: {
        userId,
        type: notifType,
        title:
          digestType === 'DAILY'
            ? '📅 Your Daily Internship Digest'
            : '📆 Your Weekly Internship Digest',
        message: `${jobs.length} new internship match${jobs.length !== 1 ? 'es' : ''} for you`,
        channel: NotificationChannel.EMAIL,
        status: NotificationStatus.PENDING,
      },
    });

    await this.tracker.trackCreated(notification.id);

    const result = await this.emailProvider.send({
      notificationId: notification.id,
      userId,
      recipient: user.email,
      title: notification.title,
      message: notification.message,
      channel: NotificationChannel.EMAIL,
      metadata: { html }, // Pass pre-built HTML template
    });

    if (result.success) {
      await this.tracker.trackSent(notification.id, 'sendgrid', result, 1);
      this.logger.log({ userId, digestType, count: jobs.length }, 'Digest email sent');
    } else {
      await this.tracker.trackFailed(
        notification.id,
        'sendgrid',
        result.error ?? 'Unknown',
        1,
        false,
      );
      this.logger.error({ userId, digestType, error: result.error }, 'Digest email failed');
    }
  }
}
