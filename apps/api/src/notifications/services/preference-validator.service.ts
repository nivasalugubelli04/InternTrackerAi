/**
 * Phase 6 — Preference Validator Service
 *
 * Checks:
 *  1. Is the requested channel enabled in user preferences?
 *  2. Is the current time inside quiet hours?
 *  3. Returns reschedule time if quiet hours apply.
 */

import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { NotificationChannel } from '../enums/notification.enums';
import type { DecisionGuardResult } from '../interfaces/notification-decision.interface';

export interface QuietHoursCheckResult {
  isQuietHours: boolean;
  /** If quiet hours: when to reschedule (next allowed window start) */
  resumesAt?: Date | undefined;
}

@Injectable()
export class PreferenceValidatorService {
  private readonly logger = new Logger(PreferenceValidatorService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Bypass stale generated types for Phase 6 extended NotificationPreference fields.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private get p(): any {
    return this.prisma;
  }

  /**
   * Check whether the channel is enabled for the user.
   */
  async validateChannel(
    userId: string,
    channel: NotificationChannel,
  ): Promise<DecisionGuardResult> {
    const pref = await this.p.notificationPreference.findUnique({ where: { userId } });
    if (!pref) {
      // No preferences set — allow by default
      return { passed: true };
    }

    switch (channel) {
      case NotificationChannel.EMAIL:
        return pref.emailEnabled
          ? { passed: true }
          : { passed: false, reason: 'Email notifications disabled by user' };

      case NotificationChannel.PUSH:
        return pref.pushEnabled
          ? { passed: true }
          : { passed: false, reason: 'Push notifications disabled by user' };

      case NotificationChannel.SMS:
        return pref.smsEnabled === true
          ? { passed: true }
          : { passed: false, reason: 'SMS notifications disabled by user' };

      default:
        return { passed: false, reason: `Unknown channel: ${channel as string}` };
    }
  }

  /**
   * Check whether the current wall-clock time falls inside the user's quiet hours.
   * Quiet hours suppress Push and SMS; Email digest is still allowed.
   */
  async checkQuietHours(userId: string): Promise<QuietHoursCheckResult> {
    const pref = await this.p.notificationPreference.findUnique({ where: { userId } });
    if (!pref?.quietHoursStart || !pref?.quietHoursEnd) {
      return { isQuietHours: false };
    }

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const startMinutes = this.parseTime(pref.quietHoursStart);
    const endMinutes = this.parseTime(pref.quietHoursEnd);

    const inQuiet = this.isInWindow(currentMinutes, startMinutes, endMinutes);
    if (!inQuiet) {
      return { isQuietHours: false };
    }

    // Calculate resumesAt — next wall-clock moment when quiet hours end
    const resumesAt = this.computeResumesAt(now, endMinutes);
    this.logger.debug({ userId, resumesAt }, 'Quiet hours active — rescheduling');
    return { isQuietHours: true, resumesAt };
  }

  /**
   * Check whether any notification channels are enabled at all.
   */
  async hasAnyChannelEnabled(userId: string): Promise<DecisionGuardResult> {
    const pref = await this.p.notificationPreference.findUnique({ where: { userId } });
    if (!pref) return { passed: true };

    const anyEnabled =
      pref.emailEnabled || pref.pushEnabled || pref.dailyDigest || pref.weeklyDigest;
    return anyEnabled
      ? { passed: true }
      : { passed: false, reason: 'All notification channels disabled by user' };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Parse "HH:MM" → minutes since midnight */
  private parseTime(hhMm: string): number {
    const [h, m] = hhMm.split(':').map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
  }

  /** Returns true if `t` is in [start, end) — wraps around midnight */
  private isInWindow(t: number, start: number, end: number): boolean {
    if (start <= end) {
      return t >= start && t < end;
    }
    // Wraps midnight: e.g. 22:00–08:00
    return t >= start || t < end;
  }

  private computeResumesAt(now: Date, endMinutes: number): Date {
    const resumes = new Date(now);
    resumes.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0);
    // If end time is earlier in the day than now, it's tomorrow
    if (resumes <= now) {
      resumes.setDate(resumes.getDate() + 1);
    }
    return resumes;
  }
}
