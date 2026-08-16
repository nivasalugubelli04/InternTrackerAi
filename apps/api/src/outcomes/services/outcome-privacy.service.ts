/**
 * OutcomePrivacyService
 *
 * Enforces minimum cohort-size protection on every aggregated outcome metric.
 * Any segment with fewer than minCohortSize users returns INSUFFICIENT_COHORT
 * rather than exposing potentially identifying data.
 *
 * Configuration:
 *   OUTCOME_MIN_COHORT_SIZE  (env) — default 10
 */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface CohortGuardResult {
  allowed: boolean;
  sampleSize: number;
  minCohortSize: number;
}

export const INSUFFICIENT_COHORT_RESPONSE = {
  status: 'INSUFFICIENT_COHORT' as const,
  message:
    'This segment does not meet the minimum cohort size required to display outcome metrics.',
};

@Injectable()
export class OutcomePrivacyService {
  private readonly minCohortSize: number;

  constructor(private readonly config: ConfigService) {
    this.minCohortSize = parseInt(
      this.config.get<string>('OUTCOME_MIN_COHORT_SIZE', '10'),
      10,
    );
  }

  /**
   * Check whether a given sampleSize passes the privacy threshold.
   * Returns {allowed: false} when below threshold.
   */
  checkCohort(sampleSize: number): CohortGuardResult {
    return {
      allowed: sampleSize >= this.minCohortSize,
      sampleSize,
      minCohortSize: this.minCohortSize,
    };
  }

  /**
   * Wrap a metric map — null out any field whose sample size is below threshold.
   * Use this when you have per-segment breakdowns.
   */
  guardBreakdown<T extends { sampleSize: number }>(
    items: T[],
  ): Array<T | { status: 'INSUFFICIENT_COHORT'; sampleSize: number; minCohortSize: number }> {
    return items.map((item) => {
      if (item.sampleSize < this.minCohortSize) {
        return {
          status: 'INSUFFICIENT_COHORT' as const,
          sampleSize: item.sampleSize,
          minCohortSize: this.minCohortSize,
        };
      }
      return item;
    });
  }

  getMinCohortSize(): number {
    return this.minCohortSize;
  }
}
