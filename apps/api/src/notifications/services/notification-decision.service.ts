/**
 * Phase 6 — Notification Decision Engine
 *
 * The central orchestrator that evaluates 7 guard conditions and
 * produces a NotificationDeliveryPlan for every incoming recommendation.
 *
 * Guard order (fail-fast):
 *  1. Notifications enabled for user?
 *  2. Score above minimum threshold?
 *  3. Not already notified for this job? (duplicate check)
 *  4. Recommendation not already dismissed?
 *  5. Quiet hours? (→ schedule for later)
 *  6. Frequency limit not exceeded?
 *  7. Determine channels from score thresholds.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AppConfig } from '../../config/configuration';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { REDIS_NOTIF_DEDUP_PREFIX, DEDUP_TTL_SECONDS } from '../constants/notification.constants';
import {
  DeliveryDecision,
  NotificationChannel,
  NotificationPriority,
} from '../enums/notification.enums';
import type {
  RecommendationContext,
  NotificationDeliveryPlan,
} from '../interfaces/notification-decision.interface';

import { FrequencyLimiterService } from './frequency-limiter.service';
import { PreferenceValidatorService } from './preference-validator.service';
import { PriorityCalculatorService } from './priority-calculator.service';

@Injectable()
export class NotificationDecisionService {
  private readonly logger = new Logger(NotificationDecisionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly priorityCalc: PriorityCalculatorService,
    private readonly preferenceValidator: PreferenceValidatorService,
    private readonly frequencyLimiter: FrequencyLimiterService,
  ) {}

  /**
   * Main entry point — evaluate one recommendation and return a delivery plan.
   */
  async evaluate(ctx: RecommendationContext): Promise<NotificationDeliveryPlan> {
    const notifConfig = this.config.get('notifications', { infer: true });
    const thresholds = notifConfig.thresholds;

    this.logger.debug(
      { userId: ctx.userId, jobId: ctx.jobId, score: ctx.matchScore },
      'Decision engine evaluating',
    );

    // ── Guard 1: Any notification channel enabled? ───────────────────────────
    const channelCheck = await this.preferenceValidator.hasAnyChannelEnabled(ctx.userId);
    if (!channelCheck.passed) {
      return this.skip(ctx, channelCheck.reason ?? 'No channels enabled');
    }

    // ── Guard 2: Score above minimum (digest) threshold? ────────────────────
    if (ctx.matchScore < thresholds.digestOnly) {
      return this.skip(
        ctx,
        `Score ${ctx.matchScore} below minimum threshold ${thresholds.digestOnly}`,
      );
    }

    // ── Guard 3: Duplicate detection ─────────────────────────────────────────
    const isDuplicate = await this.checkDuplicate(ctx.userId, ctx.jobId);
    if (isDuplicate) {
      return this.skip(ctx, 'Already notified for this job within the past 7 days');
    }

    // ── Guard 4: Recommendation not dismissed ─────────────────────────────
    const recommendation = await this.prisma.recommendation.findFirst({
      where: { userId: ctx.userId, jobId: ctx.jobId },
    });
    if (recommendation?.isDismissed) {
      return this.skip(ctx, 'Recommendation was dismissed by user');
    }

    // ── Compute priority ─────────────────────────────────────────────────────
    const priority = this.priorityCalc.calculate(ctx);

    // ── Determine delivery decision & channels from score ────────────────────
    const { decision, channels } = this.determineDelivery(ctx.matchScore, thresholds);

    if (decision === DeliveryDecision.SKIP) {
      return this.skip(ctx, 'Score below all thresholds');
    }

    // ── Guard 5: Quiet hours (only for instant) ───────────────────────────────
    let scheduledFor: Date | undefined;
    if (decision === DeliveryDecision.INSTANT) {
      const quietCheck = await this.preferenceValidator.checkQuietHours(ctx.userId);
      if (quietCheck.isQuietHours) {
        // Delay push/SMS; email digest can still go
        scheduledFor = quietCheck.resumesAt;
      }
    }

    // ── Guard 6: Frequency limit ──────────────────────────────────────────────
    const isInstant = decision === DeliveryDecision.INSTANT;
    const freqCheck = await this.frequencyLimiter.checkLimit(ctx.userId, isInstant);
    if (!freqCheck.passed) {
      // Downgrade to digest instead of skipping entirely
      this.logger.debug({ userId: ctx.userId }, 'Frequency limit hit — downgrading to digest');
      return this.buildPlan(ctx, DeliveryDecision.DAILY_DIGEST, [], priority);
    }

    // ── Filter channels by user preferences ──────────────────────────────────
    const allowedChannels = await this.filterChannelsByPreference(ctx.userId, channels);

    // Mark as seen in Redis for dedup
    await this.markSeen(ctx.userId, ctx.jobId);

    const { title, message } = this.buildContent(ctx);

    return {
      userId: ctx.userId,
      jobId: ctx.jobId,
      recommendationId: ctx.recommendationId,
      decision,
      channels: allowedChannels,
      priority,
      title,
      message,
      scheduledFor,
    };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private determineDelivery(
    score: number,
    thresholds: AppConfig['notifications']['thresholds'],
  ): { decision: DeliveryDecision; channels: NotificationChannel[] } {
    if (score >= thresholds.instantPushEmail) {
      return {
        decision: DeliveryDecision.INSTANT,
        channels: [NotificationChannel.PUSH, NotificationChannel.EMAIL],
      };
    }
    if (score >= thresholds.pushOnly) {
      return {
        decision: DeliveryDecision.INSTANT,
        channels: [NotificationChannel.PUSH],
      };
    }
    if (score >= thresholds.emailOnly) {
      return {
        decision: DeliveryDecision.INSTANT,
        channels: [NotificationChannel.EMAIL],
      };
    }
    if (score >= thresholds.digestOnly) {
      return { decision: DeliveryDecision.DAILY_DIGEST, channels: [] };
    }
    return { decision: DeliveryDecision.SKIP, channels: [] };
  }

  private async filterChannelsByPreference(
    userId: string,
    channels: NotificationChannel[],
  ): Promise<NotificationChannel[]> {
    const results = await Promise.all(
      channels.map((ch) => this.preferenceValidator.validateChannel(userId, ch)),
    );
    return channels.filter((_, i) => results[i]?.passed);
  }

  private async checkDuplicate(userId: string, jobId: string): Promise<boolean> {
    const key = `${REDIS_NOTIF_DEDUP_PREFIX}:${userId}:${jobId}`;
    const exists = await this.redis.getClient().exists(key);
    return exists === 1;
  }

  private async markSeen(userId: string, jobId: string): Promise<void> {
    const key = `${REDIS_NOTIF_DEDUP_PREFIX}:${userId}:${jobId}`;
    await this.redis.getClient().set(key, '1', 'EX', DEDUP_TTL_SECONDS);
  }

  private buildContent(ctx: RecommendationContext): { title: string; message: string } {
    return {
      title: '🎯 New Internship Match',
      message: `You have a ${Math.round(ctx.matchScore)}% match! Check it out before it closes.`,
    };
  }

  private buildPlan(
    ctx: RecommendationContext,
    decision: DeliveryDecision,
    channels: NotificationChannel[],
    priority: NotificationPriority,
  ): NotificationDeliveryPlan {
    const { title, message } = this.buildContent(ctx);
    return {
      userId: ctx.userId,
      jobId: ctx.jobId,
      recommendationId: ctx.recommendationId,
      decision,
      channels,
      priority,
      title,
      message,
    };
  }

  private skip(ctx: RecommendationContext, reason: string): NotificationDeliveryPlan {
    this.logger.debug({ userId: ctx.userId, jobId: ctx.jobId, reason }, 'Notification skipped');
    return this.buildPlan(ctx, DeliveryDecision.SKIP, [], NotificationPriority.LOW);
  }
}
