import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { Gauge } from 'prom-client';

import { RedisService } from '../../redis/redis.service';

@Injectable()
export class QueueMetricsService implements OnModuleInit, OnModuleDestroy {
  private queues: Queue[] = [];
  private pollInterval?: NodeJS.Timeout;

  private queueWaiting: Gauge<string>;
  private queueActive: Gauge<string>;
  private queueCompleted: Gauge<string>;
  private queueFailed: Gauge<string>;
  private queueDelayed: Gauge<string>;

  constructor(private readonly redis: RedisService) {
    this.queueWaiting = new Gauge({
      name: 'bullmq_queue_waiting',
      help: 'Waiting jobs',
      labelNames: ['queue'],
    });
    this.queueActive = new Gauge({
      name: 'bullmq_queue_active',
      help: 'Active jobs',
      labelNames: ['queue'],
    });
    this.queueCompleted = new Gauge({
      name: 'bullmq_queue_completed',
      help: 'Completed jobs',
      labelNames: ['queue'],
    });
    this.queueFailed = new Gauge({
      name: 'bullmq_queue_failed',
      help: 'Failed jobs',
      labelNames: ['queue'],
    });
    this.queueDelayed = new Gauge({
      name: 'bullmq_queue_delayed',
      help: 'Delayed jobs',
      labelNames: ['queue'],
    });
  }

  async onModuleInit() {
    const queueNames = [
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

    const connection = this.redis.getClient();
    this.queues = queueNames.map((name) => new Queue(name, { connection }));

    this.pollInterval = setInterval(async () => {
      try {
        await Promise.all(
          this.queues.map(async (q) => {
            const counts = await q.getJobCounts(
              'waiting',
              'active',
              'completed',
              'failed',
              'delayed',
            );
            this.queueWaiting.set({ queue: q.name }, counts['waiting'] || 0);
            this.queueActive.set({ queue: q.name }, counts['active'] || 0);
            this.queueCompleted.set({ queue: q.name }, counts['completed'] || 0);
            this.queueFailed.set({ queue: q.name }, counts['failed'] || 0);
            this.queueDelayed.set({ queue: q.name }, counts['delayed'] || 0);
          }),
        );
      } catch (e) {
        // Ignored
      }
    }, 15000);
  }

  onModuleDestroy() {
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.queues.forEach((q) => q.close());
  }
}
