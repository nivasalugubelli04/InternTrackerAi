/**
 * OutcomeSchedulerService
 *
 * Cron-based scheduler that enqueues outcome aggregation jobs.
 *
 * Schedule:
 *  Daily   — 02:00 UTC — PLATFORM_FUNNEL_DAILY + DATA_QUALITY_VALIDATION
 *  Weekly  — Monday 03:00 UTC — PLATFORM_FUNNEL_WEEKLY
 *  Monthly — 1st 04:00 UTC — PLATFORM_FUNNEL_MONTHLY + BENCHMARK_RECOMPUTE
 */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Cron } from '@nestjs/schedule';

import { OUTCOME_AGGREGATION_QUEUE } from '../../queues/queue.constants';
import { OUTCOME_JOB_TYPES } from '../processors/outcome-aggregation.processor';

@Injectable()
export class OutcomeSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(OutcomeSchedulerService.name);

  constructor(
    @InjectQueue(OUTCOME_AGGREGATION_QUEUE) private readonly outcomeQueue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('OutcomeSchedulerService initialized.');
  }

  /** Daily at 02:00 UTC — daily funnel snapshot + data quality */
  @Cron('0 2 * * *', { name: 'outcome-daily' })
  async scheduleDailyAggregation(): Promise<void> {
    this.logger.log('Scheduling daily outcome aggregation...');
    await this.outcomeQueue.add(
      OUTCOME_JOB_TYPES.PLATFORM_FUNNEL_DAILY,
      {},
      { attempts: 3, backoff: { type: 'exponential', delay: 10000 } },
    );
    await this.outcomeQueue.add(
      OUTCOME_JOB_TYPES.DATA_QUALITY_VALIDATION,
      {},
      { attempts: 2 },
    );
  }

  /** Weekly — Monday 03:00 UTC */
  @Cron('0 3 * * 1', { name: 'outcome-weekly' })
  async scheduleWeeklyAggregation(): Promise<void> {
    this.logger.log('Scheduling weekly outcome aggregation...');
    await this.outcomeQueue.add(
      OUTCOME_JOB_TYPES.PLATFORM_FUNNEL_WEEKLY,
      {},
      { attempts: 3, backoff: { type: 'exponential', delay: 10000 } },
    );
  }

  /** Monthly — 1st of month 04:00 UTC */
  @Cron('0 4 1 * *', { name: 'outcome-monthly' })
  async scheduleMonthlyAggregation(): Promise<void> {
    this.logger.log('Scheduling monthly outcome aggregation + benchmark recompute...');
    await this.outcomeQueue.add(
      OUTCOME_JOB_TYPES.PLATFORM_FUNNEL_MONTHLY,
      {},
      { attempts: 3, backoff: { type: 'exponential', delay: 10000 } },
    );
    await this.outcomeQueue.add(
      OUTCOME_JOB_TYPES.BENCHMARK_RECOMPUTE,
      {},
      { attempts: 2 },
    );
  }

  /** Manual trigger — can be called by admin API */
  async triggerManualAggregation(jobType: keyof typeof OUTCOME_JOB_TYPES): Promise<void> {
    this.logger.log(`Manual trigger: ${jobType}`);
    await this.outcomeQueue.add(jobType, {}, { attempts: 2 });
  }
}
