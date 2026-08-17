import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { PrismaService } from '../../prisma/prisma.service';
import { LEARNING_QUEUE } from '../../queues/queue.constants';
import { RoadmapGenerationService } from '../services/roadmap-generation.service';

@Processor(LEARNING_QUEUE)
@Injectable()
export class LearningProcessor extends WorkerHost {
  private readonly logger = new Logger(LearningProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly roadmapGen: RoadmapGenerationService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);

    switch (job.name) {
      case 'RoadmapGenerationJob': {
        const { userId, goalId } = job.data;
        const result = await this.roadmapGen.generateRoadmap(
          userId,
          goalId,
          'Async background compilation',
        );
        return { status: 'COMPLETED', roadmapId: result.id };
      }

      case 'ResourceValidationJob': {
        const { resourceId } = job.data;
        const resource = await this.prisma.learningResource.findUnique({
          where: { id: resourceId },
        });
        if (!resource) return { status: 'SKIPPED', message: 'Resource not found' };

        // Simulates validating resource status
        await this.prisma.learningResource.update({
          where: { id: resourceId },
          data: {
            lastVerifiedAt: new Date(),
            status: 'VERIFIED',
          },
        });
        return { status: 'COMPLETED', resourceId };
      }

      case 'ProgressAggregationJob': {
        const { userId } = job.data;
        // Collect metrics and aggregate
        const enrollments = await this.prisma.learningEnrollment.findMany({ where: { userId } });
        const completedCount = enrollments.filter((e) => e.status === 'COMPLETED').length;
        this.logger.log(
          `Aggregated progress for user ${userId}: ${completedCount} completed modules`,
        );
        return { status: 'COMPLETED', completedCount };
      }

      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
        return { status: 'IGNORED' };
    }
  }
}
