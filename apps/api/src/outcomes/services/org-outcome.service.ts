/**
 * OrgOutcomeService
 *
 * B2B / College Placement analytics for authorized organizations (Phase 17).
 *
 * Security:
 *  - Tenant isolation: always scoped to organizationId
 *  - Individual-level data exposed only per org permission settings
 *  - Department cohorts below minCohortSize are suppressed
 *  - CGPA ranges only exposed when cohort threshold is met
 */
import { Injectable, ForbiddenException } from '@nestjs/common';
import { OrganizationRole } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { OutcomePrivacyService, INSUFFICIENT_COHORT_RESPONSE } from './outcome-privacy.service';
import { OutcomeAggregationService } from './outcome-aggregation.service';

export interface OrgOutcomeOverview {
  organizationId: string;
  organizationName: string;
  totalStudents: number;
  profileCompletedCount: number;
  applicationsCount: number;
  interviewCount: number;
  offerCount: number;
  hiredCount: number;
  placementConversionRate: number;
  avgProfileCompletion: number;
  periodStart: Date;
  periodEnd: Date;
  sampleSize: number;
}

export interface DepartmentOutcomeRow {
  department: string;
  graduationYear?: number;
  studentCount: number;
  profileCompletionRate: number;
  applications: number;
  interviews: number;
  offers: number;
  hires: number;
  placementRate: number;
  sampleSize: number;
  belowCohortThreshold: boolean;
}

@Injectable()
export class OrgOutcomeService {
  private readonly AUTHORIZED_ROLES: OrganizationRole[] = [
    OrganizationRole.OWNER,
    OrganizationRole.ADMIN,
    OrganizationRole.PLACEMENT_OFFICER,
    OrganizationRole.ANALYST,
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly privacy: OutcomePrivacyService,
    private readonly aggregation: OutcomeAggregationService,
  ) {}

