/**
 * OutcomeAggregationProcessor
 *
 * BullMQ processor for background outcome aggregation jobs.
 *
 * Job types:
 *  - PLATFORM_FUNNEL_DAILY   — compute platform funnel snapshot (daily)
 *  - PLATFORM_FUNNEL_WEEKLY  — compute platform funnel snapshot (weekly)
 *  - PLATFORM_FUNNEL_MONTHLY — compute platform funnel snapshot (monthly)
 *  - BENCHMARK_RECOMPUTE     — recompute platform benchmarks
 *  - DATA_QUALITY_VALIDATION — run data quality validation
 *  - USER_FUNNEL             — compute snapshot for single user (on-demand)
 *  - ORG_ANALYTICS           — compute snapshot for organization
 */
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { OutcomeEntityType, OutcomeSnapshotPeriod } from '@prisma/client';

import { OUTCOME_AGGREGATION_QUEUE } from '../../queues/queue.constants';
import { OutcomeAggregationService } from '../services/outcome-aggregation.service';
import { OutcomeTimeToStageService } from '../services/outcome-time-to-stage.service';
import { OutcomeSnapshotService } from '../services/outcome-snapshot.service';
import { OutcomeBenchmarkService } from '../services/outcome-benchmark.service';
import { OutcomeDataQualityService } from '../services/outcome-data-quality.service';

export const OUTCOME_JOB_TYPES = {
  PLATFORM_FUNNEL_DAILY: 'PLATFORM_FUNNEL_DAILY',
  PLATFORM_FUNNEL_WEEKLY: 'PLATFORM_FUNNEL_WEEKLY',
  PLATFORM_FUNNEL_MONTHLY: 'PLATFORM_FUNNEL_MONTHLY',
  BENCHMARK_RECOMPUTE: 'BENCHMARK_RECOMPUTE',
  DATA_QUALITY_VALIDATION: 'DATA_QUALITY_VALIDATION',
  USER_FUNNEL: 'USER_FUNNEL',
  ORG_ANALYTICS: 'ORG_ANALYTICS',
} as const;

@Processor(OUTCOME_AGGREGATION_QUEUE)
export class OutcomeAggregationProcessor extends WorkerHost {
  private readonly logger = new Logger(OutcomeAggregationProcessor.name);

  constructor(
    private readonly aggregation: OutcomeAggregationService,
    private readonly timeToStage: OutcomeTimeToStageService,
    private readonly snapshot: OutcomeSnapshotService,
    private readonly benchmark: OutcomeBenchmarkService,
    private readonly dqService: OutcomeDataQualityService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing outcome job: ${job.name} (id: ${job.id})`);

    try {
      switch (job.name) {
        case OUTCOME_JOB_TYPES.PLATFORM_FUNNEL_DAILY:
          await this.processPlatformFunnel(OutcomeSnapshotPeriod.DAILY);
          break;
        case OUTCOME_JOB_TYPES.PLATFORM_FUNNEL_WEEKLY:
          await this.processPlatformFunnel(OutcomeSnapshotPeriod.WEEKLY);
          break;
        case OUTCOME_JOB_TYPES.PLATFORM_FUNNEL_MONTHLY:
          await this.processPlatformFunnel(OutcomeSnapshotPeriod.MONTHLY);
          break;
        case OUTCOME_JOB_TYPES.BENCHMARK_RECOMPUTE:
          await this.benchmark.recomputeAll();
          break;
        case OUTCOME_JOB_TYPES.DATA_QUALITY_VALIDATION:
          await this.processDataQuality();
          break;
        default:
          this.logger.warn(`Unknown outcome job type: ${job.name}`);
      }
    } catch (err) {
      this.logger.error(`Outcome job ${job.name} failed: ${err}`);
      throw err; // Re-throw for BullMQ retry
    }
  }

  private async processPlatformFunnel(periodType: OutcomeSnapshotPeriod): Promise<void> {
    const { start, end } = this.snapshot.getPeriodBounds(periodType);

    // Compute funnel metrics
    const funnel = await this.aggregation.computePlatformFunnel(start, end);
    const timeData = await this.timeToStage.calculatePlatformWide(start, end);

    // Compute conversion rates from funnel stages
    const appliedStage = funnel.stages.find((s) => s.stage === 'Applied');
    const interviewStage = funnel.stages.find((s) => s.stage === 'Interview');
    const offerStage = funnel.stages.find((s) => s.stage === 'Offer');
    const hiredStage = funnel.stages.find((s) => s.stage === 'Hired');
    const viewedStage = funnel.stages.find((s) => s.stage === 'Opportunity Viewed');

    const applicationConversionRate =
      viewedStage && viewedStage.count > 0 && appliedStage
        ? appliedStage.count / viewedStage.count
        : null;

    // Get latest snapshot for trend
    const previous = await this.snapshot.getLatest(
      OutcomeEntityType.PLATFORM, null, null, periodType,
    );

    const trendDirection = this.snapshot.computeTrend(
      interviewStage?.conversionFromPrevious ?? null,
      previous?.interviewConversionRate ?? null,
    );

    const confidence = this.snapshot.computeConfidence(funnel.sampleSize);

    // Store snapshot
    await this.snapshot.upsert({
      entityType: OutcomeEntityType.PLATFORM,
      entityId: null,
      entityLabel: 'platform',
      periodType,
      periodStart: start,
      periodEnd: end,
      registeredCount: funnel.stages.find((s) => s.stage === 'Registered')?.count ?? 0,
      profileCompletedCount: funnel.stages.find((s) => s.stage === 'Profile Completed')?.count ?? 0,
      opportunityViewedCount: viewedStage?.count ?? 0,
      savedCount: funnel.stages.find((s) => s.stage === 'Saved')?.count ?? 0,
      appliedCount: appliedStage?.count ?? 0,
      assessmentCount: funnel.stages.find((s) => s.stage === 'Assessment')?.count ?? 0,
      interviewCount: interviewStage?.count ?? 0,
      offerCount: offerStage?.count ?? 0,
      hiredCount: hiredStage?.count ?? 0,
      applicationConversionRate,
      interviewConversionRate: interviewStage?.conversionFromPrevious ?? null,
      offerConversionRate: offerStage?.conversionFromPrevious ?? null,
      hireRate: hiredStage?.conversionFromPrevious ?? null,
      medianTimeToApplyHours: timeData.timeToApply.median,
      medianTimeToAssessmentHours: timeData.timeToAssessment.median,
      medianTimeToInterviewHours: timeData.timeToInterview.median,
      medianTimeToOfferHours: timeData.timeToOffer.median,
      medianTimeToHireHours: timeData.timeToHire.median,
      p75TimeToHireHours: timeData.timeToHire.p75,
      p90TimeToHireHours: timeData.timeToHire.p90,
      sampleSize: funnel.sampleSize,
      belowCohortThreshold: funnel.sampleSize < 10,
      trendDirection,
      confidence,
    });

    this.logger.log(`Platform funnel snapshot (${periodType}) stored for ${start.toISOString()}`);
  }

  private async processDataQuality(): Promise<void> {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 30);
    await this.dqService.runValidation(start, end);
  }
}
