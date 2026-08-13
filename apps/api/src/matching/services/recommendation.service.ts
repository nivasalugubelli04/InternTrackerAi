import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { RecommendationPriority, RecommendationType, RecommendationFeedbackType } from '@prisma/client';

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

    let highestScore = 0;
    let recommendationsCount = 0;

    // Evaluate matching score for each job posting
    const evaluatedResults = await Promise.all(
      activeJobs.map(async (job) => {
        const normalizedJob = this.jobAnalyzer.normalizeJobData(job);
        const evalResult = await this.scoringEngine.evaluateMatch(profile, normalizedJob);
        
        // Phase 13: Fetch Semantic Score
        const semanticScore = await this.semanticMatching.computeSemanticScore(userId, job.id);
        
        // Blend Scores (Configurable later, hardcoded for now 60/40)
        if (semanticScore !== null) {
          evalResult.overallScore = Math.round((evalResult.overallScore * 0.6) + (semanticScore * 0.4));
        }

        return {
          jobId: job.id,
          evalResult,
          semanticScore,
        };
      }),
    );

    // Sort by overallScore descending to assign rank
    evaluatedResults.sort((a, b) => b.evalResult.overallScore - a.evalResult.overallScore);

    // Persist scores and recommendations in database
    for (let i = 0; i < evaluatedResults.length; i++) {
      const item = evaluatedResults[i];
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

    const formattedData = items.map((item) => ({
      ...item,
      matchScore: scoreMap.get(item.jobId) ?? null,
    }));

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

    return {
      ...recommendation,
      isViewed: true,
      matchScore,
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
    return this.prisma.recommendationFeedback.create({
      data: {
        userId,
        jobId,
        feedback,
      },
    });
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
