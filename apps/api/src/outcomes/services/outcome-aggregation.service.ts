/**
 * OutcomeAggregationService
 *
 * Computes the unified career funnel and conversion rates from existing data.
 *
 * Funnel Definition:
 *  Registered → Profile Completed → Opportunity Viewed → Saved →
 *  Applied → Assessment → Interview → Offer → Hired
 *
 * Conversion Rate Formulas (denominators always documented):
 *  applicationConversionRate = applied / opportunity_viewers
 *  interviewConversionRate   = interviewed / applied
 *  offerConversionRate       = offers_sent / interviewed
 *  hireRate                  = accepted_offers / offers_sent
 *
 * Drop-off rate = 1 - conversionRate for each stage transition.
 */
import { Injectable, Logger } from '@nestjs/common';
import { ApplicationStatus, HiringInterviewStatus, OfferStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

export interface FunnelStage {
  stage: string;
  count: number;
  conversionFromPrevious: number | null; // 0.0–1.0, null if no previous
  dropOffRate: number | null;            // 0.0–1.0
  definition: string;                   // explicit formula documentation
}

export interface CareerFunnel {
  periodStart: Date;
  periodEnd: Date;
  stages: FunnelStage[];
  sampleSize: number;
  denominatorNote: string;
}

export interface UserCareerFunnel {
  userId: string;
  applications: number;
  assessments: number;
  interviews: number;
  offers: number;
  hires: number;
  applicationConversionRate: number;   // interviews / applications
  interviewConversionRate: number;     // offers / interviews
  hireRate: number;                    // hires / offers
  rejectedCount: number;
  withdrawnCount: number;
  sampleSize: number;
  denominatorNote: string;
}

@Injectable()
export class OutcomeAggregationService {
  private readonly logger = new Logger(OutcomeAggregationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Compute the platform-wide funnel for a given date range.
   * Excludes bots and test accounts.
   */
  async computePlatformFunnel(periodStart: Date, periodEnd: Date): Promise<CareerFunnel> {
    this.logger.log(`Computing platform funnel ${periodStart.toISOString()} – ${periodEnd.toISOString()}`);

    const [
      registeredCount,
      profileCompletedCount,
      opportunityViewedCount,
      savedCount,
      appliedUsers,
      assessmentUsers,
      interviewedUsers,
      offerSentUsers,
      hiredUsers,
    ] = await Promise.all([
      this.prisma.user.count({
        where: { isActive: true, createdAt: { lte: periodEnd } },
      }),
      this.prisma.profile.count({
        where: { onboardingCompletedAt: { not: null, lte: periodEnd } },
      }),
      this.prisma.jobInteraction.groupBy({
        by: ['userId'],
        where: {
          interactionType: 'VIEW',
          createdAt: { gte: periodStart, lte: periodEnd },
        },
        _count: true,
      }).then((r) => r.length),
      this.prisma.savedJob.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: periodStart, lte: periodEnd } },
        _count: true,
      }).then((r) => r.length),
      this.prisma.application.groupBy({
        by: ['userId'],
        where: {
          status: { in: [ApplicationStatus.APPLIED, ApplicationStatus.ASSESSMENT,
                         ApplicationStatus.INTERVIEW, ApplicationStatus.OFFER] },
          createdAt: { gte: periodStart, lte: periodEnd },
        },
        _count: true,
      }).then((r) => r.length),
      this.prisma.assessmentAssignment.groupBy({
        by: ['candidateId'],
        where: {
          status: { in: ['SUBMITTED', 'EVALUATED'] as any },
          createdAt: { gte: periodStart, lte: periodEnd },
        },
        _count: true,
      }).then((r) => r.length),
      this.prisma.hiringInterview.groupBy({
        by: ['candidateId'],
        where: {
          status: { in: [HiringInterviewStatus.COMPLETED, HiringInterviewStatus.IN_PROGRESS] },
          createdAt: { gte: periodStart, lte: periodEnd },
        },
        _count: true,
      }).then((r) => r.length),
      this.prisma.offer.groupBy({
        by: ['candidateId'],
        where: {
          status: { in: [OfferStatus.SENT, OfferStatus.VIEWED, OfferStatus.ACCEPTED] },
          createdAt: { gte: periodStart, lte: periodEnd },
        },
        _count: true,
      }).then((r) => r.length),
      this.prisma.offer.groupBy({
        by: ['candidateId'],
        where: {
          status: OfferStatus.ACCEPTED,
          acceptedAt: { gte: periodStart, lte: periodEnd },
        },
        _count: true,
      }).then((r) => r.length),
    ]);

    const raw = [
      registeredCount,
      profileCompletedCount,
      opportunityViewedCount,
      savedCount,
      appliedUsers,
      assessmentUsers,
      interviewedUsers,
      offerSentUsers,
      hiredUsers,
    ];

    const labels = [
      'Registered',
      'Profile Completed',
      'Opportunity Viewed',
      'Saved',
      'Applied',
      'Assessment',
      'Interview',
      'Offer',
      'Hired',
    ];

    const definitions = [
      'Active users created on or before period end.',
      'Users with onboarding completed at or before period end.',
      'Distinct users with ≥1 VIEW interaction in the period.',
      'Distinct users with ≥1 SavedJob record in the period.',
      'Distinct users with Application status in [APPLIED, ASSESSMENT, INTERVIEW, OFFER] created in period.',
      'Distinct users with AssessmentAssignment status in [SUBMITTED, EVALUATED] in period.',
      'Distinct users with HiringInterview status in [IN_PROGRESS, COMPLETED] in period.',
      'Distinct users with Offer status in [SENT, VIEWED, ACCEPTED] in period.',
      'Distinct users with Offer.status = ACCEPTED in period.',
    ];

    const stages: FunnelStage[] = raw.map((count, i) => {
      const prev: number | null = i > 0 ? (raw[i - 1] ?? null) : null;
      const conversion = prev !== null && prev > 0 ? count / prev : null;
      const dropOff = conversion !== null ? 1 - conversion : null;
      return {
        stage: labels[i] ?? '',
        count,
        conversionFromPrevious: conversion !== null ? Math.round(conversion * 10000) / 10000 : null,
        dropOffRate: dropOff !== null ? Math.round(dropOff * 10000) / 10000 : null,
        definition: definitions[i] ?? '',
      };
    });

    return {
      periodStart,
      periodEnd,
      stages,
      sampleSize: registeredCount,
      denominatorNote:
        'applicationConversionRate denominator = users who viewed ≥1 opportunity. ' +
        'interviewConversionRate denominator = users who applied. ' +
        'offerConversionRate denominator = users who were interviewed. ' +
        'hireRate denominator = users who received an offer.',
    };
  }

  /**
   * Compute funnel metrics for a single user.
   */
  async computeUserFunnel(userId: string): Promise<UserCareerFunnel> {
    const [appStats, offerStats] = await Promise.all([
      this.prisma.application.groupBy({
        by: ['status'],
        where: { userId },
        _count: true,
      }),
      this.prisma.offer.groupBy({
        by: ['status'],
        where: { candidateId: userId },
        _count: true,
      }),
    ]);

    const byStatus: Record<string, number> = {};
    for (const s of appStats) byStatus[s.status] = s._count;

    const byOffer: Record<string, number> = {};
    for (const s of offerStats) byOffer[s.status] = s._count;

    const applications = Object.values(byStatus).reduce((a, b) => a + b, 0);
    const assessments = byStatus[ApplicationStatus.ASSESSMENT] ?? 0;
    const interviews = byStatus[ApplicationStatus.INTERVIEW] ?? 0;
    const offers = (byOffer[OfferStatus.SENT] ?? 0) +
                   (byOffer[OfferStatus.VIEWED] ?? 0) +
                   (byOffer[OfferStatus.ACCEPTED] ?? 0);
    const hires = byOffer[OfferStatus.ACCEPTED] ?? 0;
    const rejected = byStatus[ApplicationStatus.REJECTED] ?? 0;
    const withdrawn = byStatus[ApplicationStatus.WITHDRAWN] ?? 0;

    return {
      userId,
      applications,
      assessments,
      interviews,
      offers,
      hires,
      applicationConversionRate: applications > 0 ? interviews / applications : 0,
      interviewConversionRate: interviews > 0 ? offers / interviews : 0,
      hireRate: offers > 0 ? hires / offers : 0,
      rejectedCount: rejected,
      withdrawnCount: withdrawn,
      sampleSize: applications,
      denominatorNote:
        'applicationConversionRate = interviews / all_applications. ' +
        'interviewConversionRate = offers / interviews. ' +
        'hireRate = accepted_offers / offers_sent.',
    };
  }

  /**
   * Compute funnel for a list of users (used by org/recruiter aggregations).
   * Returns aggregate counts only — no individual user data exposed.
   */
  async computeAggregatedFunnel(userIds: string[], periodStart: Date, periodEnd: Date) {
    if (userIds.length === 0) return null;

    const [applied, assessed, interviewed, offerSent, hired, rejected, withdrawn] =
      await Promise.all([
        this.prisma.application.count({
          where: {
            userId: { in: userIds },
            status: { in: [ApplicationStatus.APPLIED, ApplicationStatus.ASSESSMENT,
                           ApplicationStatus.INTERVIEW, ApplicationStatus.OFFER] },
            createdAt: { gte: periodStart, lte: periodEnd },
          },
        }),
        this.prisma.assessmentAssignment.count({
          where: {
            candidateId: { in: userIds },
            status: { in: ['SUBMITTED', 'EVALUATED'] as any },
            createdAt: { gte: periodStart, lte: periodEnd },
          },
        }),
        this.prisma.hiringInterview.count({
          where: {
            candidateId: { in: userIds },
            status: { in: [HiringInterviewStatus.COMPLETED, HiringInterviewStatus.IN_PROGRESS] },
            createdAt: { gte: periodStart, lte: periodEnd },
          },
        }),
        this.prisma.offer.count({
          where: {
            candidateId: { in: userIds },
            status: { in: [OfferStatus.SENT, OfferStatus.VIEWED, OfferStatus.ACCEPTED] },
            createdAt: { gte: periodStart, lte: periodEnd },
          },
        }),
        this.prisma.offer.count({
          where: {
            candidateId: { in: userIds },
            status: OfferStatus.ACCEPTED,
            acceptedAt: { gte: periodStart, lte: periodEnd },
          },
        }),
        this.prisma.application.count({
          where: {
            userId: { in: userIds },
            status: ApplicationStatus.REJECTED,
            createdAt: { gte: periodStart, lte: periodEnd },
          },
        }),
        this.prisma.application.count({
          where: {
            userId: { in: userIds },
            status: ApplicationStatus.WITHDRAWN,
            createdAt: { gte: periodStart, lte: periodEnd },
          },
        }),
      ]);

    return {
      appliedCount: applied,
      assessmentCount: assessed,
      interviewCount: interviewed,
      offerCount: offerSent,
      hiredCount: hired,
      rejectedCount: rejected,
      withdrawnCount: withdrawn,
      sampleSize: userIds.length,
      interviewConversionRate: applied > 0 ? interviewed / applied : 0,
      offerConversionRate: interviewed > 0 ? offerSent / interviewed : 0,
      hireRate: offerSent > 0 ? hired / offerSent : 0,
    };
  }
}
