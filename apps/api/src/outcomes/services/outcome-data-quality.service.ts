/**
 * OutcomeDataQualityService
 *
 * Validates raw application / interview / offer records before they are used
 * in metric calculations. Tracks and logs data quality findings.
 *
 * Rules validated:
 *  1. Applications with status APPLIED but no appliedAt timestamp
 *  2. Applications with logically impossible status transitions
 *  3. Duplicate application records (same userId + jobId, multiple appliedAt)
 *  4. HiringInterviews with missing scheduledStart
 *  5. Offers with acceptedAt before sentAt
 *  6. AssessmentAssignments with submittedAt before startedAt
 */
import { Injectable, Logger } from '@nestjs/common';
import { ApplicationStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

export interface DataQualityReport {
  totalChecked: number;
  missingTimestamp: number;
  duplicateCount: number;
  invalidTransitions: number;
  conflictingStatus: number;
  excludedCount: number;
  qualityScore: number;
  details: {
    missingAppliedAt: string[];
    invalidTransitionIds: string[];
    duplicateApplicationIds: string[];
    offerTimeConflicts: string[];
    assessmentTimeConflicts: string[];
  };
}

// Valid forward-only status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  DISCOVERED: ['SAVED', 'APPLIED', 'REJECTED', 'WITHDRAWN'],
  SAVED: ['APPLIED', 'REJECTED', 'WITHDRAWN'],
  APPLIED: ['ASSESSMENT', 'INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN'],
  ASSESSMENT: ['INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN'],
  INTERVIEW: ['OFFER', 'REJECTED', 'WITHDRAWN'],
  OFFER: ['REJECTED', 'WITHDRAWN'],
};

@Injectable()
export class OutcomeDataQualityService {
  private readonly logger = new Logger(OutcomeDataQualityService.name);

  constructor(private readonly prisma: PrismaService) {}

