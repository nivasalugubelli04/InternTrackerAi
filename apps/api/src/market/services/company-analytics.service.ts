import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { JobPostingStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

export interface CompanyHiringOverview {
  companyId: string;
  companyName: string;
  industry: string | null;
  activeOpeningsCount: number;
  newOpeningsThisMonth: number;
  postingFrequencyPerMonth: number;
  trackedByUsersCount: number;
  savedJobsCount: number;
  totalApplicationsReceived: number;
  topRoles: { role: string; count: number }[];
  topLocations: { location: string; count: number }[];
  topSkills: { skill: string; count: number }[];
  hasSufficientData: boolean;
}

export interface MarketCompaniesResponse {
  companies: CompanyHiringOverview[];
  totalActivelyHiringCompanies: number;
  calculatedAt: string;
}

@Injectable()
export class CompanyAnalyticsService {
  private readonly logger = new Logger(CompanyAnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns hiring activity across all active companies.
   */
  async getTopHiringCompanies(limit = 20): Promise<MarketCompaniesResponse> {
    this.logger.debug('Calculating top hiring companies metrics');
    const now = new Date();
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const companies = await this.prisma.company.findMany({
      where: {
        jobPostings: {
          some: { status: JobPostingStatus.ACTIVE },
        },
      },
      include: {
        jobPostings: {
          select: {
            id: true,
            title: true,
            location: true,
            requirements: true,
            status: true,
            createdAt: true,
            savedJobs: { select: { id: true } },
            applications: { select: { id: true } },
          },
        },
        trackedBy: { select: { id: true } },
      },
    });

    const results: CompanyHiringOverview[] = companies.map((comp) => {
      const activeJobs = comp.jobPostings.filter((j) => j.status === JobPostingStatus.ACTIVE);
      const newThisMonth = comp.jobPostings.filter((j) => j.createdAt >= oneMonthAgo).length;

      // Role breakdown
      const roleMap = new Map<string, number>();
      const locMap = new Map<string, number>();
      const skillMap = new Map<string, number>();
      let savedCount = 0;
      let appCount = 0;

      for (const job of comp.jobPostings) {
        savedCount += job.savedJobs.length;
        appCount += job.applications.length;

        if (job.status === JobPostingStatus.ACTIVE) {
          const role = this.normalizeRole(job.title);
          roleMap.set(role, (roleMap.get(role) ?? 0) + 1);

          const loc = job.location ? (job.location.split(',')[0]?.trim() ?? 'Other') : 'Remote';
          locMap.set(loc, (locMap.get(loc) ?? 0) + 1);

          for (const req of job.requirements) {
            const clean = req.trim();
            if (clean.length > 1) {
              skillMap.set(clean, (skillMap.get(clean) ?? 0) + 1);
            }
          }
        }
      }

      // Estimate monthly posting frequency
      const postingFrequency = Math.max(1, newThisMonth);

      const topRoles = Array.from(roleMap.entries())
        .map(([role, count]) => ({ role, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const topLocations = Array.from(locMap.entries())
        .map(([location, count]) => ({ location, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const topSkills = Array.from(skillMap.entries())
        .map(([skill, count]) => ({ skill, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

      return {
        companyId: comp.id,
        companyName: comp.name,
        industry: comp.industry,
        activeOpeningsCount: activeJobs.length,
        newOpeningsThisMonth: newThisMonth,
        postingFrequencyPerMonth: postingFrequency,
        trackedByUsersCount: comp.trackedBy.length,
        savedJobsCount: savedCount,
        totalApplicationsReceived: appCount,
        topRoles,
        topLocations,
        topSkills,
        hasSufficientData: comp.jobPostings.length >= 2,
      };
    });

    results.sort((a, b) => b.activeOpeningsCount - a.activeOpeningsCount);

    return {
      companies: results.slice(0, limit),
      totalActivelyHiringCompanies: results.length,
      calculatedAt: now.toISOString(),
    };
  }

  /**
   * Retrieves detailed market insight for a specific company by ID or Slug.
   */
  async getCompanyMarketInsights(companyIdOrSlug: string): Promise<CompanyHiringOverview> {
    const company = await this.prisma.company.findFirst({
      where: {
        OR: [{ id: companyIdOrSlug }, { slug: companyIdOrSlug }],
      },
      include: {
        jobPostings: {
          select: {
            id: true,
            title: true,
            location: true,
            requirements: true,
            status: true,
            createdAt: true,
            savedJobs: { select: { id: true } },
            applications: { select: { id: true } },
          },
        },
        trackedBy: { select: { id: true } },
      },
    });

    if (!company) {
      throw new NotFoundException(`Company not found: ${companyIdOrSlug}`);
    }

    const now = new Date();
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const activeJobs = company.jobPostings.filter((j) => j.status === JobPostingStatus.ACTIVE);
    const newThisMonth = company.jobPostings.filter((j) => j.createdAt >= oneMonthAgo).length;

    const roleMap = new Map<string, number>();
    const locMap = new Map<string, number>();
    const skillMap = new Map<string, number>();
    let savedCount = 0;
    let appCount = 0;

    for (const job of company.jobPostings) {
      savedCount += job.savedJobs.length;
      appCount += job.applications.length;

      const role = this.normalizeRole(job.title);
      roleMap.set(role, (roleMap.get(role) ?? 0) + 1);

      const loc = job.location ? (job.location.split(',')[0]?.trim() ?? 'Other') : 'Remote';
      locMap.set(loc, (locMap.get(loc) ?? 0) + 1);

      for (const req of job.requirements) {
        const clean = req.trim();
        if (clean.length > 1) {
          skillMap.set(clean, (skillMap.get(clean) ?? 0) + 1);
        }
      }
    }

    return {
      companyId: company.id,
      companyName: company.name,
      industry: company.industry,
      activeOpeningsCount: activeJobs.length,
      newOpeningsThisMonth: newThisMonth,
      postingFrequencyPerMonth: Math.max(1, newThisMonth),
      trackedByUsersCount: company.trackedBy.length,
      savedJobsCount: savedCount,
      totalApplicationsReceived: appCount,
      topRoles: Array.from(roleMap.entries())
        .map(([role, count]) => ({ role, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      topLocations: Array.from(locMap.entries())
        .map(([location, count]) => ({ location, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      topSkills: Array.from(skillMap.entries())
        .map(([skill, count]) => ({ skill, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15),
      hasSufficientData: company.jobPostings.length >= 1,
    };
  }

  private normalizeRole(title: string): string {
    const lower = title.toLowerCase();
    if (lower.includes('front')) return 'Frontend';
    if (lower.includes('back')) return 'Backend';
    if (lower.includes('full')) return 'Full Stack';
    if (lower.includes('data')) return 'Data Science';
    if (lower.includes('ai') || lower.includes('ml')) return 'AI / ML';
    if (lower.includes('devops') || lower.includes('cloud')) return 'DevOps & Cloud';
    if (lower.includes('mobile')) return 'Mobile';
    return 'Software Engineering';
  }
}
