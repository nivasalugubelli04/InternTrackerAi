import { Injectable, Logger } from '@nestjs/common';
import { JobPostingStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

export interface SkillDemandItem {
  skill: string;
  count: number;
  percentage: number;
  growthRate?: number;
  sampleSize: number;
  hasSufficientData: boolean;
}

export interface SkillCoOccurrence {
  primarySkill: string;
  coOccurringSkill: string;
  coOccurrenceCount: number;
  strength: number; // 0 to 1
}

export interface SkillDemandResponse {
  topDemandedSkills: SkillDemandItem[];
  fastestGrowingSkills: SkillDemandItem[];
  topSkillCombinations: SkillCoOccurrence[];
  skillsByRole: Record<string, { skill: string; count: number }[]>;
  skillsByIndustry: Record<string, { skill: string; count: number }[]>;
  skillsByLocation: Record<string, { skill: string; count: number }[]>;
  dataFreshness: {
    calculatedAt: string;
    sampleSize: number;
  };
}

@Injectable()
export class SkillDemandService {
  private readonly logger = new Logger(SkillDemandService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Comprehensive skill demand analysis across all dimensions.
   */
  async getSkillDemandAnalysis(): Promise<SkillDemandResponse> {
    this.logger.debug('Calculating skill demand analytics');
    const now = new Date();
    const periodDays = 30;
    const currentPeriodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const previousPeriodStart = new Date(now.getTime() - periodDays * 2 * 24 * 60 * 60 * 1000);

    const [currentJobs, previousJobs] = await Promise.all([
      this.prisma.jobPosting.findMany({
        where: {
          status: JobPostingStatus.ACTIVE,
        },
        select: {
          id: true,
          title: true,
          location: true,
          requirements: true,
          createdAt: true,
          company: {
            select: { name: true, industry: true },
          },
        },
      }),
      this.prisma.jobPosting.findMany({
        where: {
          createdAt: { gte: previousPeriodStart, lt: currentPeriodStart },
        },
        select: {
          requirements: true,
        },
      }),
    ]);

    const totalJobs = currentJobs.length;
    const currentSkillCounts = new Map<string, number>();
    const coOccurrenceMap = new Map<string, number>();
    const roleSkillMap = new Map<string, Map<string, number>>();
    const industrySkillMap = new Map<string, Map<string, number>>();
    const locationSkillMap = new Map<string, Map<string, number>>();

    // 1. Process current period jobs
    for (const job of currentJobs) {
      const skills = Array.from(
        new Set(job.requirements.map((s) => s.trim()).filter((s) => s.length > 1)),
      );

      const role = this.normalizeRole(job.title);
      const industry = job.company?.industry?.trim() ?? 'Other';
      const loc = job.location ? (job.location.split(',')[0]?.trim() ?? 'Other') : 'Remote';

      // Aggregate individual skills
      for (const skill of skills) {
        currentSkillCounts.set(skill, (currentSkillCounts.get(skill) ?? 0) + 1);

        // By Role
        let rMap = roleSkillMap.get(role);
        if (!rMap) {
          rMap = new Map();
          roleSkillMap.set(role, rMap);
        }
        rMap.set(skill, (rMap.get(skill) ?? 0) + 1);

        // By Industry
        let indMap = industrySkillMap.get(industry);
        if (!indMap) {
          indMap = new Map();
          industrySkillMap.set(industry, indMap);
        }
        indMap.set(skill, (indMap.get(skill) ?? 0) + 1);

        // By Location
        let lMap = locationSkillMap.get(loc);
        if (!lMap) {
          lMap = new Map();
          locationSkillMap.set(loc, lMap);
        }
        lMap.set(skill, (lMap.get(skill) ?? 0) + 1);
      }

      // 2. Co-occurrences
      for (let i = 0; i < skills.length; i++) {
        for (let j = i + 1; j < skills.length; j++) {
          const s1 = skills[i];
          const s2 = skills[j];
          if (s1 && s2) {
            const pairKey = s1 < s2 ? `${s1}::${s2}` : `${s2}::${s1}`;
            coOccurrenceMap.set(pairKey, (coOccurrenceMap.get(pairKey) ?? 0) + 1);
          }
        }
      }
    }

    // 3. Process previous period jobs for growth calculation
    const previousSkillCounts = new Map<string, number>();
    for (const job of previousJobs) {
      const skills = Array.from(
        new Set(job.requirements.map((s) => s.trim()).filter((s) => s.length > 1)),
      );
      for (const skill of skills) {
        previousSkillCounts.set(skill, (previousSkillCounts.get(skill) ?? 0) + 1);
      }
    }

    // 4. Build Top Demanded Skills
    const topDemandedSkills: SkillDemandItem[] = Array.from(currentSkillCounts.entries())
      .map(([skill, count]) => ({
        skill,
        count,
        percentage: totalJobs > 0 ? Math.round((count / totalJobs) * 1000) / 10 : 0,
        sampleSize: totalJobs,
        hasSufficientData: count >= 3,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 25);

    // 5. Build Fastest Growing Skills (minimum threshold to prevent small sample distortion)
    const fastestGrowingSkills: SkillDemandItem[] = [];
    if (previousJobs.length >= 5 && totalJobs >= 5) {
      for (const [skill, curCount] of currentSkillCounts.entries()) {
        const prevCount = previousSkillCounts.get(skill) ?? 0;
        // Require at least 3 occurrences in current period for statistical validity
        if (curCount >= 3) {
          const growth =
            prevCount === 0 ? 100 : Math.round(((curCount - prevCount) / prevCount) * 1000) / 10;
          if (growth > 0) {
            fastestGrowingSkills.push({
              skill,
              count: curCount,
              percentage: Math.round((curCount / totalJobs) * 1000) / 10,
              growthRate: growth,
              sampleSize: curCount + prevCount,
              hasSufficientData: curCount + prevCount >= 5,
            });
          }
        }
      }
      fastestGrowingSkills.sort((a, b) => (b.growthRate ?? 0) - (a.growthRate ?? 0));
    }

    // 6. Build Top Skill Combinations
    const topSkillCombinations: SkillCoOccurrence[] = Array.from(coOccurrenceMap.entries())
      .map(([pair, count]) => {
        const parts = pair.split('::');
        const primarySkill = parts[0] ?? '';
        const coOccurringSkill = parts[1] ?? '';
        const pCount = currentSkillCounts.get(primarySkill) ?? 1;
        const cCount = currentSkillCounts.get(coOccurringSkill) ?? 1;
        const strength = Math.round((count / Math.min(pCount, cCount)) * 100) / 100;
        return {
          primarySkill,
          coOccurringSkill,
          coOccurrenceCount: count,
          strength,
        };
      })
      .filter((combo) => combo.coOccurrenceCount >= 2)
      .sort((a, b) => b.coOccurrenceCount - a.coOccurrenceCount)
      .slice(0, 20);

    // 7. Breakdown Maps conversion
    const formatBreakdown = (
      sourceMap: Map<string, Map<string, number>>,
    ): Record<string, { skill: string; count: number }[]> => {
      const result: Record<string, { skill: string; count: number }[]> = {};
      for (const [key, map] of sourceMap.entries()) {
        result[key] = Array.from(map.entries())
          .map(([skill, count]) => ({ skill, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);
      }
      return result;
    };

    return {
      topDemandedSkills,
      fastestGrowingSkills: fastestGrowingSkills.slice(0, 15),
      topSkillCombinations,
      skillsByRole: formatBreakdown(roleSkillMap),
      skillsByIndustry: formatBreakdown(industrySkillMap),
      skillsByLocation: formatBreakdown(locationSkillMap),
      dataFreshness: {
        calculatedAt: now.toISOString(),
        sampleSize: totalJobs,
      },
    };
  }

  private normalizeRole(title: string): string {
    const lower = title.toLowerCase();
    if (lower.includes('front') || lower.includes('react') || lower.includes('vue'))
      return 'Frontend';
    if (lower.includes('back') || lower.includes('node') || lower.includes('spring'))
      return 'Backend';
    if (lower.includes('full') || lower.includes('mern')) return 'Full Stack';
    if (lower.includes('data sci') || lower.includes('anal')) return 'Data Science';
    if (lower.includes('machine learn') || lower.includes(' ai') || lower.includes('ml'))
      return 'AI / ML';
    if (lower.includes('devops') || lower.includes('cloud')) return 'DevOps & Cloud';
    if (lower.includes('mobile') || lower.includes('android') || lower.includes('ios'))
      return 'Mobile';
    return 'Software Engineering';
  }
}
