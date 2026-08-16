/**
 * OutcomeSnapshotService
 *
 * Reads and writes OutcomeSnapshot records.
 * All API endpoints consume snapshots — never raw event tables.
 */
import { Injectable } from '@nestjs/common';
import {
  OutcomeConfidenceLevel,
  OutcomeEntityType,
  OutcomeSnapshotPeriod,
  OutcomeTrendDirection,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OutcomeSnapshotService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Upsert a snapshot for a given entity + period.
   */
  async upsert(data: {
    entityType: OutcomeEntityType;
    entityId?: string | null;
    entityLabel?: string | null;
    periodType: OutcomeSnapshotPeriod;
    periodStart: Date;
    periodEnd: Date;
    registeredCount?: number;
    profileCompletedCount?: number;
    opportunityViewedCount?: number;
    savedCount?: number;
    appliedCount?: number;
    assessmentCount?: number;
    interviewCount?: number;
    offerCount?: number;
    hiredCount?: number;
    rejectedCount?: number;
    withdrawnCount?: number;
    applicationConversionRate?: number | null;
    interviewConversionRate?: number | null;
    offerConversionRate?: number | null;
    hireRate?: number | null;
    medianTimeToApplyHours?: number | null;
    medianTimeToAssessmentHours?: number | null;
    medianTimeToInterviewHours?: number | null;
    medianTimeToOfferHours?: number | null;
    medianTimeToHireHours?: number | null;
    p75TimeToHireHours?: number | null;
    p90TimeToHireHours?: number | null;
    sampleSize?: number;
    belowCohortThreshold?: boolean;
    trendDirection?: OutcomeTrendDirection;
    confidence?: OutcomeConfidenceLevel;
    metadataJson?: any;
  }) {
    const entityId = data.entityId ?? '00000000-0000-0000-0000-000000000000';
    const entityLabel = data.entityLabel ?? '';

    return this.prisma.outcomeSnapshot.upsert({
      where: {
        entityType_entityId_entityLabel_periodType_periodStart: {
          entityType: data.entityType,
          entityId,
          entityLabel,
          periodType: data.periodType,
          periodStart: data.periodStart,
        },
      },
      create: {
        entityType: data.entityType,
        entityId,
        entityLabel,
        periodType: data.periodType,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        registeredCount: data.registeredCount ?? 0,
        profileCompletedCount: data.profileCompletedCount ?? 0,
        opportunityViewedCount: data.opportunityViewedCount ?? 0,
        savedCount: data.savedCount ?? 0,
        appliedCount: data.appliedCount ?? 0,
        assessmentCount: data.assessmentCount ?? 0,
        interviewCount: data.interviewCount ?? 0,
        offerCount: data.offerCount ?? 0,
        hiredCount: data.hiredCount ?? 0,
        rejectedCount: data.rejectedCount ?? 0,
        withdrawnCount: data.withdrawnCount ?? 0,
        applicationConversionRate: data.applicationConversionRate ?? null,
        interviewConversionRate: data.interviewConversionRate ?? null,
        offerConversionRate: data.offerConversionRate ?? null,
        hireRate: data.hireRate ?? null,
        medianTimeToApplyHours: data.medianTimeToApplyHours ?? null,
        medianTimeToAssessmentHours: data.medianTimeToAssessmentHours ?? null,
        medianTimeToInterviewHours: data.medianTimeToInterviewHours ?? null,
        medianTimeToOfferHours: data.medianTimeToOfferHours ?? null,
        medianTimeToHireHours: data.medianTimeToHireHours ?? null,
        p75TimeToHireHours: data.p75TimeToHireHours ?? null,
        p90TimeToHireHours: data.p90TimeToHireHours ?? null,
        sampleSize: data.sampleSize ?? 0,
        belowCohortThreshold: data.belowCohortThreshold ?? false,
        trendDirection: data.trendDirection ?? OutcomeTrendDirection.INSUFFICIENT_DATA,
        confidence: data.confidence ?? OutcomeConfidenceLevel.INSUFFICIENT_DATA,
        metadataJson: data.metadataJson ?? Prisma.DbNull,
        generatedAt: new Date(),
      },
      update: {
        periodEnd: data.periodEnd,
        registeredCount: data.registeredCount ?? 0,
        profileCompletedCount: data.profileCompletedCount ?? 0,
        opportunityViewedCount: data.opportunityViewedCount ?? 0,
        savedCount: data.savedCount ?? 0,
        appliedCount: data.appliedCount ?? 0,
        assessmentCount: data.assessmentCount ?? 0,
        interviewCount: data.interviewCount ?? 0,
        offerCount: data.offerCount ?? 0,
        hiredCount: data.hiredCount ?? 0,
        rejectedCount: data.rejectedCount ?? 0,
        withdrawnCount: data.withdrawnCount ?? 0,
        applicationConversionRate: data.applicationConversionRate ?? null,
        interviewConversionRate: data.interviewConversionRate ?? null,
        offerConversionRate: data.offerConversionRate ?? null,
        hireRate: data.hireRate ?? null,
        medianTimeToApplyHours: data.medianTimeToApplyHours ?? null,
        medianTimeToAssessmentHours: data.medianTimeToAssessmentHours ?? null,
        medianTimeToInterviewHours: data.medianTimeToInterviewHours ?? null,
        medianTimeToOfferHours: data.medianTimeToOfferHours ?? null,
        medianTimeToHireHours: data.medianTimeToHireHours ?? null,
        p75TimeToHireHours: data.p75TimeToHireHours ?? null,
        p90TimeToHireHours: data.p90TimeToHireHours ?? null,
        sampleSize: data.sampleSize ?? 0,
        belowCohortThreshold: data.belowCohortThreshold ?? false,
        trendDirection: data.trendDirection ?? OutcomeTrendDirection.INSUFFICIENT_DATA,
        confidence: data.confidence ?? OutcomeConfidenceLevel.INSUFFICIENT_DATA,
        metadataJson: data.metadataJson ?? Prisma.DbNull,
        generatedAt: new Date(),
      },
    });
  }

  /**
   * Get latest snapshot for a specific entity.
   */
  async getLatest(
    entityType: OutcomeEntityType,
    entityId?: string | null,
    entityLabel?: string | null,
    periodType: OutcomeSnapshotPeriod = OutcomeSnapshotPeriod.MONTHLY,
  ) {
    return this.prisma.outcomeSnapshot.findFirst({
      where: {
        entityType,
        entityId: entityId ?? '00000000-0000-0000-0000-000000000000',
        entityLabel: entityLabel ?? '',
        periodType,
      },
      orderBy: { periodStart: 'desc' },
    });
  }

  /**
   * Get snapshot history for trend display.
   */
  async getHistory(
    entityType: OutcomeEntityType,
    entityId?: string | null,
    entityLabel?: string | null,
    periodType: OutcomeSnapshotPeriod = OutcomeSnapshotPeriod.MONTHLY,
    limit = 12,
  ) {
    return this.prisma.outcomeSnapshot.findMany({
      where: {
        entityType,
        entityId: entityId ?? '00000000-0000-0000-0000-000000000000',
        entityLabel: entityLabel ?? '',
        periodType,
      },
      orderBy: { periodStart: 'desc' },
      take: limit,
    });
  }

  /**
   * Get all snapshots for a given period (admin overview).
   */
  async getByPeriod(
    periodType: OutcomeSnapshotPeriod,
    periodStart: Date,
    entityType?: OutcomeEntityType,
  ) {
    return this.prisma.outcomeSnapshot.findMany({
      where: {
        periodType,
        periodStart: { gte: periodStart },
        ...(entityType ? { entityType } : {}),
      },
      orderBy: { generatedAt: 'desc' },
    });
  }

  /**
   * Compute trend direction by comparing latest two snapshots.
   */
  computeTrend(
    current: number | null,
    previous: number | null,
    threshold = 0.05,
  ): OutcomeTrendDirection {
    if (current === null || previous === null) return OutcomeTrendDirection.INSUFFICIENT_DATA;
    if (previous === 0) return OutcomeTrendDirection.INSUFFICIENT_DATA;
    const change = (current - previous) / previous;
    if (change > threshold) return OutcomeTrendDirection.IMPROVING;
    if (change < -threshold) return OutcomeTrendDirection.DECLINING;
    return OutcomeTrendDirection.STABLE;
  }

  /**
   * Determine confidence level based on sample size.
   */
  computeConfidence(sampleSize: number): OutcomeConfidenceLevel {
    if (sampleSize >= 100) return OutcomeConfidenceLevel.HIGH;
    if (sampleSize >= 30) return OutcomeConfidenceLevel.MEDIUM;
    if (sampleSize >= 10) return OutcomeConfidenceLevel.LOW;
    return OutcomeConfidenceLevel.INSUFFICIENT_DATA;
  }

  /**
   * Get date boundaries for a given period type.
   */
  getPeriodBounds(periodType: OutcomeSnapshotPeriod): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date(end);
    if (periodType === OutcomeSnapshotPeriod.DAILY) {
      start.setDate(start.getDate() - 1);
    } else if (periodType === OutcomeSnapshotPeriod.WEEKLY) {
      start.setDate(start.getDate() - 7);
    } else {
      start.setDate(start.getDate() - 30);
    }
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
}
