import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { SignalPriority } from '../interfaces/engagement.interfaces';

@Injectable()
export class NotificationFatigueService {
  private readonly logger = new Logger(NotificationFatigueService.name);

  // Maximum allowed non-critical notifications within a 24h window
  private readonly MAX_DAILY_NOTIFICATIONS = 2;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Checks whether a notification is permitted or blocked due to fatigue / quiet hours.
   */
  async canDeliverNotification(
    userId: string,
    priority: SignalPriority,
  ): Promise<{
    allowed: boolean;
    reason?: string | undefined;
  }> {
    // 1. Critical priorities (interview tomorrow, immediate deadline) always bypass fatigue limits
    if (priority === 'CRITICAL') {
      return { allowed: true };
    }

    // 2. Quiet Hours check (10:00 PM to 8:00 AM)
    const currentHour = new Date().getHours();
    const isQuietHours = currentHour >= 22 || currentHour < 8;
    if (isQuietHours && priority !== 'HIGH') {
      return { allowed: false, reason: 'Quiet hours active (10 PM - 8 AM)' };
    }

    // 3. 24h frequency limit check
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCount = await this.prisma.notification.count({
      where: {
        userId,
        createdAt: { gte: oneDayAgo },
        status: { in: ['SENT', 'DELIVERED', 'QUEUED'] as any },
      },
    });

    if (recentCount >= this.MAX_DAILY_NOTIFICATIONS) {
      this.logger.debug(
        `User ${userId} reached daily notification frequency cap (${recentCount}/${this.MAX_DAILY_NOTIFICATIONS}).`,
      );
      return { allowed: false, reason: 'Daily frequency limit reached' };
    }

    return { allowed: true };
  }

  /**
   * Records notification delivery into engagement action logs.
   */
  async recordNotificationDelivery(userId: string, notificationId: string, featureArea: string) {
    await this.prisma.engagementActionLog.create({
      data: {
        userId,
        notificationId,
        actionType: 'DELIVERED',
        featureArea,
        details: { deliveredAt: new Date().toISOString() },
      },
    });

    await this.prisma.userEngagementState.upsert({
      where: { userId },
      create: {
        userId,
        notificationsSent24h: 1,
        lastNotificationAt: new Date(),
      },
      update: {
        notificationsSent24h: { increment: 1 },
        lastNotificationAt: new Date(),
      },
    });
  }
}
