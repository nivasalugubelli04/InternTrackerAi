import { Injectable, Logger } from '@nestjs/common';
import { DataQualityLevel, JobPostingStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

export interface DataQualityEvaluation {
  jobId: string;
  qualityScore: number;
  qualityLevel: DataQualityLevel;
  breakdown: {
    titleScore: number;
    descriptionScore: number;
    locationScore: number;
    urlValidityScore: number;
    skillsScore: number;
    deadlineScore: number;
    companyScore: number;
  };
  detectedIssues: string[];
}

export interface MarketDataQualitySummary {
  overallAverageQualityScore: number;
  totalJobsEvaluated: number;
  qualityLevelBreakdown: {
    highQualityCount: number;
    mediumQualityCount: number;
    lowQualityCount: number;
    highQualityPercentage: number;
    mediumQualityPercentage: number;
    lowQualityPercentage: number;
  };
  commonIssues: { issue: string; count: number }[];
  evaluatedAt: string;
}

@Injectable()
export class DataQualityService {
  private readonly logger = new Logger(DataQualityService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Evaluates quality of a single job posting.
   */
  evaluatePostingQuality(job: {
    id: string;
    title: string;
    description?: string | null;
    location?: string | null;
    applicationUrl: string;
    requirements: string[];
    deadline?: Date | null;
    company?: { name: string; website?: string | null; industry?: string | null } | null;
  }): DataQualityEvaluation {
    const detectedIssues: string[] = [];

    // 1. Title Score (weight: 15)
    let titleScore = 100;
    if (!job.title || job.title.trim().length < 5) {
      titleScore = 20;
      detectedIssues.push('Job title is too short or missing');
    } else if (job.title.includes('$$$') || job.title.includes('!!!')) {
      titleScore = 50;
      detectedIssues.push('Job title contains excessive punctuation');
    }

    // 2. Description Score (weight: 20)
    let descriptionScore = 100;
    const descLen = job.description ? job.description.trim().length : 0;
    if (descLen === 0) {
      descriptionScore = 0;
      detectedIssues.push('Job description is completely missing');
    } else if (descLen < 100) {
      descriptionScore = 40;
      detectedIssues.push('Job description is very brief (<100 characters)');
    } else if (descLen < 300) {
      descriptionScore = 75;
    }

    // 3. Location Score (weight: 10)
    let locationScore = 100;
    if (!job.location || job.location.trim().length === 0) {
      locationScore = 30;
      detectedIssues.push('Location is unspecified');
    }

    // 4. URL Validity Score (weight: 20)
    let urlValidityScore = 100;
    if (!job.applicationUrl) {
      urlValidityScore = 0;
      detectedIssues.push('Application URL is missing');
    } else {
      try {
        const parsed = new URL(job.applicationUrl);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          urlValidityScore = 20;
          detectedIssues.push('Application URL has invalid protocol');
        }
      } catch {
        urlValidityScore = 10;
        detectedIssues.push('Application URL is malformed');
      }
    }

    // 5. Skills Score (weight: 15)
    let skillsScore = 100;
    if (!job.requirements || job.requirements.length === 0) {
      skillsScore = 0;
      detectedIssues.push('No required skills extracted');
    } else if (job.requirements.length < 2) {
      skillsScore = 50;
      detectedIssues.push('Only 1 required skill extracted');
    }

    // 6. Deadline Score (weight: 10)
    let deadlineScore = 100;
    if (!job.deadline) {
      deadlineScore = 60; // neutral penalty for open-ended postings
    } else if (job.deadline < new Date()) {
      deadlineScore = 30;
      detectedIssues.push('Application deadline has already passed');
    }

    // 7. Company Score (weight: 10)
    let companyScore = 100;
    if (!job.company?.name) {
      companyScore = 20;
      detectedIssues.push('Company metadata missing');
    } else {
      let missingFields = 0;
      if (!job.company.website) missingFields++;
      if (!job.company.industry) missingFields++;
      if (missingFields === 1) companyScore = 80;
      if (missingFields === 2) companyScore = 60;
    }

    // Weighted composite score (0 to 100)
    const compositeScore = Math.round(
      titleScore * 0.15 +
        descriptionScore * 0.2 +
        locationScore * 0.1 +
        urlValidityScore * 0.2 +
        skillsScore * 0.15 +
        deadlineScore * 0.1 +
        companyScore * 0.1,
    );

    let qualityLevel: DataQualityLevel = DataQualityLevel.HIGH_QUALITY;
    if (compositeScore < 50) {
      qualityLevel = DataQualityLevel.LOW_QUALITY;
    } else if (compositeScore < 80) {
      qualityLevel = DataQualityLevel.MEDIUM_QUALITY;
    }

    return {
      jobId: job.id,
      qualityScore: compositeScore,
      qualityLevel,
      breakdown: {
        titleScore,
        descriptionScore,
        locationScore,
        urlValidityScore,
        skillsScore,
        deadlineScore,
        companyScore,
      },
      detectedIssues,
    };
  }

  /**
   * Evaluates all active job postings and persists results to DataQualityMetric table.
   */
  async evaluateAndPersistAllPostings(): Promise<MarketDataQualitySummary> {
    this.logger.debug('Evaluating and persisting all active job postings quality');
    const jobs = await this.prisma.jobPosting.findMany({
      where: { status: JobPostingStatus.ACTIVE },
      select: {
        id: true,
        title: true,
        description: true,
        location: true,
        applicationUrl: true,
        requirements: true,
        deadline: true,
        company: {
          select: { name: true, website: true, industry: true },
        },
      },
    });

    const evaluations: DataQualityEvaluation[] = [];
    const issueCounts = new Map<string, number>();

    for (const job of jobs) {
      const evalResult = this.evaluatePostingQuality(job);
      evaluations.push(evalResult);

      for (const issue of evalResult.detectedIssues) {
        issueCounts.set(issue, (issueCounts.get(issue) ?? 0) + 1);
      }

      // Upsert into DB
      await this.prisma.dataQualityMetric.upsert({
        where: { jobId: job.id },
        create: {
          jobId: job.id,
          qualityScore: evalResult.qualityScore,
          qualityLevel: evalResult.qualityLevel,
          titleScore: evalResult.breakdown.titleScore,
          descriptionScore: evalResult.breakdown.descriptionScore,
          locationScore: evalResult.breakdown.locationScore,
          urlValidityScore: evalResult.breakdown.urlValidityScore,
          skillsScore: evalResult.breakdown.skillsScore,
          deadlineScore: evalResult.breakdown.deadlineScore,
          companyScore: evalResult.breakdown.companyScore,
          issuesJson: evalResult.detectedIssues,
          evaluatedAt: new Date(),
        },
        update: {
          qualityScore: evalResult.qualityScore,
          qualityLevel: evalResult.qualityLevel,
          titleScore: evalResult.breakdown.titleScore,
          descriptionScore: evalResult.breakdown.descriptionScore,
          locationScore: evalResult.breakdown.locationScore,
          urlValidityScore: evalResult.breakdown.urlValidityScore,
          skillsScore: evalResult.breakdown.skillsScore,
          deadlineScore: evalResult.breakdown.deadlineScore,
          companyScore: evalResult.breakdown.companyScore,
          issuesJson: evalResult.detectedIssues,
          evaluatedAt: new Date(),
        },
      });
    }

    const total = evaluations.length;
    const high = evaluations.filter((e) => e.qualityLevel === DataQualityLevel.HIGH_QUALITY).length;
    const med = evaluations.filter(
      (e) => e.qualityLevel === DataQualityLevel.MEDIUM_QUALITY,
    ).length;
    const low = evaluations.filter((e) => e.qualityLevel === DataQualityLevel.LOW_QUALITY).length;

    const avgScore =
      total > 0 ? Math.round(evaluations.reduce((acc, e) => acc + e.qualityScore, 0) / total) : 100;

    const commonIssues = Array.from(issueCounts.entries())
      .map(([issue, count]) => ({ issue, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return {
      overallAverageQualityScore: avgScore,
      totalJobsEvaluated: total,
      qualityLevelBreakdown: {
        highQualityCount: high,
        mediumQualityCount: med,
        lowQualityCount: low,
        highQualityPercentage: total > 0 ? Math.round((high / total) * 1000) / 10 : 0,
        mediumQualityPercentage: total > 0 ? Math.round((med / total) * 1000) / 10 : 0,
        lowQualityPercentage: total > 0 ? Math.round((low / total) * 1000) / 10 : 0,
      },
      commonIssues,
      evaluatedAt: new Date().toISOString(),
    };
  }

  /**
   * Retrieves latest data quality summary from database.
   */
  async getDataQualitySummary(): Promise<MarketDataQualitySummary> {
    const metrics = await this.prisma.dataQualityMetric.findMany();
    if (metrics.length === 0) {
      return this.evaluateAndPersistAllPostings();
    }

    const total = metrics.length;
    const high = metrics.filter((m) => m.qualityLevel === DataQualityLevel.HIGH_QUALITY).length;
    const med = metrics.filter((m) => m.qualityLevel === DataQualityLevel.MEDIUM_QUALITY).length;
    const low = metrics.filter((m) => m.qualityLevel === DataQualityLevel.LOW_QUALITY).length;
    const avgScore = Math.round(metrics.reduce((a, b) => a + b.qualityScore, 0) / total);

    return {
      overallAverageQualityScore: avgScore,
      totalJobsEvaluated: total,
      qualityLevelBreakdown: {
        highQualityCount: high,
        mediumQualityCount: med,
        lowQualityCount: low,
        highQualityPercentage: Math.round((high / total) * 1000) / 10,
        mediumQualityPercentage: Math.round((med / total) * 1000) / 10,
        lowQualityPercentage: Math.round((low / total) * 1000) / 10,
      },
      commonIssues: [],
      evaluatedAt: new Date().toISOString(),
    };
  }
}
