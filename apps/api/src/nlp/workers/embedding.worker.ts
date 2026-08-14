import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { EntityType } from '@prisma/client';
import { Job } from 'bullmq';

import { EMBEDDING_QUEUE } from '../../queues/queue.constants';
import { EmbeddingService } from '../services/embedding.service';

export interface EmbeddingJobData {
  entityType: EntityType;
  entityId: string;
  rawText: string;
}

@Processor(EMBEDDING_QUEUE, { concurrency: 5 }) // Process up to 5 concurrent embedding jobs
export class EmbeddingWorker extends WorkerHost {
  private readonly logger = new Logger(EmbeddingWorker.name);

  constructor(private embeddingService: EmbeddingService) {
    super();
  }

  async process(job: Job<EmbeddingJobData>): Promise<void> {
    const { entityType, entityId, rawText } = job.data;
    this.logger.debug(`Processing embedding job for ${entityType} ${entityId}`);

    if (!rawText || rawText.trim().length === 0) {
      this.logger.warn(`Skipping embedding for ${entityType} ${entityId} because text is empty.`);
      return;
    }

    try {
      await this.embeddingService.getOrGenerateEmbedding(entityType, entityId, rawText);
    } catch (error) {
      this.logger.error(`Error processing embedding job ${job.id}`, error);
      throw error;
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Embedding job ${job.id} failed`, error);
  }
}
