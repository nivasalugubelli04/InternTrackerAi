import { Injectable, Logger } from '@nestjs/common';
import { JobPostingStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

export enum SkillGapPriorityLevel {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export interface UserMarketSkillComparison {
  skill: string;
  userProficiency?: string;
  marketDemandLevel: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW';
  jobPostingFrequency: number;
  percentageOfMarket: number;
  isUserPossessed: boolean;
}

export interface PrioritizedSkillGap {
  skill: string;
  priority: SkillGapPriorityLevel;
  targetRoleRelevancePercentage: number;
  marketFrequency: number;
  rationale: string;
}

export interface PersonalizedMarketPositionDto {
  userId: string;
  overallMarketReadinessScore: number; // 0 to 100
  strongMarketAlignedSkills: string[];
  prioritizedSkillGaps: PrioritizedSkillGap[];
  allSkillComparisons: UserMarketSkillComparison[];
  recommendedRoles: { role: string; alignmentPercentage: number; matchingJobsCount: number }[];
  recommendedCompaniesToTrack: { companyId: string; companyName: string; activeOpenings: number }[];
  recommendedLocations: { location: string; matchingJobsCount: number }[];
  summaryNote: string;
  generatedAt: string;
}

@Injectable()
export class UserMarketPositionService {
  private readonly logger = new Logger(UserMarketPositionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Evaluates how a user's skills compare with live market demand.
   */
  async getUserMarketPosition(userId: string): Promise<PersonalizedMarketPositionDto> {
    this.logger.debug(`Computing market position for user ${userId}`);
    const now = new Date();

    // 1. Fetch user skills and active jobs
    const [userSkills, activeJobs] = await Promise.all([
      this.prisma.userSkill.findMany({
        where: { userId },
        include: { skill: true },
      }),
      this.prisma.jobPosting.findMany({
        where: { status: JobPostingStatus.ACTIVE },
        select: {
          id: true,
          title: true,
          location: true,
          requirements: true,
          company: {
            select: { id: true, name: true },
          },
        },
      }),
    ]);

    const userSkillNames = new Set(userSkills.map((us) => us.skill.name.toLowerCase().trim()));

    const totalActiveJobs = activeJobs.length;

    // 2. Compute market skill frequency
    const marketSkillCounts = new Map<string, { count: number; canonicalName: string }>();
    for (const job of activeJobs) {
      for (const req of job.requirements) {
        const clean = req.trim();
        const lower = clean.toLowerCase();
        if (clean.length > 1) {
          const entry = marketSkillCounts.get(lower) ?? { count: 0, canonicalName: clean };
          entry.count++;
          marketSkillCounts.set(lower, entry);
        }
      }
    }

    // 3. Compare user skills vs market
    const allComparisons: UserMarketSkillComparison[] = [];
    const strongSkills: string[] = [];
    const gaps: PrioritizedSkillGap[] = [];

    let alignedSkillsWeight = 0;
    let totalTargetDemandWeight = 0;

    for (const [lowerSkill, data] of marketSkillCounts.entries()) {
      const percentage =
        totalActiveJobs > 0 ? Math.round((data.count / totalActiveJobs) * 1000) / 10 : 0;

      let demandLevel: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
      if (percentage >= 30) demandLevel = 'VERY_HIGH';
      else if (percentage >= 15) demandLevel = 'HIGH';
      else if (percentage >= 5) demandLevel = 'MEDIUM';

      const isPossessed = userSkillNames.has(lowerSkill);

      allComparisons.push({
        skill: data.canonicalName,
        marketDemandLevel: demandLevel,
        jobPostingFrequency: data.count,
        percentageOfMarket: percentage,
        isUserPossessed: isPossessed,
      });

      if (isPossessed) {
        if (demandLevel === 'VERY_HIGH' || demandLevel === 'HIGH') {
          strongSkills.push(data.canonicalName);
        }
        alignedSkillsWeight += data.count;
      } else if (data.count >= 2) {
        // Evaluate gap priority
        let priority: SkillGapPriorityLevel = SkillGapPriorityLevel.LOW;
        if (percentage >= 35) priority = SkillGapPriorityLevel.CRITICAL;
        else if (percentage >= 20) priority = SkillGapPriorityLevel.HIGH;
        else if (percentage >= 10) priority = SkillGapPriorityLevel.MEDIUM;

        gaps.push({
          skill: data.canonicalName,
          priority,
          targetRoleRelevancePercentage: percentage,
          marketFrequency: data.count,
          rationale: `${data.canonicalName} is required in ${percentage}% of current technical internship postings.`,
        });
      }

      totalTargetDemandWeight += data.count;
    }

    // Sort skill gaps by priority
    const priorityOrder: Record<SkillGapPriorityLevel, number> = {
      [SkillGapPriorityLevel.CRITICAL]: 4,
      [SkillGapPriorityLevel.HIGH]: 3,
      [SkillGapPriorityLevel.MEDIUM]: 2,
      [SkillGapPriorityLevel.LOW]: 1,
    };
    gaps.sort(
      (a, b) =>
        priorityOrder[b.priority] - priorityOrder[a.priority] ||
        b.marketFrequency - a.marketFrequency,
    );

    allComparisons.sort((a, b) => b.jobPostingFrequency - a.jobPostingFrequency);

    // 4. Market Readiness Score (0 to 100)
    const readinessScore =
      totalTargetDemandWeight > 0
        ? Math.min(100, Math.round((alignedSkillsWeight / (totalTargetDemandWeight * 0.35)) * 100))
        : userSkillNames.size > 0
          ? 60
          : 30;

    // 5. Recommended Roles based on skill overlap
    const roleOverlaps = new Map<string, { totalJobs: number; matchingJobs: number }>();
    const companyMatches = new Map<string, { id: string; name: string; count: number }>();
    const locationCounts = new Map<string, number>();

    for (const job of activeJobs) {
      const roleName = this.normalizeRole(job.title);
      const entry = roleOverlaps.get(roleName) ?? { totalJobs: 0, matchingJobs: 0 };
      entry.totalJobs++;

      const jobSkillSet = new Set(job.requirements.map((r) => r.toLowerCase().trim()));
      let hasMatchingSkill = false;
      for (const us of userSkillNames) {
        if (jobSkillSet.has(us)) {
          hasMatchingSkill = true;
          break;
        }
      }

      if (hasMatchingSkill) {
        entry.matchingJobs++;

        if (job.company) {
          const comp = companyMatches.get(job.company.id) ?? {
            id: job.company.id,
            name: job.company.name,
            count: 0,
          };
          comp.count++;
          companyMatches.set(job.company.id, comp);
        }

        const loc = job.location ? (job.location.split(',')[0]?.trim() ?? 'Other') : 'Remote';
        locationCounts.set(loc, (locationCounts.get(loc) ?? 0) + 1);
      }

      roleOverlaps.set(roleName, entry);
    }

    const recommendedRoles = Array.from(roleOverlaps.entries())
      .map(([role, data]) => ({
        role,
        alignmentPercentage:
          data.totalJobs > 0 ? Math.round((data.matchingJobs / data.totalJobs) * 100) : 0,
        matchingJobsCount: data.matchingJobs,
      }))
      .sort((a, b) => b.matchingJobsCount - a.matchingJobsCount)
      .slice(0, 5);

    const recommendedCompanies = Array.from(companyMatches.values())
      .map((c) => ({
        companyId: c.id,
        companyName: c.name,
        activeOpenings: c.count,
      }))
      .sort((a, b) => b.activeOpenings - a.activeOpenings)
      .slice(0, 6);

    const recommendedLocations = Array.from(locationCounts.entries())
      .map(([location, count]) => ({ location, matchingJobsCount: count }))
      .sort((a, b) => b.matchingJobsCount - a.matchingJobsCount)
      .slice(0, 5);

    const summaryNote =
      userSkillNames.size > 0
        ? `Your profile aligns strongly with ${strongSkills.length} in-demand market skills. Focus on top prioritized skill gaps to unlock more opportunities.`
        : 'Add your skills to see how you compare with live market demand.';

    return {
      userId,
      overallMarketReadinessScore: readinessScore,
      strongMarketAlignedSkills: strongSkills.slice(0, 10),
      prioritizedSkillGaps: gaps.slice(0, 8),
      allSkillComparisons: allComparisons.slice(0, 30),
      recommendedRoles,
      recommendedCompaniesToTrack: recommendedCompanies,
      recommendedLocations,
      summaryNote,
      generatedAt: now.toISOString(),
    };
  }

  private normalizeRole(title: string): string {
    const lower = title.toLowerCase();
    if (lower.includes('front')) return 'Frontend Development';
    if (lower.includes('back')) return 'Backend Development';
    if (lower.includes('full')) return 'Full Stack Development';
    if (lower.includes('data')) return 'Data Science & Analytics';
    if (lower.includes('ai') || lower.includes('ml')) return 'Machine Learning & AI';
    if (lower.includes('devops') || lower.includes('cloud')) return 'DevOps & Cloud';
    if (lower.includes('mobile')) return 'Mobile App Development';
    return 'Software Engineering';
  }
}
