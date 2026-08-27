import { Injectable, Logger, BadRequestException } from '@nestjs/common';

export interface QueueOverview {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  isPaused: boolean;
}

export interface FailedJobItem {
  id: string;
  queue: string;
  name: string;
  failedReason: string;
  attemptsMade: number;
  timestamp: Date;
  isIdempotent: boolean;
}

@Injectable()
export class JobOpsService {
  private readonly logger = new Logger(JobOpsService.name);

  async getQueuesOverview(): Promise<QueueOverview[]> {
    const queueNames = [
      'opportunity-scraper',
      'email-notifications',
      'push-notifications',
      'ai-processing',
      'analytics-aggregation',
    ];

    return queueNames.map((name) => ({
      name,
      waiting: Math.floor(Math.random() * 5),
      active: Math.floor(Math.random() * 3),
      completed: 1250 + Math.floor(Math.random() * 100),
      failed: Math.floor(Math.random() * 2),
      delayed: 0,
      isPaused: false,
    }));
  }

  async getFailedJobs(): Promise<FailedJobItem[]> {
    return [
      {
        id: 'job_fail_101',
        queue: 'opportunity-scraper',
        name: 'sync-greenhouse-board',
        failedReason: 'Target portal responded with 429 Too Many Requests',
        attemptsMade: 3,
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
        isIdempotent: true,
      },
      {
        id: 'job_fail_102',
        queue: 'email-notifications',
        name: 'send-weekly-summary',
        failedReason: 'SMTP connection timeout on secondary relay',
        attemptsMade: 2,
        timestamp: new Date(Date.now() - 1000 * 60 * 90),
        isIdempotent: true,
      },
    ];
  }

  async retryJob(queueName: string, jobId: string) {
    this.logger.log(`Admin requested retry for job ${jobId} in queue ${queueName}`);

    const safeQueues = ['opportunity-scraper', 'email-notifications', 'analytics-aggregation'];
    if (!safeQueues.includes(queueName)) {
      throw new BadRequestException(
        `Queue ${queueName} contains non-idempotent operations. Manual review required.`,
      );
    }

    return {
      success: true,
      message: `Job ${jobId} queued for retry in ${queueName}.`,
      retriedAt: new Date(),
    };
  }
}
