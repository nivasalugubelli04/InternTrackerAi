import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';

import { RecommendationService } from '../../matching/services/recommendation.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MATCHING_QUEUE } from '../queue.constants';

export const MATCH_USER_JOB = 'MATCH_USER';
export const MATCH_ALL_JOB = 'MATCH_ALL';

@Processor(MATCHING_QUEUE)
export class MatchingProcessor extends WorkerHost {
  private readonly logger = new Logger(MatchingProcessor.name);

  constructor(
    private readonly recommendationService: RecommendationService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<{ userId?: string }>): Promise<any> {
    this.logger.log(`Processing matching queue job: ${job.name} (ID: ${job.id})`);

    switch (job.name) {
      case MATCH_USER_JOB: {
        const userId = job.data.userId;
        if (!userId) {
          throw new Error('userId is required for MATCH_USER job');
        }
        return await this.recommendationService.runMatchingForUser(userId);
      }

      case MATCH_ALL_JOB: {
        const activeUsers = await this.prisma.user.findMany({
          where: { isActive: true },
          select: { id: true },
        });

        this.logger.log(`Starting batch matching for ${activeUsers.length} active users`);

        const results = [];
        for (const user of activeUsers) {
          try {
            const res = await this.recommendationService.runMatchingForUser(user.id);
            results.push(res);
          } catch (err: any) {
            this.logger.error(`Matching failed for user ${user.id}: ${err.message}`, err.stack);
          }
        }

        return {
          totalUsersProcessed: results.length,
          results,
        };
      }

      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
        return { status: 'skipped' };
    }
  }
}
