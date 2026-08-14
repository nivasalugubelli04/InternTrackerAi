import { Injectable, Logger } from '@nestjs/common';
import { JobPostingStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

export interface StipendDistribution {
  min: number;
  max: number;
  median: number;
  average: number;
  currency: string;
  hasSufficientData: boolean;
  sampleCount: number;
}

export interface MarketOverviewDto {
  totalActiveInternships: number;
  newInternshipsThisWeek: number;
  newInternshipsThisMonth: number;
  activelyHiringCompaniesCount: number;
  topRoles: { role: string; count: number; percentage: number }[];
  topSkills: { skill: string; count: number; percentage: number }[];
  topLocations: { location: string; count: number; percentage: number }[];
  topIndustries: { industry: string; count: number; percentage: number }[];
  averageDurationMonths: number | null;
  stipendDistribution: StipendDistribution;
  dataFreshness: {
    lastCalculatedAt: string;
    sampleSize: number;
    hasSufficientData: boolean;
  };
}

@Injectable()
export class MarketAggregationService {
  private readonly logger = new Logger(MarketAggregationService.name);
  private readonly CACHE_KEY = 'market:overview:aggregate';
  private readonly CACHE_TTL_SECONDS = 3600; // 1 hour

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Retrieves aggregate market overview metrics. Returns cached result if fresh.
   */
  async getMarketOverview(forceRefresh = false): Promise<MarketOverviewDto> {
    if (!forceRefresh) {
      try {
        const client = this.redis.getClient();
        if (client) {
          const cached = await client.get(this.CACHE_KEY);
          if (cached) {
            return JSON.parse(cached) as MarketOverviewDto;
          }
        }
      } catch (err) {
        this.logger.warn(`Redis get error in getMarketOverview: ${(err as Error).message}`);
      }
    }

    const overview = await this.computeMarketOverview();

    try {
      const client = this.redis.getClient();
      if (client) {
        await client.set(this.CACHE_KEY, JSON.stringify(overview), 'EX', this.CACHE_TTL_SECONDS);
      }
    } catch (err) {
      this.logger.warn(`Redis set error in getMarketOverview: ${(err as Error).message}`);
    }

    return overview;
  }

  /**
   * Directly computes the market overview from the database.
   */
  async computeMarketOverview(): Promise<MarketOverviewDto> {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [activePostings, newThisWeekCount, newThisMonthCount, hiringCompanies] =
      await Promise.all([
        this.prisma.jobPosting.findMany({
          where: { status: JobPostingStatus.ACTIVE },
          select: {
            id: true,
            title: true,
            location: true,
            workMode: true,
            stipend: true,
            duration: true,
            requirements: true,
            company: {
              select: { id: true, name: true, industry: true },
            },
          },
        }),
        this.prisma.jobPosting.count({
          where: {
            status: JobPostingStatus.ACTIVE,
            createdAt: { gte: oneWeekAgo },
          },
        }),
        this.prisma.jobPosting.count({
          where: {
            status: JobPostingStatus.ACTIVE,
            createdAt: { gte: oneMonthAgo },
          },
        }),
        this.prisma.company.count({
          where: {
            jobPostings: {
              some: { status: JobPostingStatus.ACTIVE },
            },
          },
        }),
      ]);

    const totalActive = activePostings.length;
    const hasSufficientData = totalActive >= 5;

    // Role, Skill, Location, Industry frequency maps
    const roleCounts = new Map<string, number>();
    const skillCounts = new Map<string, number>();
    const locationCounts = new Map<string, number>();
    const industryCounts = new Map<string, number>();
    const stipends: number[] = [];
    const durations: number[] = [];

    for (const job of activePostings) {
      // Role parsing
      const roleName = this.normalizeRole(job.title);
      roleCounts.set(roleName, (roleCounts.get(roleName) ?? 0) + 1);

      // Skills
      for (const req of job.requirements) {
        const cleanReq = req.trim();
        if (cleanReq.length > 1) {
          skillCounts.set(cleanReq, (skillCounts.get(cleanReq) ?? 0) + 1);
        }
      }

      // Locations
      const loc = job.location ? (job.location.split(',')[0]?.trim() ?? 'Other') : 'Remote';
      locationCounts.set(loc, (locationCounts.get(loc) ?? 0) + 1);

      // Industry
      if (job.company?.industry) {
        const ind = job.company.industry.trim();
        industryCounts.set(ind, (industryCounts.get(ind) ?? 0) + 1);
      }

      // Stipend
      if (job.stipend && job.stipend > 0) {
        stipends.push(job.stipend);
      }

      // Duration (e.g. "3 months", "6 Months", "3")
      if (job.duration) {
        const match = job.duration.match(/(\d+)/);
        if (match?.[1]) {
          const val = parseInt(match[1], 10);
          if (!isNaN(val) && val > 0 && val <= 24) {
            durations.push(val);
          }
        }
      }
    }

    const topRoles = this.getTopItems(roleCounts, totalActive, 10);
    const topSkills = this.getTopItems(skillCounts, totalActive, 15);
    const topLocations = this.getTopItems(locationCounts, totalActive, 10);
    const topIndustries = this.getTopItems(industryCounts, totalActive, 8);

    const stipendDistribution = this.computeStipendStats(stipends);
    const averageDurationMonths =
      durations.length >= 3
        ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10
        : null;

    return {
      totalActiveInternships: totalActive,
      newInternshipsThisWeek: newThisWeekCount,
      newInternshipsThisMonth: newThisMonthCount,
      activelyHiringCompaniesCount: hiringCompanies,
      topRoles: topRoles.map((item) => ({
        role: item.name,
        count: item.count,
        percentage: item.percentage,
      })),
      topSkills: topSkills.map((item) => ({
        skill: item.name,
        count: item.count,
        percentage: item.percentage,
      })),
      topLocations: topLocations.map((item) => ({
        location: item.name,
        count: item.count,
        percentage: item.percentage,
      })),
      topIndustries: topIndustries.map((item) => ({
        industry: item.name,
        count: item.count,
        percentage: item.percentage,
      })),
      averageDurationMonths,
      stipendDistribution,
      dataFreshness: {
        lastCalculatedAt: now.toISOString(),
        sampleSize: totalActive,
        hasSufficientData,
      },
    };
  }

  private normalizeRole(title: string): string {
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
      lower.includes('spring')
    ) {
      return 'Backend Development';
    }
    if (lower.includes('full') || lower.includes('mern') || lower.includes('mean')) {
      return 'Full Stack Development';
    }
    if (lower.includes('data sci') || lower.includes('analytics') || lower.includes('data anal')) {
      return 'Data Science & Analytics';
    }
    if (
      lower.includes('machine learn') ||
      lower.includes(' ai') ||
      lower.includes('ml ') ||
      lower.includes('deep learn')
    ) {
      return 'Machine Learning & AI';
    }
    if (
      lower.includes('devops') ||
      lower.includes('cloud') ||
      lower.includes('aws') ||
      lower.includes('sre')
    ) {
      return 'DevOps & Cloud';
    }
    if (
      lower.includes('mobile') ||
      lower.includes('android') ||
      lower.includes('ios') ||
      lower.includes('flutter')
    ) {
      return 'Mobile App Development';
    }
    if (lower.includes('cyber') || lower.includes('security') || lower.includes('infosec')) {
      return 'Cybersecurity';
    }
    if (lower.includes('product') || lower.includes('pm intern')) {
      return 'Product Management';
    }
    if (lower.includes('ui') || lower.includes('ux') || lower.includes('design')) {
      return 'UI/UX Design';
    }
    if (lower.includes('qa') || lower.includes('test') || lower.includes('quality')) {
      return 'Quality Assurance';
    }
    return 'Software Engineering';
  }

  private getTopItems(
    countsMap: Map<string, number>,
    total: number,
    limit: number,
  ): { name: string; count: number; percentage: number }[] {
    if (total === 0) return [];
    return Array.from(countsMap.entries())
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / total) * 1000) / 10,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  private computeStipendStats(stipends: number[]): StipendDistribution {
    if (stipends.length < 5) {
      return {
        min: stipends.length > 0 ? Math.min(...stipends) : 0,
        max: stipends.length > 0 ? Math.max(...stipends) : 0,
        median: 0,
        average:
          stipends.length > 0
            ? Math.round(stipends.reduce((a, b) => a + b, 0) / stipends.length)
            : 0,
        currency: 'INR',
        hasSufficientData: false,
        sampleCount: stipends.length,
      };
    }

    const sorted = [...stipends].sort((a, b) => a - b);
    const min = sorted[0] ?? 0;
    const max = sorted[sorted.length - 1] ?? 0;
    const avg = Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length);

    const mid = Math.floor(sorted.length / 2);
    const median =
      sorted.length % 2 === 0
        ? Math.round(((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2)
        : (sorted[mid] ?? 0);

    return {
      min,
      max,
      median,
      average: avg,
      currency: 'INR',
      hasSufficientData: true,
      sampleCount: sorted.length,
    };
  }
}