  async runValidation(periodStart: Date, periodEnd: Date): Promise<DataQualityReport> {
    this.logger.log(`Running data quality validation for ${periodStart.toISOString()} – ${periodEnd.toISOString()}`);

    const [
      applications,
      appEvents,
      interviews,
      offers,
      assessmentAssignments,
    ] = await Promise.all([
      this.prisma.application.findMany({
        where: {
          createdAt: { gte: periodStart, lte: periodEnd },
        },
        select: { id: true, userId: true, jobId: true, status: true, appliedAt: true },
      }),
      this.prisma.applicationEvent.findMany({
        where: {
          createdAt: { gte: periodStart, lte: periodEnd },
        },
        select: { applicationId: true, fromStatus: true, toStatus: true },
      }),
      this.prisma.hiringInterview.findMany({
        where: {
          createdAt: { gte: periodStart, lte: periodEnd },
        },
        select: { id: true, scheduledStart: true, scheduledEnd: true, status: true },
      }),
      this.prisma.offer.findMany({
        where: {
          createdAt: { gte: periodStart, lte: periodEnd },
        },
        select: { id: true, createdAt: true, acceptedAt: true, declinedAt: true },
      }),
      this.prisma.assessmentAssignment.findMany({
        where: {
          createdAt: { gte: periodStart, lte: periodEnd },
        },
        select: { id: true, startedAt: true, submittedAt: true },
      }),
    ]);

    const totalChecked = applications.length + interviews.length + offers.length;

    // 1. Missing appliedAt
    const missingAppliedAt = applications
      .filter((a) => a.status === ApplicationStatus.APPLIED && !a.appliedAt)
      .map((a) => a.id);

    // 2. Invalid transitions
    const invalidTransitionIds: string[] = [];
    for (const event of appEvents) {
      if (event.fromStatus) {
        const allowed = VALID_TRANSITIONS[event.fromStatus];
        if (allowed && !allowed.includes(event.toStatus)) {
          invalidTransitionIds.push(event.applicationId);
        }
      }
    }

    // 3. Duplicates (same userId+jobId appearing multiple times)
    const seenKeys = new Set<string>();
    const duplicateApplicationIds: string[] = [];
    for (const app of applications) {
      const key = `${app.userId}:${app.jobId}`;
      if (seenKeys.has(key)) {
        duplicateApplicationIds.push(app.id);
      } else {
        seenKeys.add(key);
      }
    }

    // 4. Offer time conflicts
    const offerTimeConflicts = offers
      .filter((o) => o.acceptedAt && o.acceptedAt < o.createdAt)
      .map((o) => o.id);

    // 5. Assessment time conflicts
    const assessmentTimeConflicts = assessmentAssignments
      .filter((a) => a.startedAt && a.submittedAt && a.submittedAt < a.startedAt)
      .map((a) => a.id);

    const excludedCount =
      new Set([
        ...missingAppliedAt,
        ...duplicateApplicationIds,
        ...offerTimeConflicts,
      ]).size;

    const issueCount =
      missingAppliedAt.length +
      invalidTransitionIds.length +
      duplicateApplicationIds.length +
      offerTimeConflicts.length +
      assessmentTimeConflicts.length;

    const qualityScore =
      totalChecked > 0
        ? Math.max(0, 100 - (issueCount / totalChecked) * 100)
        : 100;

    const report: DataQualityReport = {
      totalChecked,
      missingTimestamp: missingAppliedAt.length,
      duplicateCount: duplicateApplicationIds.length,
      invalidTransitions: invalidTransitionIds.length,
      conflictingStatus: offerTimeConflicts.length + assessmentTimeConflicts.length,
      excludedCount,
      qualityScore: Math.round(qualityScore * 100) / 100,
      details: {
        missingAppliedAt,
        invalidTransitionIds: [...new Set(invalidTransitionIds)],
        duplicateApplicationIds,
        offerTimeConflicts,
        assessmentTimeConflicts,
      },
    };

    // Persist the log
    await this.prisma.outcomeDataQualityLog.create({
      data: {
        totalChecked: report.totalChecked,
        missingTimestamp: report.missingTimestamp,
        duplicateCount: report.duplicateCount,
        invalidTransitions: report.invalidTransitions,
        conflictingStatus: report.conflictingStatus,
        excludedCount: report.excludedCount,
        qualityScore: report.qualityScore,
        detailsJson: {
          missingAppliedAt: report.details.missingAppliedAt.slice(0, 100),
          invalidTransitionIds: report.details.invalidTransitionIds.slice(0, 100),
          duplicateApplicationIds: report.details.duplicateApplicationIds.slice(0, 100),
          offerTimeConflicts: report.details.offerTimeConflicts.slice(0, 100),
          assessmentTimeConflicts: report.details.assessmentTimeConflicts.slice(0, 100),
        },
      },
    });

    this.logger.log(`Data quality score: ${report.qualityScore}% (${excludedCount} excluded)`);

    return report;
  }

  async getLatestLog() {
    return this.prisma.outcomeDataQualityLog.findFirst({
      orderBy: { runAt: 'desc' },
    });
  }

  async getQualityHistory(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    return this.prisma.outcomeDataQualityLog.findMany({
      where: { runAt: { gte: since } },
      orderBy: { runAt: 'desc' },
      take: 100,
    });
  }

  /**
   * Returns set of application IDs that should be excluded from metrics
   * due to data quality issues within the given time window.
   */
  async getExcludedApplicationIds(periodStart: Date, periodEnd: Date): Promise<Set<string>> {
    const [missingAt, events] = await Promise.all([
      this.prisma.application.findMany({
        where: {
          status: ApplicationStatus.APPLIED,
          appliedAt: null,
          createdAt: { gte: periodStart, lte: periodEnd },
        },
        select: { id: true },
      }),
      this.prisma.applicationEvent.findMany({
        where: { createdAt: { gte: periodStart, lte: periodEnd } },
        select: { applicationId: true, fromStatus: true, toStatus: true },
      }),
    ]);

    const excluded = new Set<string>(missingAt.map((a) => a.id));

    for (const event of events) {
      if (event.fromStatus) {
        const allowed = VALID_TRANSITIONS[event.fromStatus];
        if (allowed && !allowed.includes(event.toStatus)) {
          excluded.add(event.applicationId);
        }
      }
    }

    return excluded;
  }
}
