import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';

import { PrismaService } from '../../prisma/prisma.service';
import { CAREER_CENTER_QUEUE } from '../../queues/queue.constants';
import { ActionOrchestrationService } from '../services/action-orchestration.service';
import { EventProcessingService } from '../services/event-processing.service';

export interface CareerCenterJobPayload {
  userId?: string;
  jobType: 'DAILY_PLAN' | 'CLEANUP_ACTIONS' | 'PROCESS_EVENT';
  eventData?: any;
}

@Processor(CAREER_CENTER_QUEUE)
export class CareerCenterProcessor extends WorkerHost {
  private readonly logger = new Logger(CareerCenterProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly actionOrchestrator: ActionOrchestrationService,
    private readonly eventProcessing: EventProcessingService,
  ) {
    super();
  }

  async process(job: Job<CareerCenterJobPayload>): Promise<any> {
    const { userId, jobType } = job.data;
    this.logger.log(`Processing BullMQ Career Center job ${job.id} of type ${jobType}`);

    if (jobType === 'PROCESS_EVENT') {
      if (job.data.eventData) {
        return this.eventProcessing.processEvent(job.data.eventData);
      }
      return { success: false, reason: 'Missing eventData payload' };
    }

    if (jobType === 'CLEANUP_ACTIONS') {
      const activeUsers = await this.prisma.user.findMany({
        where: { isActive: true },
        select: { id: true },
      });

      let count = 0;
      for (const u of activeUsers) {
        await (this.actionOrchestrator as any).cleanupStaleActions(u.id);
        count++;
      }

      this.logger.log(`Cleaned up expired actions for ${count} users.`);
      return { success: true, processedCount: count };
    }

    if (jobType === 'DAILY_PLAN') {
      if (userId) {
        const actions = await this.actionOrchestrator.getPrioritizedActions(userId);
        return { success: true, userId, actionsCount: actions.length };
      } else {
        // Pre-aggregate for all active users
        const activeUsers = await this.prisma.user.findMany({
          where: { isActive: true },
          select: { id: true },
        });

        let count = 0;
        for (const u of activeUsers) {
          await this.actionOrchestrator.getPrioritizedActions(u.id);
          count++;
        }

        this.logger.log(`Pre-generated action plans for ${count} users.`);
        return { success: true, processedCount: count };
      }
    }

    return { success: false, reason: 'Unknown job type' };
  }
}
