import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RecommendationPriority, RecommendationType } from '@prisma/client';

import type { MatchResult } from '../providers/matching-provider.interface';
import { IMatchingProvider, MATCHING_PROVIDER } from '../providers/matching-provider.interface';

import type { NormalizedJob } from './job-analyzer.service';
import type { NormalizedProfile } from './profile-analyzer.service';

export interface EvaluatedRecommendation {
  overallScore: number;
  skillScore: number;
  educationScore: number;
  locationScore: number;
  cgpaScore: number;
  companyPreferenceScore: number;
  stipendScore: number;
  experienceScore: number;
  careerGoalScore: number;
  freshnessScore: number;
  behavioralScore: number;
  confidenceScore: number;
  recommendationType: RecommendationType;
  priority: RecommendationPriority;
  reasons: Array<{ reasonType: string; description: string; weight: number }>;
  isEligible: boolean;
  ineligibilityReason?: string | undefined;
  missingSkills?: string[] | undefined;
}

@Injectable()
export class ScoringEngineService {
  private readonly logger = new Logger(ScoringEngineService.name);

  constructor(
    @Inject(MATCHING_PROVIDER)
    private readonly matchingProvider: IMatchingProvider,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Evaluates match between profile and job, returning scores, recommendation type, priority, and reasons.
   */
  async evaluateMatch(
    profile: NormalizedProfile,
    job: NormalizedJob,
  ): Promise<EvaluatedRecommendation> {
    const matchResult: MatchResult = await this.matchingProvider.calculateMatch(profile, job);

    const recommendationType = this.classifyRecommendationType(matchResult.overallScore);
    const priority = this.classifyPriority(matchResult.overallScore);

    this.logger.debug(
      `Job ${job.jobId} matched with user ${profile.userId}: Score=${matchResult.overallScore}, Type=${recommendationType}, Priority=${priority}`,
    );

    return {
      overallScore: matchResult.overallScore,
      skillScore: matchResult.skillScore,
      educationScore: matchResult.educationScore,
      locationScore: matchResult.locationScore,
      cgpaScore: matchResult.cgpaScore,
      companyPreferenceScore: matchResult.companyPreferenceScore,
      stipendScore: matchResult.stipendScore,
      experienceScore: matchResult.experienceScore,
      careerGoalScore: matchResult.careerGoalScore,
      freshnessScore: matchResult.freshnessScore,
      behavioralScore: matchResult.behavioralScore,
      confidenceScore: matchResult.confidenceScore,
      recommendationType,
      priority,
      reasons: matchResult.reasons,
      isEligible: matchResult.isEligible,
      ineligibilityReason: matchResult.ineligibilityReason,
      missingSkills: matchResult.missingSkills,
    };
  }

  private classifyRecommendationType(score: number): RecommendationType {
    const thresholds = this.configService.get('matching.thresholds') ?? {
      perfectMatch: 90,
      strongMatch: 80,
      goodMatch: 70,
      explore: 50,
    };

    if (score >= thresholds.perfectMatch) return RecommendationType.PERFECT_MATCH;
    if (score >= thresholds.strongMatch) return RecommendationType.STRONG_MATCH;
    if (score >= thresholds.goodMatch) return RecommendationType.GOOD_MATCH;
    if (score >= thresholds.explore) return RecommendationType.EXPLORE;
    return RecommendationType.LOW_RELEVANCE;
  }

  private classifyPriority(score: number): RecommendationPriority {
    const priorityThresholds = this.configService.get('matching.priorityThresholds') ?? {
      high: 80,
      medium: 60,
    };

    if (score >= priorityThresholds.high) return RecommendationPriority.HIGH;
    if (score >= priorityThresholds.medium) return RecommendationPriority.MEDIUM;
    return RecommendationPriority.LOW;
  }
}
