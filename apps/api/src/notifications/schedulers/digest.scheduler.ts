/**
 * Phase 6 — Digest Scheduler
 *
 * Schedules daily (Mon-Fri 17:00) and weekly (Sunday 18:00) digest jobs
 * for all users who have the respective digest option enabled.
 *
 * Uses NestJS @Cron — runs in the API process itself.
 * In high-scale scenarios, this can be moved to a dedicated worker.
 */

import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Queue } from 'bullmq';

import { PrismaService } from '../../prisma/prisma.service';
import {
  DIGEST_QUEUE,
  JOB_DAILY_DIGEST,
  JOB_WEEKLY_DIGEST,
  DEFAULT_JOB_OPTIONS,
} from '../constants/notification.constants';
import type { DigestJobData } from '../interfaces/notification-decision.interface';

@Injectable()
export class DigestSchedulerService {
  private readonly logger = new Logger(DigestSchedulerService.name);

  constructor(
    @InjectQueue(DIGEST_QUEUE) private readonly digestQueue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Daily digest — Monday through Friday at 17:00 (server local time).
   * Cron configured via DIGEST_DAILY_CRON env var.
   */
  @Cron('0 17 * * 1-5', { name: 'daily-digest-scheduler' })
  async scheduleDailyDigests(): Promise<void> {
    this.logger.log('Scheduling daily digest jobs');

    const users = await this.prisma.notificationPreference.findMany({
      where: { dailyDigest: true, emailEnabled: true },
      select: { userId: true },
    });

    this.logger.log({ count: users.length }, 'Queueing daily digests');

    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - 1);

    const jobs: { name: string; data: DigestJobData }[] = users.map(({ userId }) => ({
      name: JOB_DAILY_DIGEST,
      data: {
        userId,
        digestType: 'DAILY' as const,
        periodStart: periodStart.toISOString(),
      },
    }));

    if (jobs.length > 0) {
      await this.digestQueue.addBulk(
        jobs.map((j) => ({ name: j.name, data: j.data, opts: { ...DEFAULT_JOB_OPTIONS } })),
      );
    }
  }

  /**
   * Weekly digest — Sunday at 18:00.
   */
  @Cron('0 18 * * 0', { name: 'weekly-digest-scheduler' })
  async scheduleWeeklyDigests(): Promise<void> {
    this.logger.log('Scheduling weekly digest jobs');

    const users = await this.prisma.notificationPreference.findMany({
      where: { weeklyDigest: true, emailEnabled: true },
      select: { userId: true },
    });

    this.logger.log({ count: users.length }, 'Queueing weekly digests');

    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - 7);

    const jobs: { name: string; data: DigestJobData }[] = users.map(({ userId }) => ({
      name: JOB_WEEKLY_DIGEST,
      data: {
        userId,
        digestType: 'WEEKLY' as const,
        periodStart: periodStart.toISOString(),
      },
    }));

    if (jobs.length > 0) {
      await this.digestQueue.addBulk(
        jobs.map((j) => ({ name: j.name, data: j.data, opts: { ...DEFAULT_JOB_OPTIONS } })),
      );
    }
  }
}
