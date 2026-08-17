import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CareerPathService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves all career paths.
   */
  async getCareerPaths() {
    return this.prisma.careerPath.findMany({
      where: { isActive: true },
      include: {
        steps: {
          orderBy: { stepNumber: 'asc' },
          include: {
            role: true,
            skills: {
              include: {
                skill: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Retrieves details of a specific career path.
   */
  async getCareerPathDetails(pathId: string) {
    const path = await this.prisma.careerPath.findUnique({
      where: { id: pathId },
      include: {
        steps: {
          orderBy: { stepNumber: 'asc' },
          include: {
            role: true,
            skills: {
              include: {
                skill: true,
              },
            },
          },
        },
      },
    });

    if (!path) {
      throw new NotFoundException(`Career path with ID ${pathId} not found.`);
    }

    return path;
  }

  /**
   * Computes the skill overlap and gap analysis between a user's skills
   * and each step of a target career path.
   */
  async analyzePathGaps(userId: string, pathId: string) {
    const path = await this.getCareerPathDetails(pathId);

    // Retrieve user's skills
    const userSkills = await this.prisma.userSkill.findMany({
      where: { userId },
      include: {
        skill: true,
      },
    });

    const userSkillIds = new Set(userSkills.map((us) => us.skillId));

    const stepAnalyses = path.steps.map((step) => {
      const stepSkills = step.skills.map((cps) => cps.skill);
      const overlap: string[] = [];
      const gaps: string[] = [];

      for (const skill of stepSkills) {
        if (userSkillIds.has(skill.id)) {
          overlap.push(skill.name);
        } else {
          gaps.push(skill.name);
        }
      }

      const completenessRate =
        stepSkills.length > 0
          ? Number(((overlap.length / stepSkills.length) * 100).toFixed(1))
          : 100.0;

      return {
        stepId: step.id,
        stepNumber: step.stepNumber,
        roleName: step.role.name,
        completenessRate,
        overlapSkills: overlap,
        missingSkills: gaps,
      };
    });

    return {
      careerPathId: path.id,
      title: path.title,
      steps: stepAnalyses,
    };
  }
}
