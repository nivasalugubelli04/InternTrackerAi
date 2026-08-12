/**
 * Phase 6 — Frequency Limiter Service
 *
 * Uses Redis atomic INCR + EXPIREAT to enforce per-user, per-day limits.
 *
 * Key structure:
 *   notif:freq:{userId}:total       — total notifications today
 *   notif:freq:{userId}:instant     — instant alerts today
 *   notif:freq:{userId}:{channel}   — per-channel count today
 *
 * All keys expire at midnight UTC of the next day so counters reset daily.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AppConfig } from '../../config/configuration';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import {
  REDIS_NOTIF_FREQ_PREFIX,
  FREQ_COUNTER_TTL_SECONDS,
} from '../constants/notification.constants';
import type { NotificationChannel } from '../enums/notification.enums';
import type { DecisionGuardResult } from '../interfaces/notification-decision.interface';

@Injectable()
export class FrequencyLimiterService {
  private readonly logger = new Logger(FrequencyLimiterService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  /**
   * Check whether the user is within their daily notification limit.
   * Returns { passed: false } with a reason if they've hit the limit.
   */
  async checkLimit(userId: string, isInstant: boolean): Promise<DecisionGuardResult> {
    const [totalKey, instantKey] = this.buildKeys(userId);
    const rawPref = await this.prisma.notificationPreference.findUnique({ where: { userId } });
    // Cast to any to handle fields added in Phase 6 migration that may not be in stale generated types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pref = rawPref as any;

    const defaults = this.config.get('notifications.frequencyLimits', { infer: true });
    const maxTotal: number = pref?.maxNotificationsPerDay ?? defaults.maxPerDay;
    const maxInstant: number = pref?.maxInstantAlertsPerDay ?? defaults.maxInstantPerDay;

    // maxTotal = 0 means unlimited
    if (maxTotal > 0) {
      const total = await this.getCount(totalKey);
      if (total >= maxTotal) {
        this.logger.debug({ userId, total, maxTotal }, 'Daily limit reached');
        return { passed: false, reason: `Daily notification limit reached (${maxTotal}/day)` };
      }
    }

    if (isInstant && maxInstant > 0) {
      const instant = await this.getCount(instantKey);
      if (instant >= maxInstant) {
        this.logger.debug({ userId, instant, maxInstant }, 'Instant alert limit reached');
        return { passed: false, reason: `Daily instant alert limit reached (${maxInstant}/day)` };
      }
    }

    return { passed: true };
  }

  /**
   * Increment counters after a notification is confirmed queued.
   * Call this after the notification has been persisted and queued.
   */
  async increment(userId: string, channel: NotificationChannel, isInstant: boolean): Promise<void> {
    const [totalKey, instantKey, channelKey] = this.buildKeys(userId, channel);
    const ttl = this.secondsUntilMidnight();

    await Promise.all([
      this.incrWithTtl(totalKey, ttl),
      isInstant ? this.incrWithTtl(instantKey, ttl) : Promise.resolve(),
      this.incrWithTtl(channelKey, ttl),
    ]);
  }

  /** Get current counts for a user (useful for the API) */
  async getCounts(userId: string): Promise<{
    total: number;
    instant: number;
    byChannel: Record<string, number>;
  }> {
    const [totalKey, instantKey] = this.buildKeys(userId);
    const channels: NotificationChannel[] = ['EMAIL', 'PUSH', 'SMS'] as NotificationChannel[];

    const [total, instant, ...channelCounts] = await Promise.all([
      this.getCount(totalKey),
      this.getCount(instantKey),
      ...channels.map((ch) => this.getCount(this.buildChannelKey(userId, ch))),
    ]);

    const byChannel: Record<string, number> = {};
    channels.forEach((ch, i) => {
      byChannel[ch] = channelCounts[i] ?? 0;
    });

    return { total, instant, byChannel };
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private buildKeys(userId: string, channel?: NotificationChannel): [string, string, string] {
    const base = `${REDIS_NOTIF_FREQ_PREFIX}:${userId}`;
    return [
      `${base}:total`,
      `${base}:instant`,
      channel ? this.buildChannelKey(userId, channel) : `${base}:noop`,
    ];
  }

  private buildChannelKey(userId: string, channel: NotificationChannel): string {
    return `${REDIS_NOTIF_FREQ_PREFIX}:${userId}:${channel.toLowerCase()}`;
  }

  private async getCount(key: string): Promise<number> {
    const val = await this.redis.getClient().get(key);
    return val ? parseInt(val, 10) : 0;
  }

  private async incrWithTtl(key: string, ttl: number): Promise<void> {
    const pipeline = this.redis.getClient().pipeline();
    pipeline.incr(key);
    pipeline.expire(key, ttl);
    await pipeline.exec();
  }

  /** Seconds until the next midnight UTC */
  private secondsUntilMidnight(): number {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setUTCHours(24, 0, 0, 0);
    return Math.max(
      FREQ_COUNTER_TTL_SECONDS,
      Math.ceil((midnight.getTime() - now.getTime()) / 1000),
    );
  }
}
