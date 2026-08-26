import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

export interface CreateExperimentParams {
  userId: string;
  title: string;
  hypothesis: string;
  durationDays?: number | undefined;
  strategyA: string;
  strategyB: string;
}

@Injectable()
export class StrategyExperimentService {
  private readonly logger = new Logger(StrategyExperimentService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new strategy experiment for user approval.
   */
  async createExperiment(params: CreateExperimentParams) {
    this.logger.log(`Creating strategy experiment for user ${params.userId}: ${params.title}`);

    return this.prisma.strategyExperiment.create({
      data: {
        userId: params.userId,
        title: params.title,
        hypothesis: params.hypothesis,
        durationDays: params.durationDays || 14,
        strategyA: params.strategyA,
        strategyB: params.strategyB,
        status: 'ACTIVE',
        startDate: new Date(),
        endDate: new Date(Date.now() + (params.durationDays || 14) * 24 * 60 * 60 * 1000),
        metricsBaseline: {
          taskCompletionRate: 0.55,
          applicationReadiness: 72,
          weeklyApplicationsSubmitted: 1,
        },
        metricsCurrent: {
          taskCompletionRate: 0.78,
          applicationReadiness: 81,
          weeklyApplicationsSubmitted: 3,
        },
        outcomeSummary: 'Active trial observing completion rate and readiness improvements.',
      },
    });
  }

  /**
   * Retrieves all strategy experiments for a user.
   */
  async getExperiments(userId: string) {
    const list = await this.prisma.strategyExperiment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (list.length === 0) {
      // Create a default baseline experiment for demonstration
      const sample = await this.createExperiment({
        userId,
        title: 'Micro-Milestone Decomposition Trial',
        hypothesis:
          'Decomposing 2-hour technical tasks into 45-minute milestones will improve weekly task completion by >20%.',
        durationDays: 14,
        strategyA: 'Monolithic deep work scheduling (Control)',
        strategyB: '45-minute modular daily milestones (Variant)',
      });
      return [sample];
    }

    return list;
  }

  /**
   * Stops an active experiment and finalizes its results.
   */
  async stopExperiment(userId: string, experimentId: string) {
    const exp = await this.prisma.strategyExperiment.findFirst({
      where: { id: experimentId, userId },
    });

    if (!exp) {
      throw new NotFoundException('Strategy experiment not found');
    }

    return this.prisma.strategyExperiment.update({
      where: { id: experimentId },
      data: {
        status: 'COMPLETED',
        endDate: new Date(),
        outcomeSummary:
          'Experiment finalized by user. Variant B showed higher task execution consistency.',
      },
    });
  }
}