  /**
   * Verify requesting user has permission to view org outcomes.
   */
  private async assertAuthorized(requestingUserId: string, organizationId: string): Promise<void> {
    const membership = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId: requestingUserId } },
    });
    if (!membership || !this.AUTHORIZED_ROLES.includes(membership.role as OrganizationRole)) {
      throw new ForbiddenException('Not authorized to view organization outcomes.');
    }
  }

  /**
   * Get member user IDs with consent for analytics.
   */
  private async getMemberIds(organizationId: string): Promise<string[]> {
    const members = await this.prisma.organizationMember.findMany({
      where: { organizationId, consentGiven: true, status: 'ACTIVE' },
      select: { userId: true },
    });
    return members.map((m) => m.userId);
  }

  /**
   * Aggregate overview for an organization.
   */
  async getOrgOverview(
    requestingUserId: string,
    organizationId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<OrgOutcomeOverview> {
    await this.assertAuthorized(requestingUserId, organizationId);

    const memberIds = await this.getMemberIds(organizationId);
    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
    });

    const funnel = await this.aggregation.computeAggregatedFunnel(
      memberIds, periodStart, periodEnd,
    );

    const profileCount = await this.prisma.profile.count({
      where: {
        userId: { in: memberIds },
        onboardingCompletedAt: { not: null },
      },
    });

    return {
      organizationId,
      organizationName: org.name,
      totalStudents: memberIds.length,
      profileCompletedCount: profileCount,
      applicationsCount: funnel?.appliedCount ?? 0,
      interviewCount: funnel?.interviewCount ?? 0,
      offerCount: funnel?.offerCount ?? 0,
      hiredCount: funnel?.hiredCount ?? 0,
      placementConversionRate: funnel?.hireRate ?? 0,
      avgProfileCompletion: memberIds.length > 0
        ? Math.round((profileCount / memberIds.length) * 100) / 100
        : 0,
      periodStart,
      periodEnd,
      sampleSize: memberIds.length,
    };
  }

  /**
   * Funnel breakdown for organization.
   */
  async getOrgFunnel(
    requestingUserId: string,
    organizationId: string,
    periodStart: Date,
    periodEnd: Date,
  ) {
    await this.assertAuthorized(requestingUserId, organizationId);
    const memberIds = await this.getMemberIds(organizationId);
    return this.aggregation.computeAggregatedFunnel(memberIds, periodStart, periodEnd);
  }

  /**
   * Department-level analytics with privacy protection.
   */
  async getByDepartment(
    requestingUserId: string,
    organizationId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<DepartmentOutcomeRow[]> {
    await this.assertAuthorized(requestingUserId, organizationId);

    const members = await this.prisma.organizationMember.findMany({
      where: { organizationId, consentGiven: true, status: 'ACTIVE' },
      include: {
        user: {
          include: {
            profile: { select: { branch: true, graduationYear: true, onboardingCompletedAt: true } },
          },
        },
      },
    });

    // Group by branch/department
    const deptMap: Record<string, {
      userIds: string[];
      profileCompleted: number;
    }> = {};

    for (const m of members) {
      const dept = m.user.profile?.branch ?? 'Unknown';
      if (!deptMap[dept]) deptMap[dept] = { userIds: [], profileCompleted: 0 };
      deptMap[dept].userIds.push(m.userId);
      if (m.user.profile?.onboardingCompletedAt) deptMap[dept].profileCompleted++;
    }

    const rows: DepartmentOutcomeRow[] = [];

    for (const [dept, data] of Object.entries(deptMap)) {
      const guard = this.privacy.checkCohort(data.userIds.length);

      if (!guard.allowed) {
        rows.push({
          department: dept,
          studentCount: data.userIds.length,
          profileCompletionRate: 0,
          applications: 0,
          interviews: 0,
          offers: 0,
          hires: 0,
          placementRate: 0,
          sampleSize: data.userIds.length,
          belowCohortThreshold: true,
        });
        continue;
      }

      const funnel = await this.aggregation.computeAggregatedFunnel(
        data.userIds, periodStart, periodEnd,
      );

      rows.push({
        department: dept,
        studentCount: data.userIds.length,
        profileCompletionRate: Math.round(
          (data.profileCompleted / data.userIds.length) * 100,
        ) / 100,
        applications: funnel?.appliedCount ?? 0,
        interviews: funnel?.interviewCount ?? 0,
        offers: funnel?.offerCount ?? 0,
        hires: funnel?.hiredCount ?? 0,
        placementRate: funnel?.hireRate ?? 0,
        sampleSize: data.userIds.length,
        belowCohortThreshold: false,
      });
    }

    return rows.sort((a, b) => b.studentCount - a.studentCount);
  }

  /**
   * Skill gap analysis for organization members.
   */
  async getSkillGaps(
    requestingUserId: string,
    organizationId: string,
  ) {
    await this.assertAuthorized(requestingUserId, organizationId);
    const memberIds = await this.getMemberIds(organizationId);

    const guard = this.privacy.checkCohort(memberIds.length);
    if (!guard.allowed) return INSUFFICIENT_COHORT_RESPONSE;

    // Frequency of each skill among members
    const skillFreq = await this.prisma.userSkill.groupBy({
      by: ['skillId'],
      where: { userId: { in: memberIds } },
      _count: true,
    });

    const allSkills = await this.prisma.skill.findMany({ where: { isActive: true } });
    const memberSkillIds = new Set(skillFreq.map((s) => s.skillId));

    const gaps = allSkills
      .filter((s) => !memberSkillIds.has(s.id))
      .map((s) => ({ skillName: s.name, category: s.category }));

    const coverage = skillFreq.map((s) => ({
      skillId: s.skillId,
      usersWithSkill: s._count,
      coverageRate: Math.round((s._count / memberIds.length) * 100) / 100,
    }));

    return { gaps, coverage, sampleSize: memberIds.length };
  }

  /**
   * Timeline/trend data for org placement metrics.
   */
  async getTimeline(
    requestingUserId: string,
    organizationId: string,
    months = 6,
  ) {
    await this.assertAuthorized(requestingUserId, organizationId);
    const memberIds = await this.getMemberIds(organizationId);

    const guard = this.privacy.checkCohort(memberIds.length);
    if (!guard.allowed) return INSUFFICIENT_COHORT_RESPONSE;

    const timeline = [];
    for (let i = months - 1; i >= 0; i--) {
      const end = new Date();
      end.setMonth(end.getMonth() - i);
      end.setDate(0); // last day of month
      const start = new Date(end);
      start.setDate(1);

      const funnel = await this.aggregation.computeAggregatedFunnel(memberIds, start, end);
      timeline.push({
        month: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
        ...funnel,
      });
    }

    return timeline;
  }
}
