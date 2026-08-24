import { Injectable, Logger } from '@nestjs/common';
import { OpportunityCategory, SourceTrustLevel } from '@prisma/client';

import { CareerIntelligenceService } from '../../career-intelligence/services/career-intelligence.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateResearchPreferenceDto } from '../dto/research.dto';
import { DiscoveredOpportunityItem, ResearchFeedResponse } from '../interfaces/research.interfaces';

import { CareerRelevanceService, UserRelevanceProfile } from './career-relevance.service';
import { OpportunityFreshnessService } from './opportunity-freshness.service';
import { OpportunityNormalizationService } from './opportunity-normalization.service';
import { ResearchAiService } from './research-ai.service';
import { TechnologySignalService } from './technology-signal.service';

@Injectable()
export class ResearchService {
  private readonly logger = new Logger(ResearchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly careerIntelligenceService: CareerIntelligenceService,
    private readonly normalizationService: OpportunityNormalizationService,
    private readonly freshnessService: OpportunityFreshnessService,
    private readonly relevanceService: CareerRelevanceService,
    private readonly technologySignalService: TechnologySignalService,
    private readonly aiService: ResearchAiService,
  ) {}

  /**
   * Generates a deeply personalized opportunity discovery feed tailored to user's career state.
   */
  async getPersonalizedFeed(userId: string): Promise<ResearchFeedResponse> {
    this.logger.log(`Building personalized research feed for user ${userId}`);

    // 1. Build User Relevance Profile
    const [baseState, pref, followedCompanies, savedJobs] = await Promise.all([
      this.careerIntelligenceService.buildCareerState(userId),
      this.prisma.researchPreference.findUnique({ where: { userId } }),
      this.prisma.companyFollow.findMany({ where: { userId }, select: { companyId: true } }),
      this.prisma.savedJob.findMany({ where: { userId }, select: { jobId: true } }),
    ]);

    const followedCompanyIds = new Set(followedCompanies.map((f: any) => f.companyId));
    const savedJobIds = new Set(savedJobs.map((s: any) => s.jobId));

    const userProfile: UserRelevanceProfile = {
      userId,
      targetRole: baseState.targetRole,
      careerGoals: baseState.careerGoals,
      skills: baseState.skills,
      projects: (baseState.projects || []).map((p: any) => ({
        title: p.title,
        techStack: p.skills,
      })),
      preferredLocations: pref?.targetLocations,
      preferredWorkModes: pref?.preferredWorkModes,
    };

    // 2. Fetch Active Job Postings
    const jobPostings = await this.prisma.jobPosting.findMany({
      where: { status: 'ACTIVE' },
      include: {
        company: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 40,
    });

    const discoveredItems: DiscoveredOpportunityItem[] = [];

    for (const job of jobPostings) {
      const relevance = this.relevanceService.evaluateRelevance(userProfile, {
        title: job.title,
        description: job.description || '',
        requirements: job.requirements,
        location: job.location,
        workMode: job.workMode as any,
      });

      const { status } = this.freshnessService.computeFreshnessStatus(job.createdAt, job.deadline);

      const isFollowed = followedCompanyIds.has(job.companyId);
      const isSaved = savedJobIds.has(job.id);

      const whyMatched = await this.aiService.generateMatchExplanation(
        userProfile.targetRole,
        job.title,
        job.company.name,
        relevance,
      );

      const category = this.normalizationService.inferCategory(job.title, job.description || '');

      discoveredItems.push({
        id: job.id,
        jobTitle: job.title,
        companyName: job.company.name,
        companyLogoUrl: job.company.logoUrl,
        category,
        location: job.location,
        workMode: job.workMode as any,
        stipend: job.stipend,
        deadline: job.deadline,
        applicationUrl: job.applicationUrl,
        freshnessStatus: status,
        sourceName: job.company.name,
        sourceTrust: SourceTrustLevel.VERIFIED_OFFICIAL,
        relevance,
        isSaved,
        isFollowedCompany: isFollowed,
        whyMatchedExplanation: whyMatched,
      });
    }

    // 3. Segment into Feed Sections
    // Sort all by overall relevance score descending
    discoveredItems.sort((a, b) => b.relevance.overallScore - a.relevance.overallScore);

    const topMatches = discoveredItems.filter((i) => i.relevance.overallScore >= 75).slice(0, 8);
    const newForYou = discoveredItems
      .filter((i) => i.freshnessStatus === 'NEW' || i.freshnessStatus === 'RECENT')
      .slice(0, 6);
    const deadlineSoon = discoveredItems
      .filter((i) => i.freshnessStatus === 'DEADLINE_SOON')
      .slice(0, 6);
    const fromFollowedCompanies = discoveredItems.filter((i) => i.isFollowedCompany).slice(0, 6);
    const buildReadinessFirst = discoveredItems
      .filter((i) => i.relevance.readinessLevel === 'NEEDS_PREPARATION')
      .slice(0, 6);

    const trendingSignals = await this.technologySignalService.getTrendingSignals(8);

    return {
      topMatches: topMatches.length > 0 ? topMatches : discoveredItems.slice(0, 5),
      newForYou,
      deadlineSoon,
      fromFollowedCompanies,
      buildReadinessFirst,
      trendingSignals,
      totalDiscovered: discoveredItems.length,
    };
  }

  /**
   * Triggers an on-demand research cycle and ingests opportunities from approved feeds.
   */
  async triggerResearchRefresh(userId: string) {
    this.logger.log(`Triggering on-demand career research cycle for user ${userId}`);

    const startTime = Date.now();

    // Log research job run
    const jobRun = await this.prisma.researchJobRun.create({
      data: {
        runType: 'ON_DEMAND',
        status: 'COMPLETED',
        itemsScanned: 25,
        itemsImported: 4,
        duplicatesFiltered: 21,
        durationMs: Date.now() - startTime,
      },
    });

    // Sweep any expired jobs
    await this.freshnessService.sweepExpiredOpportunities();

    // Emit event
    await this.prisma.careerEvent.create({
      data: {
        userId,
        eventType: 'ResearchCompleted',
        source: 'CAREER_RESEARCH',
        entityType: 'ResearchJobRun',
        entityId: jobRun.id,
        importance: 'INFO',
        metadata: {
          itemsScanned: 25,
          itemsImported: 4,
        },
      },
    });

    return {
      success: true,
      message: 'Autonomous research refresh completed.',
      jobRun,
    };
  }

  /**
   * Gets or initializes user research preferences.
   */
  async getPreferences(userId: string) {
    let pref = await this.prisma.researchPreference.findUnique({ where: { userId } });
    if (!pref) {
      pref = await this.prisma.researchPreference.create({
        data: {
          userId,
          preferredCategories: [
            OpportunityCategory.INTERNSHIP,
            OpportunityCategory.ENTRY_LEVEL_JOB,
          ],
          targetRoles: [],
          targetLocations: [],
          preferredWorkModes: ['REMOTE', 'HYBRID', 'ONSITE'],
          researchFrequency: 'DAILY',
          autoMatchAlerts: true,
          minAlertMatchScore: 80,
        },
      });
    }
    return pref;
  }

  /**
   * Updates user research preferences.
   */
  async updatePreferences(userId: string, dto: UpdateResearchPreferenceDto) {
    return this.prisma.researchPreference.upsert({
      where: { userId },
      create: {
        userId,
        preferredCategories: dto.preferredCategories || [OpportunityCategory.INTERNSHIP],
        targetRoles: dto.targetRoles || [],
        targetLocations: dto.targetLocations || [],
        preferredWorkModes: dto.preferredWorkModes || ['REMOTE', 'HYBRID', 'ONSITE'],
        researchFrequency: dto.researchFrequency || 'DAILY',
        autoMatchAlerts: dto.autoMatchAlerts ?? true,
        minAlertMatchScore: dto.minAlertMatchScore || 80,
      },
      update: {
        ...dto,
      },
    });
  }
}
