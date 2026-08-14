import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { MarketMetricCategory } from '@prisma/client';
import { Job } from 'bullmq';

import { PrismaService } from '../../prisma/prisma.service';
import { MARKET_QUEUE } from '../../queues/queue.constants';
import { DataQualityService } from '../services/data-quality.service';
import { MarketAggregationService } from '../services/market-aggregation.service';
import { RoleAnalyticsService } from '../services/role-analytics.service';
import { SkillDemandService } from '../services/skill-demand.service';
import { TrendDetectionService } from '../services/trend-detection.service';

export interface MarketJobData {
  jobType:
    | 'FULL_RECALCULATE'
    | 'AGGREGATE_OVERVIEW'
    | 'AGGREGATE_SKILLS'
    | 'AGGREGATE_ROLES'
    | 'DATA_QUALITY';
  triggeredBy?: string;
}

@Processor(MARKET_QUEUE, { concurrency: 2 })
export class MarketAggregationProcessor extends WorkerHost {
  private readonly logger = new Logger(MarketAggregationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly marketAggregationService: MarketAggregationService,
    private readonly skillDemandService: SkillDemandService,
    private readonly roleAnalyticsService: RoleAnalyticsService,
    private readonly dataQualityService: DataQualityService,
    private readonly trendDetectionService: TrendDetectionService,
  ) {
    super();
  }

  async process(job: Job<MarketJobData>): Promise<void> {
    const { jobType, triggeredBy } = job.data;
    this.logger.log(
      `Processing market aggregation job: ${jobType} (triggeredBy: ${triggeredBy ?? 'cron'})`,
    );

    const now = new Date();
    const periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    try {
      if (jobType === 'FULL_RECALCULATE' || jobType === 'AGGREGATE_OVERVIEW') {
        const overview = await this.marketAggregationService.computeMarketOverview();

        // Save MarketMetric entries
        await this.prisma.marketMetric.createMany({
          data: [
            {
              category: MarketMetricCategory.OVERVIEW,
              metricKey: 'total_active_internships',
              metricValue: overview.totalActiveInternships,
              sampleSize: overview.totalActiveInternships,
              periodStart,
              periodEnd: now,
            },
            {
              category: MarketMetricCategory.OVERVIEW,
              metricKey: 'active_companies_count',
              metricValue: overview.activelyHiringCompaniesCount,
              sampleSize: overview.totalActiveInternships,
              periodStart,
              periodEnd: now,
            },
          ],
        });
      }

      if (jobType === 'FULL_RECALCULATE' || jobType === 'AGGREGATE_SKILLS') {
        const skillAnalysis = await this.skillDemandService.getSkillDemandAnalysis();

        // Persist SkillDemandSnapshot for top skills
        for (const item of skillAnalysis.topDemandedSkills.slice(0, 30)) {
          await this.prisma.skillDemandSnapshot.create({
            data: {
              skillName: item.skill,
              normalizedSkill: item.skill.toLowerCase().trim(),
              demandCount: item.count,
              growthRate: item.growthRate ?? 0,
              periodStart,
              periodEnd: now,
              sampleSize: item.sampleSize,
            },
          });

          // Evaluate and record trend
          const trend = this.trendDetectionService.evaluateTrend(
            'SKILL',
            item.skill,
            item.count,
            Math.round(item.count / ((100 + (item.growthRate ?? 0)) / 100)),
            30,
          );
          await this.trendDetectionService.recordTrendMetric(trend);
        }
      }

      if (jobType === 'FULL_RECALCULATE' || jobType === 'AGGREGATE_ROLES') {
        const roleAnalysis = await this.roleAnalyticsService.getRoleAnalytics();

        for (const role of roleAnalysis.roles) {
          await this.prisma.roleDemandSnapshot.create({
            data: {
              roleCategory: role.roleCategory,
              opportunityCount: role.opportunityCount,
              growthRate: role.growthRate ?? 0,
              avgMatchScore: role.averageMatchScore,
              applicationCount: role.totalApplications,
              topSkillsJson: role.topSkills,
              periodStart,
              periodEnd: now,
              sampleSize: role.opportunityCount,
            },
          });

          const trend = this.trendDetectionService.evaluateTrend(
            'ROLE',
            role.roleCategory,
            role.opportunityCount,
            Math.round(role.opportunityCount / ((100 + (role.growthRate ?? 0)) / 100)),
            30,
          );
          await this.trendDetectionService.recordTrendMetric(trend);
        }
      }

      if (jobType === 'FULL_RECALCULATE' || jobType === 'DATA_QUALITY') {
        await this.dataQualityService.evaluateAndPersistAllPostings();
      }

      this.logger.log(`Market aggregation job ${jobType} completed successfully.`);
    } catch (err) {
      this.logger.error(
        `Market aggregation job ${job.id} failed: ${(err as Error).message}`,
        (err as Error).stack,
      );
      throw err;
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error): void {
    this.logger.error(`Market aggregation job ${job.id} failed with error: ${error.message}`);
  }
}
