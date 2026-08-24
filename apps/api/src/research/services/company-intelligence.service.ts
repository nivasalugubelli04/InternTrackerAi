import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { CompanyIntelligenceProfile } from '../interfaces/research.interfaces';

@Injectable()
export class CompanyIntelligenceService {
  private readonly logger = new Logger(CompanyIntelligenceService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns a comprehensive company intelligence profile.
   */
  async getCompanyProfile(companyId: string, userId?: string): Promise<CompanyIntelligenceProfile> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: {
        jobPostings: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!company) {
      throw new NotFoundException('Company not found.');
    }

    // Determine followed status
    let isFollowed = false;
    let userApplicationCount = 0;

    if (userId) {
      const follow = await this.prisma.companyFollow.findUnique({
        where: { userId_companyId: { userId, companyId } },
      });
      isFollowed = Boolean(follow);

      userApplicationCount = await this.prisma.application.count({
        where: { userId },
      });
    }

    const activeCount = company.jobPostings.length;
    const hiringVelocity: 'ACCELERATING' | 'STEADY' | 'SELECTIVE' =
      activeCount >= 6 ? 'ACCELERATING' : activeCount >= 2 ? 'STEADY' : 'SELECTIVE';

    // Aggregate top required skills from company job postings
    const skillCounts: Record<string, number> = {};
    for (const job of company.jobPostings) {
      for (const req of job.requirements || []) {
        for (const token of req.split(/[\s,]+/)) {
          if (token.length > 3) {
            const clean = token.replace(/[^a-zA-Z]/g, '');
            if (clean) skillCounts[clean] = (skillCounts[clean] || 0) + 1;
          }
        }
      }
    }

    const topRequiredSkills = Object.entries(skillCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const latestOpportunities = company.jobPostings.map((j) => ({
      id: j.id,
      title: j.title,
      deadline: j.deadline,
      matchScore: 75, // standard baseline estimate
    }));

    return {
      id: company.id,
      name: company.name,
      slug: company.slug,
      logoUrl: company.logoUrl,
      industry: company.industry,
      headquarters: company.headquarters,
      companySize: company.companySize,
      description: company.description,
      activeOpportunityCount: activeCount,
      hiringVelocity,
      topRequiredSkills,
      userApplicationCount,
      isFollowed,
      latestOpportunities,
    };
  }

  /**
   * Follows a company to monitor new opportunity releases and hiring shifts.
   */
  async followCompany(
    userId: string,
    companyId: string,
    options?: { minMatchAlert?: number; notes?: string },
  ) {
    this.logger.log(`User ${userId} following company ${companyId}`);

    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new NotFoundException('Company not found.');

    const follow = await this.prisma.companyFollow.upsert({
      where: { userId_companyId: { userId, companyId } },
      create: {
        userId,
        companyId,
        minMatchAlert: options?.minMatchAlert || 75,
        notes: options?.notes ?? null,
        notifyOnNewJobs: true,
      },
      update: {
        minMatchAlert: options?.minMatchAlert || 75,
        notes: options?.notes ?? null,
        notifyOnNewJobs: true,
      },
    });

    await this.prisma.careerEvent.create({
      data: {
        userId,
        eventType: 'CompanyFollowed',
        source: 'CAREER_RESEARCH',
        entityType: 'Company',
        entityId: companyId,
        importance: 'INFO',
        metadata: { companyName: company.name },
      },
    });

    return { success: true, follow };
  }

  /**
   * Unfollows a company.
   */
  async unfollowCompany(userId: string, companyId: string) {
    await this.prisma.companyFollow.deleteMany({
      where: { userId, companyId },
    });
    return { success: true, message: 'Company unfollowed.' };
  }

  /**
   * Returns list of followed companies for a user.
   */
  async getFollowedCompanies(userId: string) {
    const follows = await this.prisma.companyFollow.findMany({
      where: { userId },
    });

    const companyIds = follows.map((f) => f.companyId);
    const companies = await this.prisma.company.findMany({
      where: { id: { in: companyIds } },
      include: {
        _count: {
          select: { jobPostings: { where: { status: 'ACTIVE' } } },
        },
      },
    });

    const companyMap = new Map(companies.map((c) => [c.id, c]));

    return follows.map((f: any) => {
      const comp = companyMap.get(f.companyId);
      return {
        companyId: f.companyId,
        name: comp?.name || 'Company',
        slug: comp?.slug || '',
        logoUrl: comp?.logoUrl || null,
        industry: comp?.industry || null,
        activeJobsCount: comp?._count?.jobPostings || 0,
        minMatchAlert: f.minMatchAlert,
        followedAt: f.createdAt,
      };
    });
  }
}
