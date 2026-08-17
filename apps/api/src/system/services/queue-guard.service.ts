import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';

import { RedisService } from '../../redis/redis.service';

export interface QueueTelemetry {
  queueName: string;
  depth: number;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  oldestWaitingJobAgeMs: number;
}

@Injectable()
export class QueueGuardService {
  private readonly logger = new Logger(QueueGuardService.name);
  private queueNames = [
    'scrape',
    'parser',
    'cleanup',
    'health',
    'notification',
    'email',
    'push',
    'sms',
    'digest',
    'dead-letter',
  ];

  constructor(private readonly redis: RedisService) {}

  /**
   * Evaluates size and oldest wait latency across all BullMQ queues.
   */
  async getQueuesStatus(): Promise<QueueTelemetry[]> {
    const connection = this.redis.getClient();
    const telemetries: QueueTelemetry[] = [];

    for (const name of this.queueNames) {
      try {
        const q = new Queue(name, { connection });
        const counts = await q.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');

        // Find oldest waiting job delay
        const waitingJobs = await q.getJobs(['waiting'], 0, 0, true);
        const oldestWaitingJobAgeMs =
          waitingJobs.length > 0 && waitingJobs[0]?.timestamp
            ? Date.now() - waitingJobs[0].timestamp
            : 0;

        const waitingCount = counts['waiting'] || 0;
        const activeCount = counts['active'] || 0;
        const depth = waitingCount + activeCount;

        telemetries.push({
          queueName: name,
          depth,
          waiting: waitingCount,
          active: activeCount,
          completed: counts['completed'] || 0,
          failed: counts['failed'] || 0,
          delayed: counts['delayed'] || 0,
          oldestWaitingJobAgeMs,
        });

        await q.close();
      } catch (e) {
        this.logger.error(
          `Error querying BullMQ queue ${name}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    return telemetries;
  }
}
