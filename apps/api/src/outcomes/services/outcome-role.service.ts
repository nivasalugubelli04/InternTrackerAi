/**
 * OutcomeRoleService
 *
 * Analyzes outcome metrics by role category using JobPosting.department data.
 * Only creates a category entry when sufficient data supports it.
 *
 * IMPORTANT: Association language only. Reports what was observed in data.
 * No causal claims about roles and hiring outcomes.
 */
import { Injectable } from '@nestjs/common';
import { ApplicationStatus, OfferStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { OutcomePrivacyService } from './outcome-privacy.service';

export interface RoleOutcomeRow {
  role: string;
  applications: number;
  interviews: number;
  offers: number;
  hires: number;
  interviewConversionRate: number;
  offerConversionRate: number;
  hireRate: number;
  medianTimeToOfferHours: number | null;
  sampleSize: number;
  confidence: string;
}

@Injectable()
export class OutcomeRoleService {

  // Canonical role buckets — only populated when data exists
  private readonly ROLE_BUCKETS: Record<string, string[]> = {
    'Software Engineering': ['software engineer', 'swe', 'software developer', 'full stack'],
    Backend: ['backend', 'back-end', 'server side'],
    Frontend: ['frontend', 'front-end', 'ui developer', 'react', 'angular', 'vue'],
    'AI/ML': ['machine learning', 'ai', 'artificial intelligence', 'ml engineer', 'deep learning'],
    'Data Science': ['data scientist', 'data analyst', 'analytics'],
    DevOps: ['devops', 'devsecops', 'platform engineer', 'sre', 'site reliability'],
    Cloud: ['cloud', 'aws', 'azure', 'gcp', 'infrastructure'],
    Cybersecurity: ['security', 'cybersecurity', 'infosec', 'penetration'],
    Product: ['product manager', 'pm', 'product management'],
    Design: ['designer', 'ux', 'ui/ux', 'product designer'],
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly privacy: OutcomePrivacyService,
  ) {}

  private bucketRole(title: string): string {
    const lower = title.toLowerCase();
    for (const [bucket, keywords] of Object.entries(this.ROLE_BUCKETS)) {
      if (keywords.some((k) => lower.includes(k))) return bucket;
    }
    return 'Other';
  }

  async getByRole(periodStart: Date, periodEnd: Date): Promise<RoleOutcomeRow[]> {
    // Get applications with job title info
    const applications = await this.prisma.application.findMany({
      where: {
        appliedAt: { gte: periodStart, lte: periodEnd },
        jobTitleSnapshot: { not: null },
      },
      select: {
        id: true,
        userId: true,
        status: true,
        jobTitleSnapshot: true,
        appliedAt: true,
        job: {
          select: {
            department: true,
            offers: {
              select: { createdAt: true, status: true, acceptedAt: true },
            },
          },
        },
      },
    });

    // Group by role bucket
    const buckets: Record<string, {
      applications: number;
      interviews: number;
      offers: number;
      hires: number;
      timeToOffer: number[];
    }> = {};

    for (const app of applications) {
      const title = app.job?.department ?? app.jobTitleSnapshot ?? 'Unknown';
      const bucket = this.bucketRole(title);

      if (!buckets[bucket]) {
        buckets[bucket] = { applications: 0, interviews: 0, offers: 0, hires: 0, timeToOffer: [] };
      }

      buckets[bucket].applications++;

      if (app.status === ApplicationStatus.INTERVIEW ||
          app.status === ApplicationStatus.OFFER) {
        buckets[bucket].interviews++;
      }

      for (const offer of (app.job?.offers ?? [])) {
        if (([OfferStatus.SENT, OfferStatus.VIEWED, OfferStatus.ACCEPTED] as OfferStatus[]).includes(offer.status)) {
          buckets[bucket].offers++;
          if (app.appliedAt) {
            const hours = Math.abs(offer.createdAt.getTime() - app.appliedAt.getTime()) / 3600000;
            buckets[bucket].timeToOffer.push(hours);
          }
        }
        if (offer.status === OfferStatus.ACCEPTED) {
          buckets[bucket].hires++;
        }
      }
    }

    const rows: RoleOutcomeRow[] = [];

    for (const [role, data] of Object.entries(buckets)) {
      const guard = this.privacy.checkCohort(data.applications);
      if (!guard.allowed) continue; // Skip buckets below privacy threshold

      const sorted = [...data.timeToOffer].sort((a, b) => a - b);
      const medianIdx = Math.floor(sorted.length / 2);
      const medianTimeToOfferHours = sorted.length > 0 ? (sorted[medianIdx] ?? null) : null;

      rows.push({
        role,
        applications: data.applications,
        interviews: data.interviews,
        offers: data.offers,
        hires: data.hires,
        interviewConversionRate: data.applications > 0
          ? Math.round((data.interviews / data.applications) * 10000) / 10000 : 0,
        offerConversionRate: data.interviews > 0
          ? Math.round((data.offers / data.interviews) * 10000) / 10000 : 0,
        hireRate: data.offers > 0
          ? Math.round((data.hires / data.offers) * 10000) / 10000 : 0,
        medianTimeToOfferHours,
        sampleSize: data.applications,
        confidence: data.applications >= 100 ? 'HIGH' : data.applications >= 30 ? 'MEDIUM' : 'LOW',
      });
    }

    return rows.sort((a, b) => b.applications - a.applications);
  }
}
