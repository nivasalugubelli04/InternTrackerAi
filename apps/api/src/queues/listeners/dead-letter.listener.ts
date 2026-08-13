import { OnQueueEvent, QueueEventsHost, QueueEventsListener } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';

import { SCRAPE_QUEUE } from '../queue.constants';

@QueueEventsListener(SCRAPE_QUEUE)
@Injectable()
export class DeadLetterListener extends QueueEventsHost {
  private readonly logger = new Logger(DeadLetterListener.name);

  @OnQueueEvent('failed')
  onFailed(args: { jobId: string; failedReason: string; prev?: string }) {
    // In BullMQ, jobs that fail after all attempts remain in the 'failed' state in Redis
    // We capture them here for Dead Letter Queue (DLQ) processing.
    this.logger.error(
      {
        action: 'DLQ_EVENT',
        jobId: args.jobId,
        queue: SCRAPE_QUEUE,
        reason: args.failedReason,
      },
      `Job ${args.jobId} failed in queue ${SCRAPE_QUEUE} after retries. Moved to DLQ.`,
    );
  }
}
