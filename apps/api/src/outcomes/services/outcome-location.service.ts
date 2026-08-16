/**
 * OutcomeLocationService
 *
 * Analyzes outcome metrics by location (city, state, remote, hybrid, on-site).
 * Uses actual opportunity and outcome data — not manually seeded.
 */
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { OutcomePrivacyService } from './outcome-privacy.service';

export interface LocationOutcomeRow {
  location: string;
  locationType: 'CITY' | 'STATE' | 'REMOTE' | 'HYBRID' | 'ONSITE' | 'UNKNOWN';
  applications: number;
  interviews: number;
  offers: number;
  hires: number;
  interviewConversionRate: number;
  offerConversionRate: number;
  sampleSize: number;
  confidence: string;
}

@Injectable()
export class OutcomeLocationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly privacy: OutcomePrivacyService,
  ) {}

  async getByLocation(periodStart: Date, periodEnd: Date): Promise<LocationOutcomeRow[]> {
    const applications = await this.prisma.application.findMany({
      where: {
        appliedAt: { gte: periodStart, lte: periodEnd },
        locationSnapshot: { not: null },
      },
      select: {
        status: true,
        locationSnapshot: true,
        job: { select: { workMode: true, location: true } },
      },
      take: 10000,
    });

    // Aggregate by location + workMode
    const buckets: Record<string, {
      locationType: LocationOutcomeRow['locationType'];
      applications: number;
      interviews: number;
      offers: number;
      hires: number;
    }> = {};

    for (const app of applications) {
      const loc = app.locationSnapshot ?? 'Unknown';
      const mode = app.job?.workMode;

      let key = loc;
      let locationType: LocationOutcomeRow['locationType'] = 'CITY';

      if (mode === 'REMOTE') { key = 'Remote'; locationType = 'REMOTE'; }
      else if (mode === 'HYBRID') { key = 'Hybrid'; locationType = 'HYBRID'; }
      else if (mode === 'ONSITE') { key = loc; locationType = 'ONSITE'; }

      if (!buckets[key]) {
        buckets[key] = { locationType, applications: 0, interviews: 0, offers: 0, hires: 0 };
      }
      const b = buckets[key];
      if (b) {
        b.applications++;
        if (app.status === 'INTERVIEW' || app.status === 'OFFER') b.interviews++;
        if (app.status === 'OFFER') b.offers++;
      }
    }

    const rows: LocationOutcomeRow[] = [];

    for (const [location, data] of Object.entries(buckets)) {
      const guard = this.privacy.checkCohort(data.applications);
      if (!guard.allowed) continue;

      rows.push({
        location,
        locationType: data.locationType,
        applications: data.applications,
        interviews: data.interviews,
        offers: data.offers,
        hires: data.hires,
        interviewConversionRate: data.applications > 0
          ? Math.round((data.interviews / data.applications) * 10000) / 10000
          : 0,
        offerConversionRate: data.interviews > 0
          ? Math.round((data.offers / data.interviews) * 10000) / 10000
          : 0,
        sampleSize: data.applications,
        confidence: data.applications >= 100 ? 'HIGH' : data.applications >= 30 ? 'MEDIUM' : 'LOW',
      });
    }

    return rows.sort((a, b) => b.applications - a.applications);
  }
}
