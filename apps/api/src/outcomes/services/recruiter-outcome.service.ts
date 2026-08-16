/**
 * RecruiterOutcomeService
 *
 * Recruiter hiring analytics — pipeline conversion, time-to-hire, bottlenecks.
 *
 * Security:
 *  - ALL queries scoped to recruiterOrgId from authenticated recruiter
 *  - No cross-company benchmarks exposed without privacy aggregation
 *  - Candidate PII never exposed in aggregate metrics
 */
import { Injectable, ForbiddenException } from '@nestjs/common';
import { HiringInterviewStatus, OfferStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

export interface RecruiterOutcomeOverview {
  recruiterOrgId: string;
  applications: number;
  shortlistRate: number;
  assessmentCompletionRate: number;
  interviewConversionRate: number;
  offerConversionRate: number;
  notes?: string; // added to match properties if any
  hireConversionRate: number;
  medianTimeToHireHours: number | null;
  candidateResponseRate: number;
  noShowRate: number;
  offerDeclineRate: number;
  sampleSize: number;
  periodStart: Date;
  periodEnd: Date;
}

export interface BottleneckRow {
  stage: string;
  dropOffRate: number;
  medianDelayHours: number | null;
  sampleSize: number;
  periodStart: Date;
  periodEnd: Date;
}

@Injectable()
export class RecruiterOutcomeService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Verify recruiter belongs to org.
   */
  private async assertRecruiterInOrg(userId: string, recruiterOrgId: string): Promise<void> {
    const profile = await this.prisma.recruiterProfile.findFirst({
      where: { userId, recruiterOrgId },
    });
    if (!profile) {
      throw new ForbiddenException('Not authorized for this recruiter organization.');
    }
  }

  async getOverview(
    userId: string,
    recruiterOrgId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<RecruiterOutcomeOverview> {
    await this.assertRecruiterInOrg(userId, recruiterOrgId);

    const [
      applications,
      shortlists,
      assessments,
      interviews,
      noShowInterviews,
      offers,
    ] = await Promise.all([
      this.prisma.application.count({
        where: { job: { recruiterOrgId }, createdAt: { gte: periodStart, lte: periodEnd } },
      }),
      this.prisma.shortlistCandidate.count({
        where: { shortlist: { recruiterOrgId }, addedAt: { gte: periodStart, lte: periodEnd } },
      }).catch(() => 0),
      this.prisma.assessmentAssignment.findMany({
        where: { recruiterOrgId, createdAt: { gte: periodStart, lte: periodEnd } },
        select: { status: true },
      }),
      this.prisma.hiringInterview.findMany({
        where: { recruiterOrgId, createdAt: { gte: periodStart, lte: periodEnd } },
        select: { status: true, scheduledStart: true },
      }),
      this.prisma.hiringInterview.count({
        where: {
          recruiterOrgId,
          status: HiringInterviewStatus.NO_SHOW_CANDIDATE,
          createdAt: { gte: periodStart, lte: periodEnd },
        },
      }),
      this.prisma.offer.findMany({
        where: { recruiterOrgId, createdAt: { gte: periodStart, lte: periodEnd } },
        select: { status: true, createdAt: true, acceptedAt: true, declinedAt: true },
      }),
    ]);

    const completedAssessments = assessments.filter((a: any) =>
      ['SUBMITTED', 'EVALUATED'].includes(a.status),
    ).length;
    const totalInterviews = interviews.length;
    const completedInterviews = interviews.filter((i: any) =>
      i.status === HiringInterviewStatus.COMPLETED,
    ).length;
    const offersSent = offers.filter((o: any) =>
      ([OfferStatus.SENT, OfferStatus.VIEWED, OfferStatus.ACCEPTED, OfferStatus.DECLINED] as OfferStatus[]).includes(o.status),
    ).length;
    const offersAccepted = offers.filter((o: any) => o.status === OfferStatus.ACCEPTED).length;
    const offersDeclined = offers.filter((o: any) => o.status === OfferStatus.DECLINED).length;

    // Time to hire
    const timeToHire: number[] = offers
      .filter((o: any) => o.status === OfferStatus.ACCEPTED && o.acceptedAt)
      .map((o: any) => Math.abs(o.acceptedAt.getTime() - o.createdAt.getTime()) / 3600000);
    const sorted = [...timeToHire].sort((a, b) => a - b);
    const median: number | null = sorted.length > 0 ? (sorted[Math.floor(sorted.length / 2)] ?? null) : null;

    return {
      recruiterOrgId,
      applications,
      shortlistRate: applications > 0 ? (shortlists as number) / applications : 0,
      assessmentCompletionRate: assessments.length > 0 ? completedAssessments / assessments.length : 0,
      interviewConversionRate: applications > 0 ? totalInterviews / applications : 0,
      offerConversionRate: completedInterviews > 0 ? offersSent / completedInterviews : 0,
      hireConversionRate: offersSent > 0 ? offersAccepted / offersSent : 0,
      medianTimeToHireHours: median,
      candidateResponseRate: applications > 0 ? totalInterviews / applications : 0,
      noShowRate: totalInterviews > 0 ? noShowInterviews / totalInterviews : 0,
      offerDeclineRate: offersSent > 0 ? offersDeclined / offersSent : 0,
      sampleSize: applications,
      periodStart,
      periodEnd,
    };
  }

  async getFunnel(
    userId: string,
    recruiterOrgId: string,
    periodStart: Date,
    periodEnd: Date,
  ) {
    await this.assertRecruiterInOrg(userId, recruiterOrgId);
    const overview = await this.getOverview(userId, recruiterOrgId, periodStart, periodEnd);

    return {
      stages: [
        { stage: 'Applications', count: overview.applications, conversionFromPrevious: null },
        { stage: 'Shortlisted', count: Math.round(overview.applications * overview.shortlistRate), conversionFromPrevious: overview.shortlistRate },
        { stage: 'Interviewed', count: Math.round(overview.applications * overview.interviewConversionRate), conversionFromPrevious: overview.interviewConversionRate },
        { stage: 'Offer Sent', count: Math.round(overview.applications * overview.offerConversionRate), conversionFromPrevious: overview.offerConversionRate },
        { stage: 'Hired', count: Math.round(overview.applications * overview.hireConversionRate), conversionFromPrevious: overview.hireConversionRate },
      ],
      sampleSize: overview.sampleSize,
      periodStart,
      periodEnd,
    };
  }

  async getBottlenecks(
    userId: string,
    recruiterOrgId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<BottleneckRow[]> {
    await this.assertRecruiterInOrg(userId, recruiterOrgId);
    const overview = await this.getOverview(userId, recruiterOrgId, periodStart, periodEnd);

    const bottlenecks: BottleneckRow[] = [];

    if (overview.assessmentCompletionRate < 0.5) {
      bottlenecks.push({
        stage: 'Assessment',
        dropOffRate: 1 - overview.assessmentCompletionRate,
        medianDelayHours: null,
        sampleSize: overview.applications,
        periodStart,
        periodEnd,
      });
    }

    if (overview.noShowRate > 0.1) {
      bottlenecks.push({
        stage: 'Interview No-Show',
        dropOffRate: overview.noShowRate,
        medianDelayHours: null,
        sampleSize: overview.applications,
        periodStart,
        periodEnd,
      });
    }

    if (overview.offerDeclineRate > 0.3) {
      bottlenecks.push({
        stage: 'Offer Decline',
        dropOffRate: overview.offerDeclineRate,
        medianDelayHours: null,
        sampleSize: overview.applications,
        periodStart,
        periodEnd,
      });
    }

    return bottlenecks;
  }

  async getTimeToHire(
    userId: string,
    recruiterOrgId: string,
    periodStart: Date,
    periodEnd: Date,
  ) {
    await this.assertRecruiterInOrg(userId, recruiterOrgId);
    const overview = await this.getOverview(userId, recruiterOrgId, periodStart, periodEnd);
    return {
      medianTimeToHireHours: overview.medianTimeToHireHours,
      sampleSize: overview.sampleSize,
      note: 'Time from offer sent to offer accepted. Median used as primary statistic.',
    };
  }
}
