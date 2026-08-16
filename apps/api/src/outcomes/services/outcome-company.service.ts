/**
 * OutcomeCompanyService
 *
 * Company-level outcome analytics for recruiter organizations.
 *
 * Security: Only exposes data for the requesting recruiter's organization.
 * Cross-company benchmarks are NOT exposed without explicit aggregation.
 */
import { Injectable } from '@nestjs/common';
import { OfferStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { OutcomePrivacyService } from './outcome-privacy.service';

export interface CompanyOutcomeRow {
  companyId: string;
  companyName: string;
  applications: number;
  shortlisted: number;
  assessments: number;
  interviews: number;
  offers: number;
  hires: number;
  shortlistRate: number;
  interviewConversionRate: number;
  offerConversionRate: number;
  hireRate: number;
  medianTimeToHireHours: number | null;
  candidateDropOff: number;
  sampleSize: number;
}

@Injectable()
export class OutcomeCompanyService {

  constructor(
    private readonly prisma: PrismaService,
    private readonly privacy: OutcomePrivacyService,
  ) {}

  /**
   * Get outcome analytics for a specific recruiter organization.
   * IDOR-protected: only returns data for recruiterOrgId.
   */
  async getForRecruiterOrg(
    recruiterOrgId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<CompanyOutcomeRow | null> {
    const org = await this.prisma.recruiterOrganization.findUnique({
      where: { id: recruiterOrgId },
      include: { organization: true },
    });
    if (!org) return null;

    const [applications, shortlists, assessments, interviews, offers] = await Promise.all([
      this.prisma.application.count({
        where: {
          job: { recruiterOrgId },
          createdAt: { gte: periodStart, lte: periodEnd },
        },
      }),
      this.prisma.shortlistCandidate.count({
        where: {
          shortlist: { recruiterOrgId },
          addedAt: { gte: periodStart, lte: periodEnd },
        },
      }).catch(() => 0), // graceful if table access differs
      this.prisma.assessmentAssignment.count({
        where: {
          recruiterOrgId,
          createdAt: { gte: periodStart, lte: periodEnd },
        },
      }),
      this.prisma.hiringInterview.count({
        where: {
          recruiterOrgId,
          createdAt: { gte: periodStart, lte: periodEnd },
        },
      }),
      this.prisma.offer.findMany({
        where: {
          recruiterOrgId,
          createdAt: { gte: periodStart, lte: periodEnd },
        },
        select: { status: true, createdAt: true, acceptedAt: true },
      }),
    ]);

    const offerCount = offers.filter((o) =>
      ([OfferStatus.SENT, OfferStatus.VIEWED, OfferStatus.ACCEPTED] as OfferStatus[]).includes(o.status),
    ).length;
    const hireCount = offers.filter((o) => o.status === OfferStatus.ACCEPTED).length;

    const offerTimes: number[] = [];
    for (const o of offers) {
      if (o.status === OfferStatus.ACCEPTED && o.acceptedAt) {
        offerTimes.push(Math.abs(o.acceptedAt.getTime() - o.createdAt.getTime()) / 3600000);
      }
    }
    const sortedTimes = offerTimes.sort((a, b) => a - b);
    const median: number | null = sortedTimes.length > 0 ? (sortedTimes[Math.floor(sortedTimes.length / 2)] ?? null) : null;

    const dropOff = applications > 0
      ? Math.round(((applications - hireCount) / applications) * 10000) / 10000
      : 0;

    return {
      companyId: org.organizationId,
      companyName: org.organization.name,
      applications,
      shortlisted: shortlists as number,
      assessments,
      interviews,
      offers: offerCount,
      hires: hireCount,
      shortlistRate: applications > 0 ? (shortlists as number) / applications : 0,
      interviewConversionRate: applications > 0 ? interviews / applications : 0,
      offerConversionRate: interviews > 0 ? offerCount / interviews : 0,
      hireRate: offerCount > 0 ? hireCount / offerCount : 0,
      medianTimeToHireHours: median,
      candidateDropOff: dropOff,
      sampleSize: applications,
    };
  }

  /**
   * Admin-only: aggregated company outcomes across all orgs (privacy-safe).
   */
  async getAdminCompanyList(periodStart: Date, periodEnd: Date) {
    const orgs = await this.prisma.recruiterOrganization.findMany({
      include: { organization: true },
      take: 100,
    });

    const rows: CompanyOutcomeRow[] = [];

    for (const org of orgs) {
      const row = await this.getForRecruiterOrg(org.id, periodStart, periodEnd);
      if (!row) continue;
      const guard = this.privacy.checkCohort(row.sampleSize);
      if (!guard.allowed) continue;
      rows.push(row);
    }

    return rows.sort((a, b) => b.applications - a.applications);
  }
}
