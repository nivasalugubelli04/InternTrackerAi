import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OpportunityCategory, SourceTrustLevel } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ResearchSourceRegistryService implements OnModuleInit {
  private readonly logger = new Logger(ResearchSourceRegistryService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedDefaultSourcesIfEmpty();
  }

  /**
   * Seeds trusted default research source providers.
   */
  async seedDefaultSourcesIfEmpty() {
    const count = await this.prisma.researchSource.count();
    if (count > 0) return;

    this.logger.log('Seeding initial trusted research sources & feeds');

    const defaultSources = [
      {
        name: 'Official Tier 1 Tech Career Portals',
        sourceType: 'OFFICIAL_CAREER_PAGE',
        category: OpportunityCategory.INTERNSHIP,
        trustLevel: SourceTrustLevel.VERIFIED_OFFICIAL,
        baseUrl: 'https://careers.google.com,https://jobs.apple.com,https://careers.microsoft.com',
        supportedRegions: ['GLOBAL', 'NORTH_AMERICA', 'EUROPE', 'ASIA'],
        rateLimitPerMin: 60,
        healthStatus: 'HEALTHY',
      },
      {
        name: 'University & Academic Career Networks',
        sourceType: 'UNIVERSITY_PORTAL',
        category: OpportunityCategory.INTERNSHIP,
        trustLevel: SourceTrustLevel.PARTNER_PORTAL,
        baseUrl: 'https://career.mit.edu,https://careers.stanford.edu',
        supportedRegions: ['NORTH_AMERICA', 'GLOBAL'],
        rateLimitPerMin: 30,
        healthStatus: 'HEALTHY',
      },
      {
        name: 'Open-Source Fellowship & Grant Feeds',
        sourceType: 'OPEN_SOURCE_FEED',
        category: OpportunityCategory.OPEN_SOURCE,
        trustLevel: SourceTrustLevel.VERIFIED_OFFICIAL,
        baseUrl: 'https://summerofcode.withgoogle.com,https://mlh.io/fellowship',
        supportedRegions: ['GLOBAL'],
        rateLimitPerMin: 45,
        healthStatus: 'HEALTHY',
      },
      {
        name: 'Official Technical Competitions & Hackathons',
        sourceType: 'HACKATHON_PLATFORM',
        category: OpportunityCategory.HACKATHON,
        trustLevel: SourceTrustLevel.VERIFIED_OFFICIAL,
        baseUrl: 'https://devpost.com,https://kaggle.com/competitions',
        supportedRegions: ['GLOBAL'],
        rateLimitPerMin: 45,
        healthStatus: 'HEALTHY',
      },
      {
        name: 'Global Graduate & Early Career Programs',
        sourceType: 'OFFICIAL_CAREER_PAGE',
        category: OpportunityCategory.GRADUATE_PROGRAM,
        trustLevel: SourceTrustLevel.VERIFIED_OFFICIAL,
        baseUrl:
          'https://earlycareers.meta.com,https://amazon.jobs/en/business_categories/student-programs',
        supportedRegions: ['GLOBAL'],
        rateLimitPerMin: 60,
        healthStatus: 'HEALTHY',
      },
    ];

    for (const s of defaultSources) {
      await this.prisma.researchSource.create({
        data: s,
      });
    }
  }

  /**
   * Lists all active research sources with health indicators.
   */
  async getSources() {
    return this.prisma.researchSource.findMany({
      orderBy: { trustLevel: 'asc' },
      include: {
        _count: { select: { jobRuns: true } },
      },
    });
  }

  /**
   * Updates health status & error tracking for a research source.
   */
  async reportSourceHealth(sourceId: string, isSuccess: boolean, errorMessage?: string) {
    if (isSuccess) {
      await this.prisma.researchSource.update({
        where: { id: sourceId },
        data: {
          healthStatus: 'HEALTHY',
          errorCount: 0,
          lastSyncAt: new Date(),
        },
      });
    } else {
      const source = await this.prisma.researchSource.findUnique({ where: { id: sourceId } });
      const newErrorCount = (source?.errorCount || 0) + 1;
      const healthStatus =
        newErrorCount >= 5 ? 'FAILING' : newErrorCount >= 2 ? 'DEGRADED' : 'HEALTHY';

      await this.prisma.researchSource.update({
        where: { id: sourceId },
        data: {
          healthStatus,
          errorCount: newErrorCount,
          lastSyncAt: new Date(),
        },
      });

      this.logger.warn(
        `Research Source ${sourceId} reported failure (${healthStatus}): ${errorMessage}`,
      );
    }
  }
}
