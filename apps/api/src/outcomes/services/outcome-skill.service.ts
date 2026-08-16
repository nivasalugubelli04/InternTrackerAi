/**
 * OutcomeSkillService
 *
 * Analyzes associations between user skills and outcome metrics.
 *
 * CRITICAL: Association only — never causal claims.
 * All output uses phrasing: "Users with X in their profiles showed Y in this dataset."
 * Every result includes sampleSize, timePeriod, and populationDefinition.
 *
 * Methodology:
 *  1. For each skill, identify users who have it in UserSkill
 *  2. Compare their outcome metrics against users without it
 *  3. Report as observed correlation with explicit sample sizes
 *  4. Only report skills with sufficient sample (≥ minCohortSize)
 */
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { OutcomePrivacyService } from './outcome-privacy.service';

export interface SkillOutcomeRow {
  skillName: string;
  skillCategory: string;
  usersWithSkill: number;
  applications: number;
  interviews: number;
  offers: number;
  interviewConversionRate: number;
  offerConversionRate: number;
  sampleSize: number;
  confidence: string;
  /** Association language — never causal */
  observationNote: string;
  timePeriod: string;
  populationDefinition: string;
}

@Injectable()
export class OutcomeSkillService {

  constructor(
    private readonly prisma: PrismaService,
    private readonly privacy: OutcomePrivacyService,
  ) {}

  async getBySkill(
    periodStart: Date,
    periodEnd: Date,
    topN = 20,
  ): Promise<SkillOutcomeRow[]> {
    // Get all skills with at least some users
    const skills = await this.prisma.skill.findMany({
      where: { isActive: true },
      include: { userSkills: { select: { userId: true } } },
      take: 100,
    });

    const rows: SkillOutcomeRow[] = [];

    for (const skill of skills) {
      const userIds = skill.userSkills.map((us) => us.userId);
      const guard = this.privacy.checkCohort(userIds.length);
      if (!guard.allowed) continue;

      const [appStats] = await Promise.all([
        this.prisma.application.groupBy({
          by: ['status'],
          where: {
            userId: { in: userIds },
            appliedAt: { gte: periodStart, lte: periodEnd },
          },
          _count: true,
        }),
      ]);

      const byStatus: Record<string, number> = {};
      for (const s of appStats) byStatus[s.status] = s._count;

      const apps = Object.values(byStatus).reduce((a, b) => a + b, 0);
      if (apps < guard.minCohortSize) continue;

      const interviews = byStatus['INTERVIEW'] ?? 0;
      const offers = byStatus['OFFER'] ?? 0;

      rows.push({
        skillName: skill.name,
        skillCategory: skill.category,
        usersWithSkill: userIds.length,
        applications: apps,
        interviews,
        offers,
        interviewConversionRate: apps > 0 ? Math.round((interviews / apps) * 10000) / 10000 : 0,
        offerConversionRate: interviews > 0 ? Math.round((offers / interviews) * 10000) / 10000 : 0,
        sampleSize: apps,
        confidence: apps >= 100 ? 'HIGH' : apps >= 30 ? 'MEDIUM' : 'LOW',
        observationNote: `Users with ${skill.name} in their profiles showed these outcomes in this dataset (n=${apps}). This is an observed association — not a causal relationship.`,
        timePeriod: `${periodStart.toISOString().split('T')[0]} to ${periodEnd.toISOString().split('T')[0]}`,
        populationDefinition: `Users with ${skill.name} listed in their profile who applied in the specified period.`,
      });
    }

    return rows
      .sort((a, b) => b.interviewConversionRate - a.interviewConversionRate)
      .slice(0, topN);
  }
}
