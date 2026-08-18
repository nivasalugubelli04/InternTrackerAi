import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type {
  RecommendationPriority,
  RecommendationType,
  RecommendationFeedbackType,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import type { MatchReasonData } from '../providers/matching-provider.interface';

import { JobAnalyzerService } from './job-analyzer.service';
import { ProfileAnalyzerService } from './profile-analyzer.service';
import { ScoringEngineService } from './scoring-engine.service';
import { SemanticMatchingService } from './semantic-matching.service';

export interface RecommendationQueryFilter {
  recommendationType?: RecommendationType;
  priority?: RecommendationPriority;
  isSaved?: boolean;
  isDismissed?: boolean;
  page?: number;
  limit?: number;
}

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);
  private readonly CACHE_TTL_SECONDS = 3600; // 1 hour

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly profileAnalyzer: ProfileAnalyzerService,
    private readonly jobAnalyzer: JobAnalyzerService,
    private readonly scoringEngine: ScoringEngineService,
    private readonly semanticMatching: SemanticMatchingService,
  ) {}

  /**
   * Main matching execution pipeline for a specific user.
   */
  async runMatchingForUser(userId: string): Promise<{
    userId: string;
    totalJobsEvaluated: number;
    recommendationsCount: number;
    highestScore: number;
  }> {
    const startTime = Date.now();
    this.logger.log(`Matching Started for user: ${userId}`);

    const profile = await this.profileAnalyzer.analyzeProfile(userId);

    // Fetch all active job postings
    const activeJobs = await this.prisma.jobPosting.findMany({
      where: { status: 'ACTIVE' },
      include: { company: true },
    });

    if (activeJobs.length === 0) {
      this.logger.warn(`No active job postings found for matching user ${userId}`);
      return {
        userId,
        totalJobsEvaluated: 0,
        recommendationsCount: 0,
        highestScore: 0,
      };
    }

    // Evaluate matching score for each job posting
    const evaluatedRaw = await Promise.all(
      activeJobs.map(async (job) => {
        const normalizedJob = this.jobAnalyzer.normalizeJobData(job);
        const evalResult = await this.scoringEngine.evaluateMatch(profile, normalizedJob);

        // 1. Hard Eligibility Filter: clean up old DB records and skip if user is not eligible
        if (!evalResult.isEligible) {
          await this.prisma.recommendation
            .deleteMany({ where: { userId, jobId: job.id } })
            .catch(() => {});
          await this.prisma.matchScore
            .deleteMany({ where: { userId, jobId: job.id } })
            .catch(() => {});
          return null;
        }

        // Phase 13: Fetch Semantic Score
        const semanticScore = await this.semanticMatching.computeSemanticScore(userId, job.id);

        // Blend Scores (Configurable later, hardcoded for now 60/40)
        if (semanticScore !== null) {
          evalResult.overallScore = Math.round(evalResult.overallScore * 0.6 + semanticScore * 0.4);
        }

        return {
          jobId: job.id,
          evalResult: {
            ...evalResult,
            roleCategory: normalizedJob.roleCategory,
            companyId: normalizedJob.companyId,
          },
          semanticScore,
        };
      }),
    );

    const evaluatedResults = evaluatedRaw.filter(
      (item): item is NonNullable<typeof item> => item !== null,
    );

    // 2. Diversity Reranking
    const finalRanked: typeof evaluatedResults = [];
    const companyCountMap = new Map<string, number>();
    const roleCatCountMap = new Map<string, number>();
    const pool = [...evaluatedResults];

    while (pool.length > 0) {
      let bestIndex = 0;
      let bestAdjustedScore = -9999;

      for (let i = 0; i < pool.length; i++) {
        const item = pool[i];
        if (!item) continue;
        const companyId = item.evalResult.companyId;
        const roleCat = item.evalResult.roleCategory;

        const companyCount = companyCountMap.get(companyId) ?? 0;
        const roleCatCount = roleCatCountMap.get(roleCat) ?? 0;

        // Apply penalty to maintain recommendation diversity
        const penalty = companyCount * 12 + roleCatCount * 8;
        const adjustedScore = item.evalResult.overallScore - penalty;

        if (adjustedScore > bestAdjustedScore) {
          bestAdjustedScore = adjustedScore;
          bestIndex = i;
        }
      }

      const selected = pool.splice(bestIndex, 1)[0];
      if (selected) {
        finalRanked.push(selected);
        companyCountMap.set(
          selected.evalResult.companyId,
          (companyCountMap.get(selected.evalResult.companyId) ?? 0) + 1,
        );
        roleCatCountMap.set(
          selected.evalResult.roleCategory,
          (roleCatCountMap.get(selected.evalResult.roleCategory) ?? 0) + 1,
        );
      }
    }

    let highestScore = 0;
    let recommendationsCount = 0;

    // Persist scores and recommendations in database
    for (let i = 0; i < finalRanked.length; i++) {
      const item = finalRanked[i];
      if (!item) continue;
      const rank = i + 1;
      const { jobId, evalResult } = item;

      if (evalResult.overallScore > highestScore) {
        highestScore = evalResult.overallScore;
      }

      // Upsert MatchScore
      await this.prisma.matchScore.upsert({
        where: {
          userId_jobId: { userId, jobId },
        },
        create: {
          userId,
          jobId,
          overallScore: evalResult.overallScore,
          semanticScore: item.semanticScore,
          skillScore: evalResult.skillScore,
          educationScore: evalResult.educationScore,
          locationScore: evalResult.locationScore,
          cgpaScore: evalResult.cgpaScore,
          companyPreferenceScore: evalResult.companyPreferenceScore,
          stipendScore: evalResult.stipendScore,
          experienceScore: evalResult.experienceScore,
          careerGoalScore: evalResult.careerGoalScore ?? 0.0,
          freshnessScore: evalResult.freshnessScore ?? 0.0,
          behavioralScore: evalResult.behavioralScore ?? 0.0,
        },
        update: {
          overallScore: evalResult.overallScore,
          semanticScore: item.semanticScore,
          skillScore: evalResult.skillScore,
          educationScore: evalResult.educationScore,
          locationScore: evalResult.locationScore,
          cgpaScore: evalResult.cgpaScore,
          companyPreferenceScore: evalResult.companyPreferenceScore,
          stipendScore: evalResult.stipendScore,
          experienceScore: evalResult.experienceScore,
          careerGoalScore: evalResult.careerGoalScore ?? 0.0,
          freshnessScore: evalResult.freshnessScore ?? 0.0,
          behavioralScore: evalResult.behavioralScore ?? 0.0,
        },
      });

      // Upsert Recommendation (delete old reasons and re-create)
      const recommendation = await this.prisma.recommendation.upsert({
        where: {
          userId_jobId: { userId, jobId },
        },
        create: {
          userId,
          jobId,
          rank,
          priority: evalResult.priority,
          recommendationType: evalResult.recommendationType,
        },
        update: {
          rank,
          priority: evalResult.priority,
          recommendationType: evalResult.recommendationType,
        },
      });

      // Delete existing reasons and create new explanations
      await this.prisma.recommendationReason.deleteMany({
        where: { recommendationId: recommendation.id },
      });

      if (evalResult.reasons.length > 0) {
        await this.prisma.recommendationReason.createMany({
          data: evalResult.reasons.map((r: MatchReasonData) => ({
            recommendationId: recommendation.id,
            reasonType: r.reasonType,
            description: r.description,
            weight: r.weight,
          })),
        });
      }

      recommendationsCount++;
    }

    // Invalidate Redis caches for user recommendations
    await this.clearUserMatchCache(userId);

    const durationMs = Date.now() - startTime;
    this.logger.log(
      `Matching Completed for user ${userId}: ${recommendationsCount} recommendations generated in ${durationMs}ms`,
    );

    return {
      userId,
      totalJobsEvaluated: activeJobs.length,
      recommendationsCount,
      highestScore,
    };
  }

  /**
   * Retrieves paginated recommendations for a user with filters.
   */
  async getRecommendations(userId: string, filter: RecommendationQueryFilter) {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const whereClause: any = {
      userId,
      isDismissed: false,
      ...(filter.recommendationType && { recommendationType: filter.recommendationType }),
      ...(filter.priority && { priority: filter.priority }),
      ...(filter.isSaved !== undefined && { isSaved: filter.isSaved }),
      ...(filter.isDismissed !== undefined && { isDismissed: filter.isDismissed }),
    };

    const [items, total] = await Promise.all([
      this.prisma.recommendation.findMany({
        where: whereClause,
        orderBy: { rank: 'asc' },
        skip,
        take: limit,
        include: {
          job: {
            include: { company: true },
          },
          reasons: true,
        },
      }),
      this.prisma.recommendation.count({ where: whereClause }),
    ]);

    // Fetch associated match scores
    const jobIds = items.map((item) => item.jobId);
    const matchScores = await this.prisma.matchScore.findMany({
      where: {
        userId,
        jobId: { in: jobIds },
      },
    });

    const scoreMap = new Map(matchScores.map((ms) => [ms.jobId, ms]));

    const profile = await this.profileAnalyzer.analyzeProfile(userId).catch(() => null);
    const profileSkills = profile?.skills.map((s) => s.toLowerCase()) ?? [];

    const formattedData = items.map((item) => {
      const matchScore = scoreMap.get(item.jobId) ?? null;
      const normalizedJob = this.jobAnalyzer.normalizeJobData(item.job);
      return {
        ...item,
        matchScore,
        missingSkills: matchScore
          ? normalizedJob.requiredSkills.filter((rs) => !profileSkills.includes(rs.toLowerCase()))
          : [],
      };
    });

    return {
      data: formattedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieves a single recommendation by ID.
   */
  async getRecommendationById(id: string, userId: string) {
    const recommendation = await this.prisma.recommendation.findFirst({
      where: { id, userId },
      include: {
        job: {
          include: { company: true },
        },
        reasons: true,
      },
    });

    if (!recommendation) {
      throw new NotFoundException(`Recommendation with ID ${id} not found`);
    }

    // Mark as viewed asynchronously
    if (!recommendation.isViewed) {
      await this.prisma.recommendation.update({
        where: { id },
        data: { isViewed: true },
      });
    }

    const matchScore = await this.prisma.matchScore.findUnique({
      where: {
        userId_jobId: { userId, jobId: recommendation.jobId },
      },
    });

    const normalizedJob = this.jobAnalyzer.normalizeJobData(recommendation.job);

    return {
      ...recommendation,
      isViewed: true,
      matchScore,
      missingSkills: normalizedJob.requiredSkills, // Will be filtered on frontend or computed
    };
  }

  /**
   * Retrieves or computes match score for a specific user and job.
   */
  async getMatchScoreForJob(userId: string, jobId: string) {
    const cacheKey = `match_score:${userId}:${jobId}`;
    const client = this.redis.getClient();

    if (client) {
      const cachedRaw = await client.get(cacheKey);
      if (cachedRaw) {
        try {
          return JSON.parse(cachedRaw);
        } catch {
          // parse error, fallback to DB
        }
      }
    }

    let matchScore = await this.prisma.matchScore.findUnique({
      where: { userId_jobId: { userId, jobId } },
    });

    if (!matchScore) {
      const profile = await this.profileAnalyzer.analyzeProfile(userId);
      const job = await this.jobAnalyzer.analyzeJob(jobId);
      const evalResult = await this.scoringEngine.evaluateMatch(profile, job);

      matchScore = await this.prisma.matchScore.create({
        data: {
          userId,
          jobId,
          overallScore: evalResult.overallScore,
          skillScore: evalResult.skillScore,
          educationScore: evalResult.educationScore,
          locationScore: evalResult.locationScore,
          cgpaScore: evalResult.cgpaScore,
          companyPreferenceScore: evalResult.companyPreferenceScore,
          stipendScore: evalResult.stipendScore,
          experienceScore: evalResult.experienceScore,
          careerGoalScore: evalResult.careerGoalScore ?? 0.0,
          freshnessScore: evalResult.freshnessScore ?? 0.0,
          behavioralScore: evalResult.behavioralScore ?? 0.0,
        },
      });
    }

    if (client) {
      await client.set(cacheKey, JSON.stringify(matchScore), 'EX', this.CACHE_TTL_SECONDS);
    }

    return matchScore;
  }

  /**
   * Submits user feedback for a recommendation.
   */
  async submitFeedback(userId: string, jobId: string, feedback: RecommendationFeedbackType) {
    const savedFeedback = await this.prisma.recommendationFeedback.create({
      data: {
        userId,
        jobId,
        feedback,
      },
    });

    // Capture dismiss logic immediately if marked negative
    if (feedback === 'NOT_RELEVANT' || feedback === 'NOT_INTERESTED') {
      await this.prisma.recommendation.updateMany({
        where: { userId, jobId },
        data: { isDismissed: true },
      });
      await this.prisma.dismissedJob.upsert({
        where: { userId_jobId: { userId, jobId } },
        create: { userId, jobId, reason: 'NOT_RELEVANT' },
        update: { reason: 'NOT_RELEVANT' },
      });
    }

    // Trigger runMatchingForUser asynchronously to incorporate signal updates
    this.runMatchingForUser(userId).catch(() => {});

    return savedFeedback;
  }

  /**
   * Retrieves data-driven AI matching market insights.
   */
  async getInsights(userId: string) {
    const profile = await this.profileAnalyzer.analyzeProfile(userId);

    const recs = await this.prisma.recommendation.findMany({
      where: { userId, isDismissed: false },
      include: {
        job: {
          include: { company: true },
        },
      },
    });

    const matchScores = await this.prisma.matchScore.findMany({
      where: { userId },
    });

    const strongMatchesCount = matchScores.filter((ms) => ms.overallScore >= 80).length;

    // Determine strongest category
    const categoryCounts: Record<string, number> = {};
    for (const score of matchScores) {
      if (score.overallScore >= 70) {
        const job = recs.find((r) => r.jobId === score.jobId)?.job;
        if (job) {
          const normalizedJob = this.jobAnalyzer.normalizeJobData(job);
          const cat = normalizedJob.roleCategory;
          categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1;
        }
      }
    }

    let strongestCategory = 'Software Engineering';
    let maxCount = 0;
    for (const [cat, count] of Object.entries(categoryCounts)) {
      if (count > maxCount) {
        maxCount = count;
        strongestCategory = cat;
      }
    }

    // Determine missing skills gap count
    const missingSkillCounts: Record<string, number> = {};
    for (const score of matchScores) {
      if (score.overallScore >= 60) {
        const job = recs.find((r) => r.jobId === score.jobId)?.job;
        if (job) {
          const normalizedJob = this.jobAnalyzer.normalizeJobData(job);
          const missing = normalizedJob.requiredSkills.filter(
            (rs) => !profile.skills.some((us) => us.toLowerCase() === rs.toLowerCase()),
          );
          for (const s of missing) {
            missingSkillCounts[s] = (missingSkillCounts[s] ?? 0) + 1;
          }
        }
      }
    }

    let topMissingSkill = 'SQL';
    let maxMissingCount = 0;
    for (const [skill, count] of Object.entries(missingSkillCounts)) {
      if (count > maxMissingCount) {
        maxMissingCount = count;
        topMissingSkill = skill;
      }
    }

    const insights = [
      `You have ${strongMatchesCount} strong matches this week.`,
      `${strongestCategory} internships are currently your strongest category.`,
      `Adding ${topMissingSkill} to your profile could increase your matches.`,
    ];

    return {
      insights,
      strongMatchesCount,
      strongestCategory,
      suggestedSkillUpgrade: topMissingSkill,
    };
  }

  private async clearUserMatchCache(userId: string): Promise<void> {
    try {
      const client = this.redis.getClient();
      if (!client) return;
      const keys = await client.keys(`match_score:${userId}:*`);
      if (keys.length > 0) {
        await client.del(...keys);
      }
    } catch (err) {
      this.logger.error(`Failed to clear cache for user ${userId}:`, err);
    }
  }
}
