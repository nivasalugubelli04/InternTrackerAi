import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SkillMasteryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Computes an internal mastery score (0-100) for a given skill based on:
   * Quiz scores (40%), Practice consistency (30%), Assessment achievements (30%).
   */
  async computeMasteryScore(userId: string, skillId: string): Promise<number> {
    // 1. Get user evidence points for the skill
    const evidenceList = await this.prisma.skillEvidence.findMany({
      where: { userId, skillId },
    });

    if (evidenceList.length === 0) return 0.0;

    const quizEvidences = evidenceList.filter((e) => e.evidenceType === 'QUIZ');
    const projectEvidences = evidenceList.filter((e) => e.evidenceType === 'PROJECT');
    const assessmentEvidences = evidenceList.filter((e) => e.evidenceType === 'ASSESSMENT');

    let quizScore = 0.0;
    if (quizEvidences.length > 0) {
      quizScore = quizEvidences.reduce((sum, e) => sum + e.score, 0) / quizEvidences.length;
    }

    const projectScore = projectEvidences.length > 0 ? 100.0 : 0.0;

    let assessmentScore = 0.0;
    if (assessmentEvidences.length > 0) {
      assessmentScore =
        assessmentEvidences.reduce((sum, e) => sum + e.score, 0) / assessmentEvidences.length;
    } else if (projectScore > 0) {
      // Proxy project as developing assessment signal
      assessmentScore = 70.0;
    }

    const finalScore = quizScore * 0.4 + projectScore * 0.3 + assessmentScore * 0.3;
    return Math.min(finalScore, 100.0);
  }

  /**
   * Translates score to transparency skill level category.
   */
  getSkillLevel(
    score: number,
  ): 'AWARENESS' | 'BEGINNER' | 'DEVELOPING' | 'INTERMEDIATE' | 'ADVANCED' {
    if (score >= 90) return 'ADVANCED';
    if (score >= 70) return 'INTERMEDIATE';
    if (score >= 45) return 'DEVELOPING';
    if (score >= 20) return 'BEGINNER';
    return 'AWARENESS';
  }

  /**
   * Generates profile sync validation. As per prompt rule, user is asked
   * "Add this skill to your profile?" -> returns options to let user confirm.
   */
  async getProfileSyncOptions(userId: string, skillId: string): Promise<any> {
    const skill = await this.prisma.skill.findUnique({
      where: { id: skillId },
    });
    if (!skill) throw new NotFoundException(`Skill not found`);

    const score = await this.computeMasteryScore(userId, skillId);
    const level = this.getSkillLevel(score);

    return {
      message: `You have demonstrated "${level}" proficiency in ${skill.name}. Add this skill to your public profile?`,
      skillId,
      skillName: skill.name,
      suggestedLevel: level,
      options: [
        { key: 'ADD', label: 'Yes, add to my profile' },
        { key: 'KEEP_LEARNING', label: 'Keep as learning status' },
        { key: 'REJECT', label: 'Do not add now' },
      ],
    };
  }

  /**
   * Processes the user's sync response.
   */
  async processProfileSync(
    userId: string,
    skillId: string,
    choice: 'ADD' | 'KEEP_LEARNING' | 'REJECT',
  ): Promise<any> {
    if (choice === 'ADD') {
      const existing = await this.prisma.userSkill.findUnique({
        where: {
          userId_skillId: { userId, skillId },
        },
      });

      if (!existing) {
        await this.prisma.userSkill.create({
          data: {
            userId,
            skillId,
          },
        });
      }
      return { success: true, status: 'ADDED' };
    }

    return { success: true, status: choice };
  }
}
