import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DeadLetterQueueService {
  private readonly logger = new Logger(DeadLetterQueueService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Pushes a failed job to the Dead Letter Queue database store.
   */
  async addJobToDlq(
    queueName: string,
    jobId: string,
    jobType: string,
    attempts: number,
    error: string,
    payload: any,
    component: string,
  ): Promise<any> {
    this.logger.warn(`Moving failed job ${jobId} from queue ${queueName} to DLQ database log.`);
    return this.prisma.deadLetterJob.create({
      data: {
        queueName,
        jobId,
        jobType,
        attempts,
        error,
        payload: payload || {},
        component,
      },
    });
  }

  /**
   * Retrieves all dead letter jobs logged in PostgreSQL database.
   */
  async getDlqJobs() {
    return this.prisma.deadLetterJob.findMany({
      orderBy: { timestamp: 'desc' },
    });
  }
}
