import { Injectable } from '@nestjs/common';
import { SkillRelationType } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PrerequisiteService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Identifies all prerequisite skills required for a target skill
   * that the user does not currently possess.
   */
  async getMissingPrerequisites(userId: string, skillId: string): Promise<string[]> {
    // 1. Fetch user's current skills
    const userSkills = await this.prisma.userSkill.findMany({
      where: { userId },
      select: { skillId: true },
    });
    const userSkillSet = new Set(userSkills.map((us) => us.skillId));

    // 2. Query Phase 25 PRECEDES relationships where toSkillId is the target skill
    const relations = await this.prisma.skillRelationship.findMany({
      where: {
        toSkillId: skillId,
        relationType: SkillRelationType.PRECEDES,
      },
      select: {
        fromSkillId: true,
      },
    });

    const missingIds: string[] = [];
    for (const rel of relations) {
      if (!userSkillSet.has(rel.fromSkillId)) {
        missingIds.push(rel.fromSkillId);
      }
    }

    return missingIds;
  }

  /**
   * For a given list of skill IDs required for a role, returns the ordered list
   * of prerequisites including transient/indirect dependencies.
   */
  async getPrerequisiteChain(skillIds: string[]): Promise<string[]> {
    const visited = new Set<string>();
    const chain: string[] = [];

    const visit = async (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);

      // Fetch what precedes this skill
      const predecessors = await this.prisma.skillRelationship.findMany({
        where: {
          toSkillId: id,
          relationType: SkillRelationType.PRECEDES,
        },
        select: {
          fromSkillId: true,
        },
      });

      for (const pred of predecessors) {
        await visit(pred.fromSkillId);
      }

      chain.push(id);
    };

    for (const id of skillIds) {
      await visit(id);
    }

    return chain;
  }
}
