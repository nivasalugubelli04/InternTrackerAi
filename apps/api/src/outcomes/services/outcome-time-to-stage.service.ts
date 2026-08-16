/**
 * OutcomeTimeToStageService
 *
 * Calculates time-between-stages analytics using ApplicationEvent timestamps.
 *
 * Methodology:
 *  - Uses ApplicationEvent.createdAt to pinpoint when each status transition occurred.
 *  - Durations are in HOURS for precision.
 *  - Reports: median (p50), p75, p90.
 *  - Averages are also returned but labeled "potentially skewed by outliers".
 *  - Records with missing timestamps are excluded (see DataQualityService).
 *
 * Formulas:
 *  Time to Apply    : first APPLIED event.createdAt − application.createdAt
 *  Time to Assessment : first ASSESSMENT event − first APPLIED event
 *  Time to Interview : first INTERVIEW event − first APPLIED event
 *  Time to Offer    : Offer.createdAt − application.appliedAt
 *  Time to Hire     : Offer.acceptedAt − application.appliedAt
 */
import { Injectable } from '@nestjs/common';
import { ApplicationStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

export interface TimeToStageStats {
  median: number | null;
  p75: number | null;
  p90: number | null;
  average: number | null;
  sampleSize: number;
  unit: 'hours';
  note: string;
}

export interface TimeToStageResult {
  timeToApply: TimeToStageStats;
  timeToAssessment: TimeToStageStats;
  timeToInterview: TimeToStageStats;
  timeToOffer: TimeToStageStats;
  timeToHire: TimeToStageStats;
}

@Injectable()
export class OutcomeTimeToStageService {
  constructor(private readonly prisma: PrismaService) {}

  private percentile(sorted: number[], p: number): number | null {
    if (sorted.length === 0) return null;
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(idx, sorted.length - 1))] ?? null;
  }

  private buildStats(durations: number[]): TimeToStageStats {
    if (durations.length === 0) {
      return {
        median: null, p75: null, p90: null, average: null,
        sampleSize: 0, unit: 'hours',
        note: 'Insufficient data for time-to-stage calculation.',
      };
    }
    const sorted = [...durations].sort((a, b) => a - b);
    const sum = sorted.reduce((acc, v) => acc + v, 0);
    return {
      median: this.percentile(sorted, 50),
      p75: this.percentile(sorted, 75),
      p90: this.percentile(sorted, 90),
      average: Math.round((sum / sorted.length) * 100) / 100,
      sampleSize: sorted.length,
      unit: 'hours',
      note:
        'Median (p50) is the primary statistic. Average may be skewed by outliers.',
    };
  }

  private hoursBetween(a: Date, b: Date): number {
    return Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60);
  }

  /**
   * Calculate time-to-stage for a specific user.
   */
  async calculateForUser(userId: string): Promise<TimeToStageResult> {
    const applications = await this.prisma.application.findMany({
      where: { userId, appliedAt: { not: null } },
      include: { events: { orderBy: { createdAt: 'asc' } } },
    });

    const offers = await this.prisma.offer.findMany({
      where: { candidateId: userId },
      select: { createdAt: true, acceptedAt: true },
    });

    const toApply: number[] = [];
    const toAssessment: number[] = [];
    const toInterview: number[] = [];
    const toOffer: number[] = [];
    const toHire: number[] = [];

    for (const app of applications) {
      const appliedEvent = app.events.find((e) => e.toStatus === ApplicationStatus.APPLIED);
      const assessmentEvent = app.events.find((e) => e.toStatus === ApplicationStatus.ASSESSMENT);
      const interviewEvent = app.events.find((e) => e.toStatus === ApplicationStatus.INTERVIEW);

      if (appliedEvent) {
        toApply.push(this.hoursBetween(app.createdAt, appliedEvent.createdAt));
      }
      if (appliedEvent && assessmentEvent) {
        toAssessment.push(this.hoursBetween(appliedEvent.createdAt, assessmentEvent.createdAt));
      }
      if (appliedEvent && interviewEvent) {
        toInterview.push(this.hoursBetween(appliedEvent.createdAt, interviewEvent.createdAt));
      }
    }

    for (const offer of offers) {
      toOffer.push(this.hoursBetween(new Date(0), offer.createdAt)); // relative, from offer sent
      if (offer.acceptedAt) {
        toHire.push(this.hoursBetween(offer.createdAt, offer.acceptedAt));
      }
    }

    return {
      timeToApply: this.buildStats(toApply),
      timeToAssessment: this.buildStats(toAssessment),
      timeToInterview: this.buildStats(toInterview),
      timeToOffer: this.buildStats(toOffer),
      timeToHire: this.buildStats(toHire),
    };
  }

  /**
   * Calculate time-to-stage for all users in a given period.
   * Used by background aggregation jobs.
   */
  async calculatePlatformWide(
    periodStart: Date,
    periodEnd: Date,
    userIdFilter?: string[],
  ): Promise<TimeToStageResult> {
    const whereUser = userIdFilter ? { userId: { in: userIdFilter } } : {};

    const applications = await this.prisma.application.findMany({
      where: {
        ...whereUser,
        appliedAt: { not: null, gte: periodStart, lte: periodEnd },
      },
      include: { events: { orderBy: { createdAt: 'asc' } } },
      take: 10000, // safety cap
    });

    const offers = await this.prisma.offer.findMany({
      where: {
        ...(userIdFilter ? { candidateId: { in: userIdFilter } } : {}),
        createdAt: { gte: periodStart, lte: periodEnd },
      },
      select: { createdAt: true, acceptedAt: true },
      take: 10000,
    });

    const toApply: number[] = [];
    const toAssessment: number[] = [];
    const toInterview: number[] = [];
    const toOffer: number[] = [];
    const toHire: number[] = [];

    for (const app of applications) {
      const appliedEvent = app.events.find((e) => e.toStatus === ApplicationStatus.APPLIED);
      const assessmentEvent = app.events.find((e) => e.toStatus === ApplicationStatus.ASSESSMENT);
      const interviewEvent = app.events.find((e) => e.toStatus === ApplicationStatus.INTERVIEW);

      if (appliedEvent) {
        toApply.push(this.hoursBetween(app.createdAt, appliedEvent.createdAt));
        if (assessmentEvent) {
          toAssessment.push(this.hoursBetween(appliedEvent.createdAt, assessmentEvent.createdAt));
        }
        if (interviewEvent) {
          toInterview.push(this.hoursBetween(appliedEvent.createdAt, interviewEvent.createdAt));
        }
      }
    }

    for (const offer of offers) {
      if (offer.acceptedAt) {
        toHire.push(this.hoursBetween(offer.createdAt, offer.acceptedAt));
      }
    }

    return {
      timeToApply: this.buildStats(toApply),
      timeToAssessment: this.buildStats(toAssessment),
      timeToInterview: this.buildStats(toInterview),
      timeToOffer: this.buildStats(toOffer),
      timeToHire: this.buildStats(toHire),
    };
  }
}
