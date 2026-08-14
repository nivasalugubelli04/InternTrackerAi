import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Queue } from 'bullmq';

import { MARKET_QUEUE } from '../../queues/queue.constants';
import type { MarketJobData } from '../queues/market-aggregation.processor';

@Injectable()
export class MarketCronService {
  private readonly logger = new Logger(MarketCronService.name);

  constructor(@InjectQueue(MARKET_QUEUE) private readonly marketQueue: Queue<MarketJobData>) {}

  /**
   * Daily aggregate calculation at 03:00 AM server time.
   */
  @Cron('0 3 * * *', { name: 'daily-market-aggregation-cron' })
  async triggerDailyAggregation(): Promise<void> {
    this.logger.log('Triggering daily market aggregation BullMQ job');

    try {
      await this.marketQueue.add(
        'daily-market-recalculate',
        {
          jobType: 'FULL_RECALCULATE',
          triggeredBy: 'cron:daily-market-aggregation',
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
        },
      );
    } catch (err) {
      this.logger.error(`Failed to dispatch daily market aggregation: ${(err as Error).message}`);
    }
  }
}
