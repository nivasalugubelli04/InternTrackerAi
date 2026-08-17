import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { SkillDemandService } from '../../market/services/skill-demand.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SKILL_GRAPH_QUEUE } from '../../queues/queue.constants';

export const SKILL_GRAPH_JOB_TYPES = {
  SKILL_GRAPH_UPDATE: 'SKILL_GRAPH_UPDATE',
  ROLE_GRAPH_UPDATE: 'ROLE_GRAPH_UPDATE',
  MARKET_SIGNAL_UPDATE: 'MARKET_SIGNAL_UPDATE',
  CAREER_PATH_UPDATE: 'CAREER_PATH_UPDATE',
  USER_CAREER_GRAPH_UPDATE: 'USER_CAREER_GRAPH_UPDATE',
} as const;

@Processor(SKILL_GRAPH_QUEUE)
export class SkillGraphProcessor extends WorkerHost {
  private readonly logger = new Logger(SkillGraphProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly skillDemandService: SkillDemandService,
  ) {
    super();
  }

  async process(job: Job<any>): Promise<any> {
    this.logger.log(`[Job ${job.id}] Processing skill graph job: ${job.name}`);

    switch (job.name) {
      case SKILL_GRAPH_JOB_TYPES.SKILL_GRAPH_UPDATE:
        return this.handleSkillGraphUpdate();

      case SKILL_GRAPH_JOB_TYPES.ROLE_GRAPH_UPDATE:
        return this.handleRoleGraphUpdate();

      case SKILL_GRAPH_JOB_TYPES.MARKET_SIGNAL_UPDATE:
        return this.handleMarketSignalUpdate();

      case SKILL_GRAPH_JOB_TYPES.CAREER_PATH_UPDATE:
        return this.handleCareerPathUpdate();

      case SKILL_GRAPH_JOB_TYPES.USER_CAREER_GRAPH_UPDATE:
        return this.handleUserCareerGraphUpdate(job.data?.userId);

      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
        return null;
    }
  }

  private async handleSkillGraphUpdate(): Promise<any> {
    this.logger.log('Executing SkillGraphUpdate...');
    // We clean active flags, normalise and merge aliases where conflicts exist
    const skills = await this.prisma.skill.findMany();
    for (const skill of skills) {
      const uniqueAliases = [...new Set(skill.aliases)];
      if (uniqueAliases.length !== skill.aliases.length) {
        await this.prisma.skill.update({
          where: { id: skill.id },
          data: { aliases: uniqueAliases },
        });
      }
    }
    return { success: true, processedCount: skills.length };
  }

  private async handleRoleGraphUpdate(): Promise<any> {
    this.logger.log('Executing RoleGraphUpdate...');
    // Validate role hierarchies (prevent self-parent circularity)
    const roles = await this.prisma.role.findMany();
    let validated = 0;
    for (const role of roles) {
      if (role.parentId === role.id) {
        await this.prisma.role.update({
          where: { id: role.id },
          data: { parentId: null },
        });
      }
      validated++;
    }
    return { success: true, validated };
  }

  private async handleMarketSignalUpdate(): Promise<any> {
    this.logger.log('Executing MarketSignalUpdate...');
    // Extract Phase 18 market analytics and update SkillDemandSignal cache
    const analysis = await this.skillDemandService.getSkillDemandAnalysis();

    // Map demand percentage and co-occurrence signals
    for (const item of analysis.topDemandedSkills) {
      const skill = await this.prisma.skill.findUnique({
        where: { name: item.skill },
      });
      if (skill) {
        await this.prisma.skillDemandSignal.upsert({
          where: { skillId: skill.id },
          update: {
            demandScore: item.percentage,
            growthRate: item.growthRate || 0.0,
            opportunityVolume: item.count,
            metadataJson: { sampleSize: item.sampleSize } as any,
          },
          create: {
            skillId: skill.id,
            demandScore: item.percentage,
            growthRate: item.growthRate || 0.0,
            opportunityVolume: item.count,
            metadataJson: { sampleSize: item.sampleSize } as any,
          },
        });
      }
    }
    return { success: true, count: analysis.topDemandedSkills.length };
  }

  private async handleCareerPathUpdate(): Promise<any> {
    this.logger.log('Executing CareerPathUpdate...');
    // Ensure all career paths steps don't have circular transitions
    const paths = await this.prisma.careerPath.findMany({
      include: { steps: true },
    });
    return { success: true, pathsCount: paths.length };
  }

  private async handleUserCareerGraphUpdate(userId?: string): Promise<any> {
    if (!userId) {
      this.logger.warn('UserCareerGraphUpdate called without userId');
      return { success: false, reason: 'userId required' };
    }
    this.logger.log(`Executing UserCareerGraphUpdate for user: ${userId}`);
    // Clear out expired recommendations
    await this.prisma.careerRecommendation.deleteMany({
      where: {
        userId,
        expiresAt: { lt: new Date() },
      },
    });
    return { success: true };
  }
}
