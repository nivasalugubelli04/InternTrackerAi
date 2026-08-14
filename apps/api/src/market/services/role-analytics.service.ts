import { Injectable, Logger } from '@nestjs/common';
import { JobPostingStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

export interface RoleInsightItem {
  roleCategory: string;
  opportunityCount: number;
  marketSharePercentage: number;
  topSkills: { skill: string; count: number; percentage: number }[];
  averageMatchScore: number | null;
  totalApplications: number;
  growthRate: number | null;
  hasSufficientData: boolean;
}

export interface RoleAnalyticsResponse {
  roles: RoleInsightItem[];
  totalOpportunities: number;
  totalApplicationsTracked: number;
  calculatedAt: string;
}

@Injectable()
export class RoleAnalyticsService {
  private readonly logger = new Logger(RoleAnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns analytics across all standardized internship roles.
   */
  async getRoleAnalytics(): Promise<RoleAnalyticsResponse> {
    this.logger.debug('Calculating role analytics metrics');
    const now = new Date();
    const periodDays = 30;
    const currentPeriodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const previousPeriodStart = new Date(now.getTime() - periodDays * 2 * 24 * 60 * 60 * 1000);

    const [activeJobs, previousJobs, matchScores, applications] = await Promise.all([
      this.prisma.jobPosting.findMany({
        where: { status: JobPostingStatus.ACTIVE },
        select: {
          id: true,
          title: true,
          requirements: true,
        },
      }),
      this.prisma.jobPosting.findMany({
        where: {
          createdAt: { gte: previousPeriodStart, lt: currentPeriodStart },
        },
        select: {
          id: true,
          title: true,
        },
      }),
      this.prisma.matchScore.groupBy({
        by: ['jobId'],
        _avg: { overallScore: true },
      }),
      this.prisma.application.groupBy({
        by: ['jobId'],
        _count: { id: true },
      }),
    ]);

    const totalOpportunities = activeJobs.length;

    // Index average match scores and application counts by jobId
    const scoreMap = new Map<string, number>();
    for (const item of matchScores) {
      if (item._avg.overallScore !== null) {
        scoreMap.set(item.jobId, Math.round(item._avg.overallScore));
      }
    }

    const appMap = new Map<string, number>();
    let totalApplicationsTracked = 0;
    for (const item of applications) {
      appMap.set(item.jobId, item._count.id);
      totalApplicationsTracked += item._count.id;
    }

    // Role buckets
    interface RoleBucket {
      count: number;
      skills: Map<string, number>;
      scores: number[];
      appCount: number;
    }

    const roleBuckets = new Map<string, RoleBucket>();

    for (const job of activeJobs) {
      const category = this.classifyRole(job.title);
      let bucket = roleBuckets.get(category);
      if (!bucket) {
        bucket = { count: 0, skills: new Map(), scores: [], appCount: 0 };
        roleBuckets.set(category, bucket);
      }

      bucket.count++;

      const jobScore = scoreMap.get(job.id);
      if (jobScore !== undefined) {
        bucket.scores.push(jobScore);
      }

      const jobApps = appMap.get(job.id);
      if (jobApps !== undefined) {
        bucket.appCount += jobApps;
      }

      for (const req of job.requirements) {
        const clean = req.trim();
        if (clean.length > 1) {
          bucket.skills.set(clean, (bucket.skills.get(clean) ?? 0) + 1);
        }
      }
    }

    // Previous period counts for growth
    const prevCounts = new Map<string, number>();
    for (const job of previousJobs) {
      const category = this.classifyRole(job.title);
      prevCounts.set(category, (prevCounts.get(category) ?? 0) + 1);
    }

    const roles: RoleInsightItem[] = Array.from(roleBuckets.entries()).map(([category, bucket]) => {
      const prev = prevCounts.get(category) ?? 0;
      let growthRate: number | null = null;
      if (prev > 0 || bucket.count >= 3) {
        growthRate = prev === 0 ? 100 : Math.round(((bucket.count - prev) / prev) * 1000) / 10;
      }

      const avgScore =
        bucket.scores.length >= 3
          ? Math.round(bucket.scores.reduce((a, b) => a + b, 0) / bucket.scores.length)
          : null;

      const topSkills = Array.from(bucket.skills.entries())
        .map(([skill, count]) => ({
          skill,
          count,
          percentage: bucket.count > 0 ? Math.round((count / bucket.count) * 1000) / 10 : 0,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        roleCategory: category,
        opportunityCount: bucket.count,
        marketSharePercentage:
          totalOpportunities > 0 ? Math.round((bucket.count / totalOpportunities) * 1000) / 10 : 0,
        topSkills,
        averageMatchScore: avgScore,
        totalApplications: bucket.appCount,
        growthRate,
        hasSufficientData: bucket.count >= 3,
      };
    });

    roles.sort((a, b) => b.opportunityCount - a.opportunityCount);

    return {
      roles,
      totalOpportunities,
      totalApplicationsTracked,
      calculatedAt: now.toISOString(),
    };
  }

  /**
   * Retrieves role-specific deep dive for a single role category.
   */
  async getSingleRoleAnalytics(roleName: string): Promise<RoleInsightItem | null> {
    const all = await this.getRoleAnalytics();
    const match = all.roles.find(
      (r) =>
        r.roleCategory.toLowerCase() === roleName.toLowerCase() ||
        r.roleCategory.toLowerCase().includes(roleName.toLowerCase()),
    );
    return match ?? null;
  }

  classifyRole(title: string): string {
    const lower = title.toLowerCase();
    if (
      lower.includes('front') ||
      lower.includes('react') ||
      lower.includes('angular') ||
      lower.includes('vue')
    ) {
      return 'Frontend Development';
    }
    if (
      lower.includes('back') ||
      lower.includes('node') ||
      lower.includes('django') ||
      lower.includes('spring') ||
      lower.includes('golang')
    ) {
      return 'Backend Development';
    }
    if (
      lower.includes('full') ||
      lower.includes('mern') ||
      lower.includes('mean') ||
      lower.includes('web dev')
    ) {
      return 'Full Stack Development';
    }
    if (
      lower.includes('data sci') ||
      lower.includes('analytics') ||
      lower.includes('data anal') ||
      lower.includes('business anal')
    ) {
      return 'Data Science & Analytics';
    }
    if (
      lower.includes('machine learn') ||
      lower.includes(' ai') ||
      lower.includes('ml ') ||
      lower.includes('deep learn') ||
      lower.includes('computer vision') ||
      lower.includes('nlp')
    ) {
      return 'Machine Learning & AI';
    }
    if (
      lower.includes('devops') ||
      lower.includes('cloud') ||
      lower.includes('aws') ||
      lower.includes('sre') ||
      lower.includes('infrastructure')
    ) {
      return 'DevOps & Cloud';
    }
    if (
      lower.includes('mobile') ||
      lower.includes('android') ||
      lower.includes('ios') ||
      lower.includes('flutter') ||
      lower.includes('react native')
    ) {
      return 'Mobile App Development';
    }
    if (
      lower.includes('cyber') ||
      lower.includes('security') ||
      lower.includes('infosec') ||
      lower.includes('penetration')
    ) {
      return 'Cybersecurity';
    }
    if (
      lower.includes('product') ||
      lower.includes('pm intern') ||
      lower.includes('associate product')
    ) {
      return 'Product Management';
    }
    if (
      lower.includes('ui') ||
      lower.includes('ux') ||
      lower.includes('design') ||
      lower.includes('graphic')
    ) {
      return 'UI/UX Design';
    }
    if (
      lower.includes('qa') ||
      lower.includes('test') ||
      lower.includes('quality') ||
      lower.includes('automation engineer')
    ) {
      return 'Quality Assurance';
    }
    return 'Software Engineering';
  }
}
