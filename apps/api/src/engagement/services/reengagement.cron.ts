import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReengagementCron {
  private readonly logger = new Logger(ReengagementCron.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Identifies users who are inactive (e.g., no applications in 7 days)
   * and queues a smart re-engagement notification.
   * To be called by a BullMQ repeatable job or NestJS @Cron()
   */
  async runWeeklySummaryAndReengagement() {
    this.logger.log('Running weekly re-engagement job');

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // 1. Identify inactive users (no activity recently)
    // For MVP, we check users whose lastLoginAt < 7 days ago
    const inactiveUsers = await this.prisma.user.findMany({
      where: {
        lastLoginAt: { lt: sevenDaysAgo },
        isActive: true,
      },
      take: 100, // Batching in reality
    });

    for (const user of inactiveUsers) {
      // Create a notification for them
      // In reality, this would push an event to the existing Notification Engine
      // e.g., this.notificationService.send(userId, 'REENGAGEMENT_REMINDER')

      // We log for MVP
      this.logger.debug(`Would send re-engagement to ${user.email}`);
    }

    // 2. Weekly Career Summary for active users
    const activeUsers = await this.prisma.user.findMany({
      where: {
        lastLoginAt: { gte: sevenDaysAgo },
        isActive: true,
      },
      take: 100,
    });

    for (const user of activeUsers) {
      // this.notificationService.send(userId, 'WEEKLY_SUMMARY', { stats })
      this.logger.debug(`Would send Weekly Summary to ${user.email}`);
    }

    this.logger.log('Finished weekly re-engagement job');
  }
}
