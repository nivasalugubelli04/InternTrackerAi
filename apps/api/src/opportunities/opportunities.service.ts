import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { JobPostingStatus, DismissReason, InteractionType, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { EngagementTrackerService } from '../engagement/services/engagement-tracker.service';
import { RedisService } from '../redis/redis.service';

import type { DismissJobDto } from './dto/dismiss-job.dto';
import type { OpportunitiesQueryDto } from './dto/opportunities-query.dto';
import { SortOption } from './dto/opportunities-query.dto';
import type { TrackInteractionDto } from './dto/track-interaction.dto';

export type DeadlineUrgency = 'URGENT' | 'SOON' | 'NORMAL' | 'UNKNOWN';

export interface CursorPayload {
  id: string;
  score?: number;
  createdAt?: string;
  deadline?: string;
  stipend?: number;
}

const CACHE_TTL = 300; // 5 minutes

const JOB_COMPANY_SELECT = {
  select: {
    id: true,
    name: true,
    slug: true,
    logoUrl: true,
    website: true,
    careerPageUrl: true,
    industry: true,
    description: true,
    headquarters: true,
    companySize: true,
  },
} as const;

@Injectable()
export class OpportunitiesService {
  private readonly logger = new Logger(OpportunitiesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly engagementTracker: EngagementTrackerService,
  ) {}

  // ── Helpers ─────────────────────────────────────────────────────────────────

  encodeCursor(payload: CursorPayload): string {
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  decodeCursor(cursor: string): CursorPayload | null {
    try {
      return JSON.parse(Buffer.from(cursor, 'base64').toString('utf8')) as CursorPayload;
    } catch {
      return null;
    }
  }

  classifyDeadline(deadline: Date | null): DeadlineUrgency {
    if (!deadline) return 'UNKNOWN';
    const diffDays = Math.ceil((deadline.getTime() - Date.now()) / 86_400_000);
    if (diffDays <= 3) return 'URGENT';
    if (diffDays <= 7) return 'SOON';
    return 'NORMAL';
  }

  private buildJobInclude(userId: string) {
    return {
      company: JOB_COMPANY_SELECT,
      matchScores: {
        where: { userId },
        take: 1,
        select: {
          overallScore: true,
          skillScore: true,
          educationScore: true,
          locationScore: true,
          cgpaScore: true,
          companyPreferenceScore: true,
          stipendScore: true,
          experienceScore: true,
        },
      },
      recommendations: {
        where: { userId },
        take: 1,
        select: {
          id: true,
          rank: true,
          priority: true,
          recommendationType: true,
          isViewed: true,
          isSaved: true,
          isDismissed: true,
          reasons: {
            select: { reasonType: true, description: true, weight: true },
          },
        },
      },
      savedJobs: {
        where: { userId },
        select: { id: true },
      },
      dismissedByUsers: {
        where: { userId },
        select: { id: true },
      },
    };
  }

  private formatJob(job: any) {
    const matchScore = job.matchScores?.[0] ?? null;
    const recommendation = job.recommendations?.[0] ?? null;
    const isSaved = (job.savedJobs?.length ?? 0) > 0;
    const isDismissed = (job.dismissedByUsers?.length ?? 0) > 0;
    const deadlineUrgency = this.classifyDeadline(job.deadline);

    return {
      id: job.id as string,
      title: job.title as string,
      department: job.department as string | null,
      employmentType: job.employmentType as string | null,
      experienceLevel: job.experienceLevel as string | null,
      location: job.location as string | null,
      workMode: job.workMode as string | null,
      stipend: job.stipend as number | null,
      salary: job.salary as number | null,
      duration: job.duration as string | null,
      description: job.description as string | null,
      requirements: (job.requirements ?? []) as string[],
      responsibilities: (job.responsibilities ?? []) as string[],
      benefits: (job.benefits ?? []) as string[],
      applicationUrl: job.applicationUrl as string,
      postedDate: job.postedDate as Date | null,
      deadline: job.deadline as Date | null,
      deadlineUrgency,
      status: job.status as string,
      createdAt: job.createdAt as Date,
      company: job.company,
      matchScore,
      recommendation,
      isSaved,
      isDismissed,
    };
  }

  private buildWhereClause(
    query: OpportunitiesQueryDto,
    trackedCompanyIds: string[],
    dismissedJobIds: string[],
  ): Prisma.JobPostingWhereInput {
    const where: Prisma.JobPostingWhereInput = {
      status: JobPostingStatus.ACTIVE,
    };

    // Exclude dismissed jobs only when there are some
    if (dismissedJobIds.length > 0) {
      where.id = { notIn: dismissedJobIds };
    }

    // Text search
    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { location: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
        { company: { name: { contains: query.q, mode: 'insensitive' } } },
        { company: { industry: { contains: query.q, mode: 'insensitive' } } },
      ];
    }

    if (query.companyId) where.companyId = query.companyId;
    if (query.location) where.location = { contains: query.location, mode: 'insensitive' };
    if (query.workMode) where.workMode = query.workMode;
    if (query.employmentType)
      where.employmentType = { contains: query.employmentType, mode: 'insensitive' };
    if (query.minStipend !== undefined) where.stipend = { gte: query.minStipend };
    if (query.maxStipend !== undefined) {
      where.stipend = { ...(where.stipend as object), lte: query.maxStipend };
    }
    if (query.postedAfter) where.postedDate = { gte: new Date(query.postedAfter) };
    if (query.postedBefore) {
      where.postedDate = { ...(where.postedDate as object), lte: new Date(query.postedBefore) };
    }
    if (query.deadlineBefore) where.deadline = { lte: new Date(query.deadlineBefore) };
    if (query.trackedCompaniesOnly && trackedCompanyIds.length) {
      where.companyId = { in: trackedCompanyIds };
    }
    if (query.skills) {
      const skillList = query.skills.split(',').map((s) => s.trim());
      where.requirements = { hasSome: skillList };
    }

    return where;
  }

  // ── Main Feed ────────────────────────────────────────────────────────────────

  async getOpportunities(userId: string, query: OpportunitiesQueryDto) {
    this.logger.log(`getOpportunities user=${userId} sort=${query.sort}`);
    const limit = query.limit ?? 20;

    const [dismissedJobs, trackedCompanies] = await Promise.all([
      this.prisma.dismissedJob.findMany({
        where: { userId },
        select: { jobId: true },
      }),
      this.prisma.trackedCompany.findMany({
        where: { userId, trackingEnabled: true },
        select: { companyId: true, priority: true },
      }),
    ]);

    const dismissedJobIds = dismissedJobs.map((d) => d.jobId);
    const trackedCompanyIds = trackedCompanies.map((t) => t.companyId);

    const where = this.buildWhereClause(query, trackedCompanyIds, dismissedJobIds);

    // Cursor for pagination
    if (query.cursor) {
      const decoded = this.decodeCursor(query.cursor);
      if (decoded?.id) {
        const existingAnd = Array.isArray(where.AND) ? where.AND : [];
        where.AND = [...existingAnd, { id: { lt: decoded.id } }];
      }
    }

    let orderBy: Prisma.JobPostingOrderByWithRelationInput[] = [];
    switch (query.sort ?? SortOption.BEST_MATCH) {
      case SortOption.NEWEST:
        orderBy = [{ createdAt: 'desc' }, { id: 'desc' }];
        break;
      case SortOption.DEADLINE_SOON:
        orderBy = [{ deadline: 'asc' }, { id: 'asc' }];
        break;
      case SortOption.HIGHEST_STIPEND:
        orderBy = [{ stipend: 'desc' }, { id: 'desc' }];
        break;
      default:
        orderBy = [{ createdAt: 'desc' }];
    }

    const jobs = await this.prisma.jobPosting.findMany({
      where,
      orderBy,
      take: limit + 1,
      include: this.buildJobInclude(userId),
    });

    let formatted = jobs.map((j) => this.formatJob(j));

    if (query.minMatchScore !== undefined) {
      const minScore = query.minMatchScore;
      formatted = formatted.filter((j) => (j.matchScore?.overallScore ?? 0) >= minScore);
    }

    if (query.sort === SortOption.BEST_MATCH || !query.sort) {
      formatted.sort(
        (a, b) => (b.matchScore?.overallScore ?? 0) - (a.matchScore?.overallScore ?? 0),
      );
    }

    if (query.sort === SortOption.COMPANY_PRIORITY) {
      const trackedPriorityMap = new Map(trackedCompanies.map((t) => [t.companyId, t.priority]));
      formatted.sort((a, b) => {
        const pa = trackedPriorityMap.has(a.company?.id ?? '') ? 0 : 1;
        const pb = trackedPriorityMap.has(b.company?.id ?? '') ? 0 : 1;
        return pa - pb;
      });
    }

    const hasMore = formatted.length > limit;
    const items = formatted.slice(0, limit);
    const lastItem = items[items.length - 1];
    const nextCursor = hasMore && lastItem ? this.encodeCursor({ id: lastItem.id }) : null;

    return { data: items, meta: { hasMore, nextCursor, limit } };
  }

  // ── Home Sections ────────────────────────────────────────────────────────────

  async getTopMatches(userId: string, limit = 10) {
    const dismissed = await this.prisma.dismissedJob.findMany({
      where: { userId },
      select: { jobId: true },
    });
    const dismissedIds = dismissed.map((d) => d.jobId);

    const whereJobId: Prisma.RecommendationWhereInput =
      dismissedIds.length > 0 ? { jobId: { notIn: dismissedIds } } : {};

    const recommendations = await this.prisma.recommendation.findMany({
      where: {
        userId,
        isDismissed: false,
        ...whereJobId,
        job: { status: JobPostingStatus.ACTIVE },
      },
      orderBy: { rank: 'asc' },
      take: limit,
      include: {
        job: {
          include: {
            company: JOB_COMPANY_SELECT,
            savedJobs: { where: { userId }, select: { id: true } },
          },
        },
        reasons: { select: { reasonType: true, description: true, weight: true } },
      },
    });

    const jobIds = recommendations.map((r) => r.jobId);
    const matchScores = await this.prisma.matchScore.findMany({
      where: { userId, jobId: { in: jobIds } },
    });
    const scoreMap = new Map(matchScores.map((ms) => [ms.jobId, ms]));

    return recommendations.map((rec) => ({
      ...rec.job,
      deadlineUrgency: this.classifyDeadline(rec.job.deadline),
      isSaved: (rec.job.savedJobs?.length ?? 0) > 0,
      matchScore: scoreMap.get(rec.jobId) ?? null,
      recommendation: {
        rank: rec.rank,
        priority: rec.priority,
        recommendationType: rec.recommendationType,
        reasons: rec.reasons,
      },
    }));
  }

  async getNewOpportunities(userId: string, limit = 10) {
    const dismissed = await this.prisma.dismissedJob.findMany({
      where: { userId },
      select: { jobId: true },
    });
    const dismissedIds = dismissed.map((d) => d.jobId);
    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000);

    const whereId: Prisma.JobPostingWhereInput =
      dismissedIds.length > 0 ? { id: { notIn: dismissedIds } } : {};

    const jobs = await this.prisma.jobPosting.findMany({
      where: {
        status: JobPostingStatus.ACTIVE,
        ...whereId,
        createdAt: { gte: sevenDaysAgo },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: this.buildJobInclude(userId),
    });

    return jobs.map((j) => this.formatJob(j));
  }

  async getClosingSoon(userId: string, limit = 10) {
    const dismissed = await this.prisma.dismissedJob.findMany({
      where: { userId },
      select: { jobId: true },
    });
    const dismissedIds = dismissed.map((d) => d.jobId);
    const now = new Date();
    const sevenDaysFromNow = new Date(Date.now() + 7 * 86_400_000);

    const whereId: Prisma.JobPostingWhereInput =
      dismissedIds.length > 0 ? { id: { notIn: dismissedIds } } : {};

    const jobs = await this.prisma.jobPosting.findMany({
      where: {
        status: JobPostingStatus.ACTIVE,
        ...whereId,
        deadline: { gte: now, lte: sevenDaysFromNow },
      },
      orderBy: { deadline: 'asc' },
      take: limit,
      include: this.buildJobInclude(userId),
    });

    return jobs.map((j) => this.formatJob(j));
  }

  async getTrackedCompanyOpportunities(userId: string, limit = 20) {
    const trackedCompanies = await this.prisma.trackedCompany.findMany({
      where: { userId, trackingEnabled: true },
      select: { companyId: true, priority: true },
      orderBy: { priority: 'asc' },
    });

    if (!trackedCompanies.length) return [];

    const trackedIds = trackedCompanies.map((t) => t.companyId);
    const dismissed = await this.prisma.dismissedJob.findMany({
      where: { userId },
      select: { jobId: true },
    });
    const dismissedIds = dismissed.map((d) => d.jobId);

    const whereId: Prisma.JobPostingWhereInput =
      dismissedIds.length > 0 ? { id: { notIn: dismissedIds } } : {};

    const jobs = await this.prisma.jobPosting.findMany({
      where: {
        status: JobPostingStatus.ACTIVE,
        companyId: { in: trackedIds },
        ...whereId,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: this.buildJobInclude(userId),
    });

    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    const companyPriorityMap = new Map(
      trackedCompanies.map((t) => [t.companyId, priorityOrder[t.priority] ?? 1]),
    );

    const formatted = jobs.map((j) => this.formatJob(j));
    formatted.sort(
      (a, b) =>
        (companyPriorityMap.get(a.company?.id ?? '') ?? 1) -
        (companyPriorityMap.get(b.company?.id ?? '') ?? 1),
    );
    return formatted;
  }

  async getSavedOpportunities(userId: string) {
    const saved = await this.prisma.savedJob.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        job: {
          include: this.buildJobInclude(userId),
        },
      },
    });

    return saved.map((s) => this.formatJob(s.job));
  }

  // ── Single Opportunity ───────────────────────────────────────────────────────

  async getOpportunityById(id: string, userId: string) {
    const job = await this.prisma.jobPosting.findFirst({
      where: { id, status: JobPostingStatus.ACTIVE },
      include: this.buildJobInclude(userId),
    });

    if (!job)
      throw new NotFoundException(`Opportunity with ID ${id} not found or no longer active`);

    // Mark recommendation as viewed (fire and forget)
    this.prisma.recommendation
      .updateMany({
        where: { userId, jobId: id, isViewed: false },
        data: { isViewed: true },
      })
      .catch(() => {});

    // Track VIEW interaction
    this.trackInteraction(userId, { interactionType: InteractionType.VIEW, jobId: id }).catch(
      () => {},
    );

    return this.formatJob(job);
  }

  // ── Filters Discovery ────────────────────────────────────────────────────────

  async getFilters() {
    const cacheKey = 'opportunities:filters';
    const client = this.redis.getClient();

    if (client) {
      const cached = await client.get(cacheKey);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {
          // fallback to DB
        }
      }
    }

    const [locationResults, industryResults, workModeResults] = await Promise.all([
      this.prisma.jobPosting.findMany({
        where: { status: JobPostingStatus.ACTIVE, location: { not: null } },
        select: { location: true },
        distinct: ['location'],
        take: 100,
      }),
      this.prisma.company.findMany({
        where: { isActive: true, industry: { not: null } },
        select: { industry: true },
        distinct: ['industry'],
        take: 50,
      }),
      this.prisma.jobPosting.findMany({
        where: { status: JobPostingStatus.ACTIVE, workMode: { not: null } },
        select: { workMode: true },
        distinct: ['workMode'],
      }),
    ]);

    const result = {
      locations: locationResults.map((r) => r.location).filter(Boolean),
      industries: industryResults.map((r) => r.industry).filter(Boolean),
      workModes: workModeResults.map((r) => r.workMode).filter(Boolean),
    };

    if (client) {
      await client.set(cacheKey, JSON.stringify(result), 'EX', CACHE_TTL * 6);
    }

    return result;
  }

  // ── Search ───────────────────────────────────────────────────────────────────

  async search(userId: string, q: string, limit = 20) {
    if (!q.trim()) return { data: [], meta: { total: 0 } };

    this.trackInteraction(userId, { interactionType: InteractionType.SEARCH, query: q }).catch(
      () => {},
    );

    const dismissed = await this.prisma.dismissedJob.findMany({
      where: { userId },
      select: { jobId: true },
    });
    const dismissedIds = dismissed.map((d) => d.jobId);

    const whereId: Prisma.JobPostingWhereInput =
      dismissedIds.length > 0 ? { id: { notIn: dismissedIds } } : {};

    const where: Prisma.JobPostingWhereInput = {
      status: JobPostingStatus.ACTIVE,
      ...whereId,
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { location: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { company: { name: { contains: q, mode: 'insensitive' } } },
        { company: { industry: { contains: q, mode: 'insensitive' } } },
      ],
    };

    const [jobs, total] = await Promise.all([
      this.prisma.jobPosting.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: this.buildJobInclude(userId),
      }),
      this.prisma.jobPosting.count({ where }),
    ]);

    return { data: jobs.map((j) => this.formatJob(j)), meta: { total } };
  }

  // ── Save / Unsave ────────────────────────────────────────────────────────────

  async saveJob(userId: string, jobId: string) {
    const job = await this.prisma.jobPosting.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException(`Job ${jobId} not found`);

    try {
      const saved = await this.prisma.savedJob.create({ data: { userId, jobId } });

      await this.prisma.recommendation
        .updateMany({ where: { userId, jobId }, data: { isSaved: true } })
        .catch(() => {});

      await this.trackInteraction(userId, {
        interactionType: InteractionType.SAVE,
        jobId,
      }).catch(() => {});

      this.logger.log(`User ${userId} saved job ${jobId}`);

      // Phase 16: Track engagement event
      await this.engagementTracker.trackAction(userId, 'JOB_SAVED');

      return { saved: true, savedAt: saved.createdAt };
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictException('Job already saved');
      }
      throw error;
    }
  }

  async unsaveJob(userId: string, jobId: string) {
    const existing = await this.prisma.savedJob.findUnique({
      where: { userId_jobId: { userId, jobId } },
    });
    if (!existing) throw new NotFoundException('Saved job not found');

    await this.prisma.savedJob.delete({ where: { userId_jobId: { userId, jobId } } });

    await this.prisma.recommendation
      .updateMany({ where: { userId, jobId }, data: { isSaved: false } })
      .catch(() => {});

    await this.trackInteraction(userId, {
      interactionType: InteractionType.UNSAVE,
      jobId,
    }).catch(() => {});

    this.logger.log(`User ${userId} unsaved job ${jobId}`);
    return { saved: false };
  }

  // ── Dismiss ──────────────────────────────────────────────────────────────────

  async dismissJob(userId: string, jobId: string, dto: DismissJobDto) {
    const job = await this.prisma.jobPosting.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException(`Job ${jobId} not found`);

    await this.prisma.dismissedJob.upsert({
      where: { userId_jobId: { userId, jobId } },
      create: { userId, jobId, reason: dto.reason ?? DismissReason.NOT_INTERESTED },
      update: { reason: dto.reason ?? DismissReason.NOT_INTERESTED },
    });

    await this.prisma.recommendation
      .updateMany({ where: { userId, jobId }, data: { isDismissed: true } })
      .catch(() => {});

    await this.trackInteraction(userId, {
      interactionType: InteractionType.DISMISS,
      jobId,
    }).catch(() => {});

    this.logger.log(`User ${userId} dismissed job ${jobId} (reason: ${dto.reason})`);
    return { dismissed: true };
  }

  // ── Interactions ─────────────────────────────────────────────────────────────

  async trackInteraction(userId: string, dto: TrackInteractionDto): Promise<void> {
    try {
      await this.prisma.jobInteraction.create({
        data: {
          userId,
          jobId: dto.jobId ?? null,
          interactionType: dto.interactionType,
          query: dto.query ?? null,
          filtersJson: dto.filtersJson
            ? (dto.filtersJson as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to track interaction ${dto.interactionType} for user ${userId}: ${String(error)}`,
      );
    }
  }

  // ── Home Dashboard Stats ─────────────────────────────────────────────────────

  async getDashboardStats(userId: string) {
    const [newCount, highMatchCount, savedCount] = await Promise.all([
      this.prisma.jobPosting.count({
        where: {
          status: JobPostingStatus.ACTIVE,
          createdAt: { gte: new Date(Date.now() - 7 * 86_400_000) },
        },
      }),
      this.prisma.matchScore.count({
        where: { userId, overallScore: { gte: 80 } },
      }),
      this.prisma.savedJob.count({ where: { userId } }),
    ]);

    return { newCount, highMatchCount, savedCount };
  }
}
