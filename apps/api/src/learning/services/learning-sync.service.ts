import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

import { CareerReadinessService } from './career-readiness.service';

@Injectable()
export class LearningSyncService {
  private readonly logger = new Logger(LearningSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly careerReadiness: CareerReadinessService,
  ) {}

  /**
   * Triggers state synchronization cascade when user completes a practice, quiz, or project.
   */
  async syncLearningProgress(userId: string, skillId?: string): Promise<any> {
    this.logger.log(`Syncing learning progress for user ${userId}, skill ${skillId || 'all'}`);

    // 1. Recalculate Skill Confidence if skillId provided
    if (skillId) {
      const evidences = await this.prisma.skillEvidence.findMany({
        where: { userId, skillId },
      });

      if (evidences.length > 0) {
        const avgScore = evidences.reduce((sum, e) => sum + e.score, 0) / evidences.length;
        const confidenceScore = Math.min(0.4 + evidences.length * 0.15 + avgScore / 500, 1.0);

        const existingSkill = await this.prisma.userSkill.findUnique({
          where: { userId_skillId: { userId, skillId } },
        });

        if (existingSkill) {
          await this.prisma.userSkill.update({
            where: { userId_skillId: { userId, skillId } },
            data: {
              confidenceScore,
              evidenceCount: evidences.length,
              lastEvaluatedAt: new Date(),
              decayWarning: false,
            },
          });
        } else {
          await this.prisma.userSkill.create({
            data: {
              userId,
              skillId,
              proficiency:
                confidenceScore >= 0.8
                  ? 'ADVANCED'
                  : confidenceScore >= 0.5
                    ? 'INTERMEDIATE'
                    : 'BEGINNER',
              confidenceScore,
              evidenceCount: evidences.length,
              lastEvaluatedAt: new Date(),
            },
          });
        }
      }
    }

    // 2. Recalculate Career Readiness Score
    const updatedReadiness = await this.careerReadiness.computeReadiness(userId);

    // 3. Complete associated pending Career Actions
    await this.prisma.careerAction.updateMany({
      where: {
        userId,
        entityType: 'LEARNING',
        status: 'PENDING',
      },
      data: {
        status: 'COMPLETED',
      },
    });

    return updatedReadiness;
  }
}
