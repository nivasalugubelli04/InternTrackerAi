import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

export interface SkillGapAnalysis {
  targetRole: string;
  totalRequiredSkills: number;
  overallCoveragePercentage: number;
  strongSkills: Array<{ id: string; name: string; proficiency: string; confidence: number }>;
  moderateSkills: Array<{ id: string; name: string; proficiency: string; confidence: number }>;
  missingSkills: Array<{
    id: string;
    name: string;
    importance: string;
    impactScore: number;
    reason: string;
  }>;
  highImpactSkills: Array<{
    id: string;
    name: string;
    opportunitiesUnlockedCount: number;
    reason: string;
  }>;
}

@Injectable()
export class SkillGapEngineService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Analyzes candidate's target role requirements against candidate skills,
   * combining Opportunity, Interview, and Application signals.
   */
  async analyzeSkillGap(userId: string, targetRoleName?: string): Promise<SkillGapAnalysis> {
    // 1. Determine target role
    let roleName = targetRoleName;
    if (!roleName) {
      const activeGoal = await this.prisma.learningGoal.findFirst({
        where: { userId, status: 'ACTIVE' },
        orderBy: { updatedAt: 'desc' },
      });
      roleName = activeGoal?.targetRole || 'Software Engineer';
    }

    // 2. Fetch canonical role skills from taxonomy
    const roleRecord = await this.prisma.role.findFirst({
      where: { name: { equals: roleName, mode: 'insensitive' } },
      include: {
        roleSkills: {
          include: { skill: true },
        },
      },
    });

    const requiredSkillMap = new Map<
      string,
      { id: string; name: string; importance: string; weight: number }
    >();

    if (roleRecord && roleRecord.roleSkills.length > 0) {
      for (const rs of roleRecord.roleSkills) {
        requiredSkillMap.set(rs.skillId, {
          id: rs.skill.id,
          name: rs.skill.name,
          importance: rs.importance,
          weight: rs.importance === 'HIGH' ? 1.5 : rs.importance === 'MEDIUM' ? 1.0 : 0.7,
        });
      }
    } else {
      // Fallback: fetch active catalog skills
      const catalogSkills = await this.prisma.skill.findMany({
        where: { isActive: true },
        take: 10,
      });
      for (const s of catalogSkills) {
        requiredSkillMap.set(s.id, {
          id: s.id,
          name: s.name,
          importance: 'HIGH',
          weight: 1.0,
        });
      }
    }

    // 3. Signal 2: Active Opportunity Signals (Phase 32 top recommendations)
    const topRecs = await this.prisma.recommendation.findMany({
      where: { userId, isDismissed: false },
      include: { job: { select: { requirements: true } } },
      take: 10,
    });

    const opportunitySkillFrequency = new Map<string, number>();
    for (const rec of topRecs) {
      const skillsInJob = rec.job?.requirements || [];
      for (const sk of skillsInJob) {
        const lowerSk = sk.toLowerCase().trim();
        opportunitySkillFrequency.set(lowerSk, (opportunitySkillFrequency.get(lowerSk) || 0) + 1);
      }
    }

    // 4. Signal 3: Interview Performance Signals (Phase 34 weak areas)
    const interviewGaps = await this.prisma.interviewSkillGap.findMany({
      where: { userId },
    });
    const interviewWeakSkillNames = new Set(
      interviewGaps.map((g) => g.skillName.toLowerCase().trim()),
    );

    const mockInterviews = await this.prisma.mockInterview.findMany({
      where: { userId },
      select: { weakAreas: true },
      take: 5,
    });
    for (const mi of mockInterviews) {
      for (const wa of mi.weakAreas) {
        interviewWeakSkillNames.add(wa.toLowerCase().trim());
      }
    }

    // 5. Fetch User's Current Skills
    const userSkills = await this.prisma.userSkill.findMany({
      where: { userId },
      include: { skill: true },
    });

    const userSkillMap = new Map<
      string,
      { id: string; name: string; proficiency: string; confidence: number }
    >();
    for (const us of userSkills) {
      userSkillMap.set(us.skillId, {
        id: us.skillId,
        name: us.skill.name,
        proficiency: us.proficiency,
        confidence: us.confidenceScore || 0.5,
      });
    }

    // 6. Categorize Skills: Strong, Moderate, Missing
    const strongSkills: Array<{
      id: string;
      name: string;
      proficiency: string;
      confidence: number;
    }> = [];
    const moderateSkills: Array<{
      id: string;
      name: string;
      proficiency: string;
      confidence: number;
    }> = [];
    const missingSkills: Array<{
      id: string;
      name: string;
      importance: string;
      impactScore: number;
      reason: string;
    }> = [];
    const highImpactSkills: Array<{
      id: string;
      name: string;
      opportunitiesUnlockedCount: number;
      reason: string;
    }> = [];

    for (const [skillId, req] of requiredSkillMap.entries()) {
      const userSk = userSkillMap.get(skillId);

      if (userSk) {
        if (
          userSk.proficiency === 'ADVANCED' ||
          userSk.proficiency === 'EXPERT' ||
          userSk.confidence >= 0.85
        ) {
          strongSkills.push(userSk);
        } else {
          moderateSkills.push(userSk);
        }
      } else {
        // Skill is missing — calculate multi-signal impact score
        const oppCount = opportunitySkillFrequency.get(req.name.toLowerCase()) || 0;
        const isInterviewWeak = interviewWeakSkillNames.has(req.name.toLowerCase());

        const impactScore = req.weight * 30 + oppCount * 15 + (isInterviewWeak ? 25 : 0);

        let reason = `Required for ${roleName}`;
        if (oppCount > 0) {
          reason += ` • Appears in ${oppCount} of your target job matches`;
        }
        if (isInterviewWeak) {
          reason += ` • Identified as a weak area in recent mock interviews`;
        }

        missingSkills.push({
          id: req.id,
          name: req.name,
          importance: req.importance,
          impactScore: Math.min(Math.round(impactScore), 100),
          reason,
        });

        if (oppCount >= 2 || isInterviewWeak) {
          highImpactSkills.push({
            id: req.id,
            name: req.name,
            opportunitiesUnlockedCount: Math.max(oppCount, 1),
            reason: `Learning ${req.name} will significantly improve your match score for active target opportunities.`,
          });
        }
      }
    }

    // Sort missing skills by impact score descending
    missingSkills.sort((a, b) => b.impactScore - a.impactScore);

    const totalRequired = requiredSkillMap.size;
    const coveredCount = strongSkills.length + moderateSkills.length * 0.5;
    const coveragePct =
      totalRequired > 0 ? Math.min(Math.round((coveredCount / totalRequired) * 100), 100) : 0;

    return {
      targetRole: roleName,
      totalRequiredSkills: totalRequired,
      overallCoveragePercentage: coveragePct,
      strongSkills,
      moderateSkills,
      missingSkills,
      highImpactSkills,
    };
  }
}
