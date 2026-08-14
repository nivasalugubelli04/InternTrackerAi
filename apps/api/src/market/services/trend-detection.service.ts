import { Injectable, Logger } from '@nestjs/common';
import { TrendDirection } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

export interface TrendEvaluationResult {
  entityType: string;
  entityId: string;
  currentCount: number;
  previousCount: number;
  growthRate: number;
  direction: TrendDirection;
  sampleSize: number;
  confidence: number; // 0.0 to 1.0
  periodDays: number;
  explanation: string;
  hasSufficientData: boolean;
}

@Injectable()
export class TrendDetectionService {
  private readonly logger = new Logger(TrendDetectionService.name);

  // Explicit thresholds to ensure trends are statistically meaningful
  private readonly MIN_SAMPLE_SIZE_FOR_TREND = 5;
  private readonly RISING_THRESHOLD_PERCENTAGE = 15.0;
  private readonly DECLINING_THRESHOLD_PERCENTAGE = -15.0;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Evaluates a trend between two time periods with explicit sufficiency thresholds.
   */
  evaluateTrend(
    entityType: string,
    entityId: string,
    currentCount: number,
    previousCount: number,
    periodDays = 30,
  ): TrendEvaluationResult {
    this.logger.debug(`Evaluating trend for ${entityType} ${entityId}`);
    const sampleSize = currentCount + previousCount;

    // 1. Data Sufficiency Check
    if (sampleSize < this.MIN_SAMPLE_SIZE_FOR_TREND) {
      return {
        entityType,
        entityId,
        currentCount,
        previousCount,
        growthRate: 0,
        direction: TrendDirection.INSUFFICIENT_DATA,
        sampleSize,
        confidence: Math.round((sampleSize / this.MIN_SAMPLE_SIZE_FOR_TREND) * 40) / 100, // < 0.4
        periodDays,
        explanation: `Insufficient historical data to determine a trend for ${entityId} (sample size: ${sampleSize}).`,
        hasSufficientData: false,
      };
    }

    // 2. Growth Rate Calculation
    let growthRate = 0;
    if (previousCount === 0) {
      growthRate = 100.0;
    } else {
      growthRate = Math.round(((currentCount - previousCount) / previousCount) * 1000) / 10;
    }

    // 3. Direction Classification with Thresholds
    let direction: TrendDirection = TrendDirection.STABLE;
    if (growthRate >= this.RISING_THRESHOLD_PERCENTAGE) {
      direction = TrendDirection.RISING;
    } else if (growthRate <= this.DECLINING_THRESHOLD_PERCENTAGE) {
      direction = TrendDirection.DECLINING;
    } else {
      direction = TrendDirection.STABLE;
    }

    // 4. Confidence Score (scales with sample size up to 20 samples)
    const confidence = Math.min(1.0, Math.round((sampleSize / 20) * 100) / 100);

    // 5. Descriptive Explanation
    let explanation = '';
    if (direction === TrendDirection.RISING) {
      explanation = `${entityId} showed strong growth (+${growthRate}%) over the last ${periodDays} days across ${sampleSize} measured postings.`;
    } else if (direction === TrendDirection.DECLINING) {
      explanation = `${entityId} postings decreased by ${Math.abs(growthRate)}% over the last ${periodDays} days.`;
    } else {
      explanation = `${entityId} postings remained stable with a ${growthRate >= 0 ? '+' : ''}${growthRate}% variation over the last ${periodDays} days.`;
    }

    return {
      entityType,
      entityId,
      currentCount,
      previousCount,
      growthRate,
      direction,
      sampleSize,
      confidence,
      periodDays,
      explanation,
      hasSufficientData: true,
    };
  }

  /**
   * Persists evaluated trend metrics to the database.
   */
  async recordTrendMetric(result: TrendEvaluationResult): Promise<void> {
    const now = new Date();
    const periodStart = new Date(now.getTime() - result.periodDays * 24 * 60 * 60 * 1000);

    await this.prisma.trendMetric.create({
      data: {
        entityType: result.entityType,
        entityId: result.entityId,
        currentCount: result.currentCount,
        previousCount: result.previousCount,
        growthRate: result.growthRate,
        direction: result.direction,
        periodDays: result.periodDays,
        periodStart,
        periodEnd: now,
        sampleSize: result.sampleSize,
        confidence: result.confidence,
      },
    });
  }

  /**
   * Fetches latest recorded trend metrics grouped by entity type.
   */
  async getLatestTrends(): Promise<{
    risingSkills: TrendEvaluationResult[];
    risingRoles: TrendEvaluationResult[];
    risingLocations: TrendEvaluationResult[];
  }> {
    const recentMetrics = await this.prisma.trendMetric.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const format = (items: typeof recentMetrics): TrendEvaluationResult[] =>
      items.map((m) => ({
        entityType: m.entityType,
        entityId: m.entityId,
        currentCount: m.currentCount,
        previousCount: m.previousCount,
        growthRate: m.growthRate,
        direction: m.direction,
        sampleSize: m.sampleSize,
        confidence: m.confidence,
        periodDays: m.periodDays,
        explanation: `${m.entityId} is ${m.direction.toLowerCase()} with ${m.growthRate >= 0 ? '+' : ''}${m.growthRate}% change.`,
        hasSufficientData: m.direction !== TrendDirection.INSUFFICIENT_DATA,
      }));

    return {
      risingSkills: format(
        recentMetrics.filter(
          (m) => m.entityType === 'SKILL' && m.direction === TrendDirection.RISING,
        ),
      ).slice(0, 10),
      risingRoles: format(
        recentMetrics.filter(
          (m) => m.entityType === 'ROLE' && m.direction === TrendDirection.RISING,
        ),
      ).slice(0, 5),
      risingLocations: format(
        recentMetrics.filter(
          (m) => m.entityType === 'LOCATION' && m.direction === TrendDirection.RISING,
        ),
      ).slice(0, 5),
    };
  }
}
