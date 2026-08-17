import { Injectable } from '@nestjs/common';
import { SkillRelationType } from '@prisma/client';

import { SkillDemandService } from '../../market/services/skill-demand.service';
import { PrismaService } from '../../prisma/prisma.service';

export enum PriorityLevel {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export interface SkillPriority {
  skillId: string;
  skillName: string;
  score: number;
  priority: PriorityLevel;
  signals: {
    roleRelevance: number;
    marketDemand: number;
    userGap: number;
    transferability: number;
    opportunityVolume: number;
  };
}

@Injectable()
export class TalentIntelligenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly skillDemandService: SkillDemandService,
  ) {}

  /**
   * Identifies transferable skills between a candidate's profile and a target role.
   * A skill is transferable if the user possesses a skill related/alternative to a required/preferred skill.
   */
  async identifyTransferableSkills(userId: string, targetRoleId: string) {
    // 1. Get user's skills
    const userSkills = await this.prisma.userSkill.findMany({
      where: { userId },
      include: { skill: true },
    });

    const userSkillIds = new Set(userSkills.map((us) => us.skillId));

    // 2. Get target role's skills
    const roleSkills = await this.prisma.roleSkill.findMany({
      where: { roleId: targetRoleId },
      include: { skill: true },
    });

    const transferableList: {
      userSkillName: string;
      targetSkillName: string;
      relationType: SkillRelationType;
      explanation: string;
    }[] = [];

    // 3. For each missing skill, check relationships with user's skills
    for (const rs of roleSkills) {
      if (!userSkillIds.has(rs.skillId)) {
        // Query relationships
        const relationships = await this.prisma.skillRelationship.findMany({
          where: {
            toSkillId: rs.skillId,
            fromSkillId: { in: Array.from(userSkillIds) },
          },
          include: {
            fromSkill: true,
          },
        });

        for (const rel of relationships) {
          transferableList.push({
            userSkillName: rel.fromSkill.name,
            targetSkillName: rs.skill.name,
            relationType: rel.relationType,
            explanation: `Your existing ${rel.fromSkill.name} knowledge can support ${rs.skill.name}-focused role requirements based on a ${rel.relationType} mapping.`,
          });
        }
      }
    }

    return transferableList;
  }

  /**
   * Recommends the next best skills for a user based on target role, gaps, and market signals.
   */
  async recommendNextBestSkills(userId: string, targetRoleId: string): Promise<SkillPriority[]> {
    // 1. Get user's skills
    const userSkills = await this.prisma.userSkill.findMany({
      where: { userId },
      select: { skillId: true },
    });
    const userSkillIds = new Set(userSkills.map((us) => us.skillId));

    // 2. Get target role's required/preferred skills
    const roleSkills = await this.prisma.roleSkill.findMany({
      where: { roleId: targetRoleId },
      include: { skill: true },
    });

    // 3. Fetch current market signals from Phase 18 SkillDemandService
    const marketDemand = await this.skillDemandService.getSkillDemandAnalysis();

    // Map market metrics
    const marketScoresMap = new Map<string, { score: number; count: number }>();
    for (const item of marketDemand.topDemandedSkills) {
      marketScoresMap.set(item.skill.toLowerCase(), {
        score: item.percentage / 100, // Normalize to 0-1
        count: item.count,
      });
    }

    const recommendations: SkillPriority[] = [];

    for (const rs of roleSkills) {
      // Only evaluate skills that the user doesn't currently possess
      if (!userSkillIds.has(rs.skillId)) {
        const skillNameLower = rs.skill.name.toLowerCase();
        const marketMetrics = marketScoresMap.get(skillNameLower) || { score: 0.1, count: 0 };

        // Define component signals
        const roleRelevance = rs.requirement === 'REQUIRED' ? 1.0 : 0.6;
        const marketDemandScore = marketMetrics.score;
        const opportunityVolume = Math.min(marketMetrics.count / 100, 1.0); // capped normalization

        // Check if there are transferable relationships (if yes, helps lower user gap barriers)
        const relationsCount = await this.prisma.skillRelationship.count({
          where: {
            toSkillId: rs.skillId,
            fromSkillId: { in: Array.from(userSkillIds) },
          },
        });
        const transferability = relationsCount > 0 ? 0.8 : 0.1;
        const userGap = 1.0; // it is fully missing

        // Priority Score = (Role Relevance * 0.4) + (Market Demand * 0.3) + (Opportunity Volume * 0.2) + (Transferability * 0.1)
        const score = Number(
          (
            roleRelevance * 0.4 +
            marketDemandScore * 0.3 +
            opportunityVolume * 0.2 +
            transferability * 0.1
          ).toFixed(2),
        );

        let priority = PriorityLevel.LOW;
        if (score >= 0.7) {
          priority = PriorityLevel.HIGH;
        } else if (score >= 0.4) {
          priority = PriorityLevel.MEDIUM;
        }

        recommendations.push({
          skillId: rs.skillId,
          skillName: rs.skill.name,
          score,
          priority,
          signals: {
            roleRelevance,
            marketDemand: marketDemandScore,
            userGap,
            transferability,
            opportunityVolume: marketMetrics.count,
          },
        });
      }
    }

    // Sort by priority score descending
    return recommendations.sort((a, b) => b.score - a.score);
  }
}
