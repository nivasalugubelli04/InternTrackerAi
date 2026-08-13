/**
 * Phase 6 — Notifications Service
 *
 * Handles CRUD, preference updates, test notifications, and history queries.
 */

import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Queue } from 'bullmq';

import { PrismaService } from '../../prisma/prisma.service';
import {
  NOTIFICATION_QUEUE,
  JOB_PROCESS_NOTIFICATION,
  DEFAULT_JOB_OPTIONS,
} from '../constants/notification.constants';
import type { GetNotificationsQueryDto, MarkReadDto } from '../dto/mark-read.dto';
import type { PaginatedNotificationsDto } from '../dto/notification-response.dto';
import type { TestNotificationDto } from '../dto/test-notification.dto';
import type { UpdateNotificationPreferencesDto } from '../dto/update-notification-preferences.dto';
import {
  NotificationChannel,
  NotificationStatus,
  NotificationPriority,
  NotificationType,
} from '../enums/notification.enums';
import type { NotificationJobData } from '../interfaces/notification-decision.interface';

import { DeliveryTrackerService } from './delivery-tracker.service';
import { FrequencyLimiterService } from './frequency-limiter.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly frequencyLimiter: FrequencyLimiterService,
    private readonly tracker: DeliveryTrackerService,
    @InjectQueue(NOTIFICATION_QUEUE) private readonly notificationQueue: Queue,
  ) {}

  /**
   * Bypass stale generated types for Phase 6 models.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private get p(): any {
    return this.prisma;
  }

  // ── List & history ─────────────────────────────────────────────────────────

  async findAll(
    userId: string,
    query: GetNotificationsQueryDto,
  ): Promise<PaginatedNotificationsDto> {
    const page = Number(query.page ?? 1);
    const limit = Math.min(Number(query.limit ?? 20), 100);
    const skip = (page - 1) * limit;

    const where = {
      userId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.unreadOnly ? { readAt: null } : {}),
    };

    const [data, total] = await Promise.all([
      this.p.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.p.notification.count({ where }),
    ]);

    return {
      data: data as PaginatedNotificationsDto['data'],
      total,
      page,
      limit,
      hasMore: skip + data.length < total,
    };
  }

  async findOne(userId: string, id: string) {
    const notification = await this.p.notification.findUnique({
      where: { id },
      include: { events: { orderBy: { timestamp: 'asc' } }, deliveryAttempts: true },
    });

    if (!notification) throw new NotFoundException('Notification not found');
    if (notification.userId !== userId) throw new ForbiddenException();

    return notification;
  }

  // ── Mark as read ───────────────────────────────────────────────────────────

  async markRead(userId: string, dto: MarkReadDto): Promise<{ updated: number }> {
    const result = await this.p.notification.updateMany({
      where: {
        id: { in: dto.ids },
        userId,
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    // Track opens for analytics
    for (const id of dto.ids) {
      void this.tracker.trackOpened(id);
    }

    return { updated: result.count };
  }

  // ── Preferences ────────────────────────────────────────────────────────────

  async updatePreferences(userId: string, dto: UpdateNotificationPreferencesDto) {
    const pref = await this.p.notificationPreference.upsert({
      where: { userId },
      create: {
        userId,
        emailEnabled: dto.emailEnabled ?? true,
        pushEnabled: dto.pushEnabled ?? true,
        smsEnabled: dto.smsEnabled ?? false,
        dailyDigest: dto.dailyDigest ?? false,
        weeklyDigest: dto.weeklyDigest ?? true,
        ...(dto.quietHoursStart ? { quietHoursStart: dto.quietHoursStart } : {}),
        ...(dto.quietHoursEnd ? { quietHoursEnd: dto.quietHoursEnd } : {}),
        ...(dto.maxNotificationsPerDay !== undefined
          ? { maxNotificationsPerDay: dto.maxNotificationsPerDay }
          : {}),
        ...(dto.maxInstantAlertsPerDay !== undefined
          ? { maxInstantAlertsPerDay: dto.maxInstantAlertsPerDay }
          : {}),
        ...(dto.channelPriority ? { channelPriority: dto.channelPriority } : {}),
        ...(dto.fcmToken ? { fcmToken: dto.fcmToken } : {}),
      },
      update: {
        ...(dto.emailEnabled !== undefined ? { emailEnabled: dto.emailEnabled } : {}),
        ...(dto.pushEnabled !== undefined ? { pushEnabled: dto.pushEnabled } : {}),
        ...(dto.smsEnabled !== undefined ? { smsEnabled: dto.smsEnabled } : {}),
        ...(dto.dailyDigest !== undefined ? { dailyDigest: dto.dailyDigest } : {}),
        ...(dto.weeklyDigest !== undefined ? { weeklyDigest: dto.weeklyDigest } : {}),
        ...(dto.quietHoursStart !== undefined ? { quietHoursStart: dto.quietHoursStart } : {}),
        ...(dto.quietHoursEnd !== undefined ? { quietHoursEnd: dto.quietHoursEnd } : {}),
        ...(dto.maxNotificationsPerDay !== undefined
          ? { maxNotificationsPerDay: dto.maxNotificationsPerDay }
          : {}),
        ...(dto.maxInstantAlertsPerDay !== undefined
          ? { maxInstantAlertsPerDay: dto.maxInstantAlertsPerDay }
          : {}),
        ...(dto.channelPriority !== undefined ? { channelPriority: dto.channelPriority } : {}),
        ...(dto.fcmToken !== undefined ? { fcmToken: dto.fcmToken } : {}),
      },
    });

    this.logger.log({ userId }, 'Notification preferences updated');
    return pref;
  }

  async getPreferences(userId: string) {
    return this.p.notificationPreference.findUnique({ where: { userId } });
  }

  // ── Test notification ──────────────────────────────────────────────────────

  async sendTest(
    userId: string,
    dto: TestNotificationDto,
  ): Promise<{ notificationId: string; queued: boolean }> {
    const channel = dto.channel ?? NotificationChannel.PUSH;
    const targetUserId = dto.targetUserId ?? userId;

    // Get user email for email channel test
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { email: true },
    });

    if (!user) throw new NotFoundException('User not found');

    const notification = await this.p.notification.create({
      data: {
        userId: targetUserId,
        type: NotificationType.TEST,
        title: '🧪 Test Notification',
        message: dto.message ?? 'This is a test notification from InternTracker AI.',
        channel,
        priority: NotificationPriority.LOW,
        status: NotificationStatus.PENDING,
      },
    });

    await this.tracker.trackCreated(notification.id);

    const jobData: NotificationJobData = {
      notificationId: notification.id,
      userId: targetUserId,
      channel,
      priority: NotificationPriority.LOW,
      title: notification.title,
      message: notification.message,
      recipient: channel === NotificationChannel.EMAIL ? user.email : targetUserId,
    };

    await this.notificationQueue.add(JOB_PROCESS_NOTIFICATION, jobData, {
      ...DEFAULT_JOB_OPTIONS,
      jobId: `test-${notification.id}`,
    });

    this.logger.log(
      { userId: targetUserId, notificationId: notification.id, channel },
      'Test notification queued',
    );

    return { notificationId: notification.id, queued: true };
  }

  async queueNotification(data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    channel: NotificationChannel;
    scheduledFor?: Date;
  }) {
    const notification = await this.p.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        channel: data.channel,
        priority: NotificationPriority.MEDIUM,
        status: NotificationStatus.PENDING,
      },
    });

    await this.tracker.trackCreated(notification.id);

    const user = await this.p.user.findUnique({
      where: { id: data.userId },
      select: { email: true },
    });

    const jobData: NotificationJobData = {
      notificationId: notification.id,
      userId: data.userId,
      channel: data.channel,
      priority: NotificationPriority.MEDIUM,
      title: data.title,
      message: data.message,
      recipient: user?.email || '',
    };

    const delay = data.scheduledFor ? Math.max(0, data.scheduledFor.getTime() - Date.now()) : 0;

    await this.notificationQueue.add(JOB_PROCESS_NOTIFICATION, jobData, {
      ...DEFAULT_JOB_OPTIONS,
      jobId: `notify-${notification.id}`,
      delay,
    });
  }

  // ── Testing ────────────────────────────────────────────────────────────────

  async getHistory(userId: string, query: GetNotificationsQueryDto) {
    const page = Number(query.page ?? 1);
    const limit = Math.min(Number(query.limit ?? 20), 100);

    const notifications = await this.p.notification.findMany({
      where: {
        userId,
        status: {
          in: [NotificationStatus.SENT, NotificationStatus.DELIVERED, NotificationStatus.FAILED],
        },
      },
      include: {
        events: { orderBy: { timestamp: 'desc' }, take: 3 },
        deliveryAttempts: { orderBy: { createdAt: 'desc' }, take: 3 },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await this.p.notification.count({
      where: {
        userId,
        status: {
          in: [NotificationStatus.SENT, NotificationStatus.DELIVERED, NotificationStatus.FAILED],
        },
      },
    });

    // Frequency stats
    const counts = await this.frequencyLimiter.getCounts(userId);

    return {
      data: notifications,
      total,
      page,
      limit,
      hasMore: (page - 1) * limit + notifications.length < total,
      todayStats: counts,
    };
  }
}
