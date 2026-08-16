/**
 * AdminOutcomeService
 *
 * Platform-wide outcome analytics for authenticated ADMIN/SUPER_ADMIN users.
 * All results are aggregate — never expose individual user PII.
 */
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { OutcomeAggregationService } from './outcome-aggregation.service';
import { OutcomeTimeToStageService } from './outcome-time-to-stage.service';
import { OutcomeDataQualityService } from './outcome-data-quality.service';
import { OutcomeSnapshotService } from './outcome-snapshot.service';
import { OutcomeEntityType, OutcomeSnapshotPeriod } from '@prisma/client';

@Injectable()
export class AdminOutcomeService {

  constructor(
    private readonly prisma: PrismaService,
    private readonly aggregation: OutcomeAggregationService,
    private readonly timeToStage: OutcomeTimeToStageService,
    private readonly dqService: OutcomeDataQualityService,
    private readonly snapshot: OutcomeSnapshotService,
  ) {}

  async getOverview(periodStart: Date, periodEnd: Date) {
    const [funnel, users, orgs, applications] = await Promise.all([
      this.aggregation.computePlatformFunnel(periodStart, periodEnd),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.organization.count({ where: { status: 'ACTIVE' } }),
      this.prisma.application.count({
        where: { createdAt: { gte: periodStart, lte: periodEnd } },
      }),
    ]);

    const latestDq = await this.dqService.getLatestLog();

    return {
      platformFunnel: funnel,
      totalActiveUsers: users,
      totalOrganizations: orgs,
      totalApplicationsInPeriod: applications,
      dataQuality: latestDq
        ? { qualityScore: latestDq.qualityScore, runAt: latestDq.runAt }
        : null,
      periodStart,
      periodEnd,
    };
  }

  async getPlatformFunnel(periodStart: Date, periodEnd: Date) {
    return this.aggregation.computePlatformFunnel(periodStart, periodEnd);
  }

  async getTimeToStage(periodStart: Date, periodEnd: Date) {
    return this.timeToStage.calculatePlatformWide(periodStart, periodEnd);
  }

  async getDataQuality(periodStart: Date, periodEnd: Date) {
    return this.dqService.runValidation(periodStart, periodEnd);
  }

  async getDataQualityHistory(days = 30) {
    return this.dqService.getQualityHistory(days);
  }

  async getOrganizationOutcomes(periodStart: Date, periodEnd: Date) {
    const orgs = await this.prisma.organization.findMany({
      where: { status: 'ACTIVE' },
      include: {
        members: {
          where: { consentGiven: true, status: 'ACTIVE' },
          select: { userId: true },
        },
      },
      take: 100,
    });

    const results = [];
    for (const org of orgs) {
      const memberIds = org.members.map((m) => m.userId);
      if (memberIds.length < 10) {
        results.push({
          organizationId: org.id,
          organizationName: org.name,
          status: 'INSUFFICIENT_COHORT',
        });
        continue;
      }
      const funnel = await this.aggregation.computeAggregatedFunnel(
        memberIds, periodStart, periodEnd,
      );
      results.push({
        organizationId: org.id,
        organizationName: org.name,
        studentCount: memberIds.length,
        ...funnel,
      });
    }

    return results;
  }

  async getSnapshotHistory(
    periodType: OutcomeSnapshotPeriod = OutcomeSnapshotPeriod.MONTHLY,
  ) {
    return this.snapshot.getHistory(
      OutcomeEntityType.PLATFORM,
      null,
      null,
      periodType,
      12,
    );
  }
}
