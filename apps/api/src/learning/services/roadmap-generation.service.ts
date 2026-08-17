import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

import { PrerequisiteService } from './prerequisite.service';

interface RoadmapModule {
  phase: number;
  skillId: string;
  skillName: string;
  isPrerequisite: boolean;
  learningModules: any[];
}

@Injectable()
export class RoadmapGenerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly prerequisite: PrerequisiteService,
  ) {}

  /**
   * Generates or regenerates a personalized learning roadmap for a target goal.
   * Leverages Phase 25 skill gap requirements and prerequisite check order.
   */
  async generateRoadmap(userId: string, goalId: string, reason?: string): Promise<any> {
    const goal = await this.prisma.learningGoal.findUnique({
      where: { id: goalId },
    });
    if (!goal) {
      throw new NotFoundException(`Learning goal not found.`);
    }

    // 1. Identify target role skill requirements
    let targetSkillIds: string[] = [];
    if (goal.targetSkillId) {
      targetSkillIds.push(goal.targetSkillId);
    } else if (goal.targetRole) {
      // Find role by name or ID and fetch its associated skills
      const role = await this.prisma.role.findFirst({
        where: { name: goal.targetRole },
        include: {
          roleSkills: {
            select: { skillId: true },
          },
        },
      });
      if (role) {
        targetSkillIds = role.roleSkills.map((rs) => rs.skillId);
      }
    }

    if (targetSkillIds.length === 0) {
      // Fallback: fetch a few high-demand fallback skills if none specified
      const topSkills = await this.prisma.skill.findMany({
        take: 3,
        select: { id: true },
      });
      targetSkillIds = topSkills.map((s) => s.id);
    }

    // 2. Fetch user's existing skills
    const userSkills = await this.prisma.userSkill.findMany({
      where: { userId },
      select: { skillId: true },
    });
    const userSkillSet = new Set(userSkills.map((us) => us.skillId));

    // 3. Compute required skill chain based on prerequisites
    const completeChain = await this.prerequisite.getPrerequisiteChain(targetSkillIds);

    // 4. Filter down to missing gaps
    const missingGaps = completeChain.filter((id) => !userSkillSet.has(id));

    // 5. Structure into chronological phases with matching learning modules & resources
    const phases: RoadmapModule[] = [];
    let currentPhase = 1;

    for (const skillId of missingGaps) {
      const skill = await this.prisma.skill.findUnique({
        where: { id: skillId },
        include: {
          learningModules: {
            where: { status: 'ACTIVE' },
            take: 3,
          },
        },
      });

      if (!skill) continue;

      phases.push({
        phase: currentPhase++,
        skillId: skill.id,
        skillName: skill.name,
        isPrerequisite: !targetSkillIds.includes(skill.id),
        learningModules: skill.learningModules,
      });
    }

    const roadmapData = {
      goalId: goal.id,
      targetRole: goal.targetRole || 'General Skill Growth',
      phases,
    };

    // 6. Handle roadmap versioning (save previous version if exists)
    const existingRoadmap = await this.prisma.learningRoadmap.findFirst({
      where: { userId, goalId: goal.id },
    });

    if (existingRoadmap) {
      // Archive current version
      await this.prisma.learningRoadmapVersion.create({
        data: {
          roadmapId: existingRoadmap.id,
          version: existingRoadmap.version,
          reason: reason || 'Regenerated due to progress or goal modification',
          roadmapJson: existingRoadmap.roadmapJson as any,
        },
      });

      // Update to new version
      return this.prisma.learningRoadmap.update({
        where: { id: existingRoadmap.id },
        data: {
          roadmapJson: roadmapData as any,
          version: existingRoadmap.version + 1,
        },
      });
    } else {
      // Create fresh roadmap
      return this.prisma.learningRoadmap.create({
        data: {
          userId,
          goalId: goal.id,
          targetRole: goal.targetRole || 'General Skill Growth',
          roadmapJson: roadmapData as any,
          version: 1,
        },
      });
    }
  }
}
