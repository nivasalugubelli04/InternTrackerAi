import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { EntityType } from '@prisma/client';
import { Queue } from 'bullmq';

import { EmbeddingJobData } from '../../nlp/workers/embedding.worker';
import { PrismaService } from '../../prisma/prisma.service';
import { EMBEDDING_QUEUE } from '../../queues/queue.constants';

@Injectable()
export class AdminRecommendationsService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue(EMBEDDING_QUEUE) private embeddingQueue: Queue<EmbeddingJobData>,
  ) {}

  async getMetrics() {
    // Total Feedbacks
    const feedbacks = await this.prisma.recommendationFeedback.groupBy({
      by: ['feedback'],
      _count: {
        feedback: true,
      },
    });

    const totalSignals = await this.prisma.recommendationSignal.count();

    // A/B Test Metric Mock/Placeholder
    // In a real scenario, we would join recommendation clicks with feature flags

    return {
      feedbacks,
      totalSignals,
    };
  }

  async rebuildEmbeddings(resourceType: string) {
    if (resourceType === 'JOB_POSTING') {
      const jobs = await this.prisma.jobPosting.findMany({
        select: { id: true, description: true, requirements: true, title: true },
      });
      for (const job of jobs) {
        const text = `${job.title} ${job.description} ${job.requirements.join(' ')}`;
        await this.embeddingQueue.add('rebuild-job', {
          entityType: EntityType.JOB_POSTING,
          entityId: job.id,
          rawText: text,
        });
      }
      return { message: `Queued ${jobs.length} jobs for re-embedding` };
    }

    if (resourceType === 'USER_PROFILE') {
      const profiles = await this.prisma.profile.findMany({ select: { id: true, bio: true } });
      for (const profile of profiles) {
        await this.embeddingQueue.add('rebuild-profile', {
          entityType: EntityType.USER_PROFILE,
          entityId: profile.id,
          rawText: profile.bio || '',
        });
      }
      return { message: `Queued ${profiles.length} profiles for re-embedding` };
    }

    throw new Error('Unsupported resourceType');
  }
}
