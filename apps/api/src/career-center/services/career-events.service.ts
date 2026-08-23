import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';

import { CAREER_CENTER_QUEUE } from '../../queues/queue.constants';

export interface PublishEventDto {
  userId: string;
  eventType: string;
  source: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, any>;
  importance?: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

@Injectable()
export class CareerEventsService {
  private readonly logger = new Logger(CareerEventsService.name);

  constructor(@InjectQueue(CAREER_CENTER_QUEUE) private readonly careerQueue: Queue) {}

  async publish(event: PublishEventDto): Promise<void> {
    this.logger.log(`Publishing career event: ${event.eventType} for user: ${event.userId}`);

    await this.careerQueue.add(
      'PROCESS_EVENT',
      {
        jobType: 'PROCESS_EVENT',
        userId: event.userId,
        eventData: {
          ...event,
          timestamp: new Date(),
        },
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
      },
    );
  }
}
