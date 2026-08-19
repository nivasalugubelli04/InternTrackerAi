import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

import { SkillGapEngineService } from './skill-gap-engine.service';

export interface ReadinessBreakdown {
  overallReadiness: number; // 0 - 100
  skillReadiness: number; // 30% weight
  portfolioReadiness: number; // 20% weight
  resumeReadiness: number; // 15% weight
  interviewReadiness: number; // 15% weight
  applicationReadiness: number; // 10% weight
  goalAlignment: number; // 10% weight
  narrativeSummary: string;
  keyStrengths: string[];
  topImprovementActions: string[];
}

@Injectable()
export class CareerReadinessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly skillGapEngine: SkillGapEngineService,
  ) {}

  /**
   * Computes multi-dimensional Career Readiness score and breakdown.
   */
  async computeReadiness(userId: string): Promise<ReadinessBreakdown> {
    // 1. Skill Readiness (30% weight)
    const gapAnalysis = await this.skillGapEngine.analyzeSkillGap(userId);
    const skillReadiness = gapAnalysis.overallCoveragePercentage;

    // 2. Portfolio Readiness (20% weight)
    const completedProjects = await this.prisma.projectRecommendation.count({
      where: { userId, status: 'COMPLETED' },
    });
    const portfolioDoc = await this.prisma.portfolio.findUnique({
      where: { userId },
    });
    const portfolioReadiness = completedProjects > 0 ? 80 : portfolioDoc ? 50 : 20;

    // 3. Resume Readiness (15% weight)
    const resumes = await this.prisma.generatedResume.findMany({
      where: { userId },
      take: 1,
    });
    const resumeReadiness = resumes.length > 0 ? 85 : 30;

    // 4. Interview Readiness (15% weight)
    const interviews = await this.prisma.mockInterview.findMany({
      where: { userId, completedAt: { not: null } },
      select: { score: true, interviewReadinessScore: true },
      orderBy: { completedAt: 'desc' },
      take: 5,
    });

    let interviewReadiness = 40; // baseline if no interviews yet
    if (interviews.length > 0) {
      const totalScore = interviews.reduce(
        (sum, i) => sum + (i.interviewReadinessScore || i.score || 50),
        0,
      );
      interviewReadiness = Math.round(totalScore / interviews.length);
    }

    // 5. Application Readiness (10% weight)
    const activeApps = await this.prisma.application.count({
      where: {
        userId,
        status: { in: ['APPLIED', 'ASSESSMENT', 'INTERVIEW', 'FINAL_ROUND', 'OFFER'] },
      },
    });
    const applicationReadiness = activeApps >= 5 ? 100 : activeApps * 20;

    // 6. Goal Alignment (10% weight)
    const activeGoal = await this.prisma.learningGoal.findFirst({
      where: { userId, status: 'ACTIVE' },
    });
    const goalAlignment = activeGoal ? 90 : 40;

    // Weighted composite overall score (0 - 100)
    const overallReadiness = Math.round(
      skillReadiness * 0.3 +
        portfolioReadiness * 0.2 +
        resumeReadiness * 0.15 +
        interviewReadiness * 0.15 +
        applicationReadiness * 0.1 +
        goalAlignment * 0.1,
    );

    // Narrative & Actions
    const keyStrengths: string[] = [];
    const topImprovementActions: string[] = [];

    if (skillReadiness >= 70)
      keyStrengths.push('Strong alignment with target role skill requirements');
    else topImprovementActions.push('Focus on high-impact skill gaps to boost technical coverage');

    if (interviewReadiness >= 75)
      keyStrengths.push('High mock interview readiness & STAR structure performance');
    else
      topImprovementActions.push(
        'Complete adaptive mock interview sessions to strengthen candidate answers',
      );

    if (portfolioReadiness >= 70)
      keyStrengths.push('Demonstrated project evidence in target domain');
    else
      topImprovementActions.push(
        'Build a recommended portfolio project to demonstrate practical skills',
      );

    let narrativeSummary = `Your candidate profile is ${overallReadiness}% aligned with target ${gapAnalysis.targetRole} internship roles.`;
    if (overallReadiness >= 80) {
      narrativeSummary = `Your profile is strongly aligned with your target role. Keep maintaining active applications and interview readiness.`;
    } else if (overallReadiness >= 50) {
      narrativeSummary = `Your profile is steadily building competitive strength. Addressing your high-impact skill gaps will accelerate opportunity placement.`;
    }

    // Save/Update persistent record in database
    await this.prisma.careerReadiness.upsert({
      where: { userId },
      update: {
        overallReadiness,
        skillReadiness,
        portfolioReadiness,
        resumeReadiness,
        interviewReadiness,
        applicationReadiness,
        goalAlignment,
        breakdownJson: { keyStrengths, topImprovementActions } as any,
        lastCalculatedAt: new Date(),
      },
      create: {
        userId,
        overallReadiness,
        skillReadiness,
        portfolioReadiness,
        resumeReadiness,
        interviewReadiness,
        applicationReadiness,
        goalAlignment,
        breakdownJson: { keyStrengths, topImprovementActions } as any,
      },
    });

    return {
      overallReadiness,
      skillReadiness,
      portfolioReadiness,
      resumeReadiness,
      interviewReadiness,
      applicationReadiness,
      goalAlignment,
      narrativeSummary,
      keyStrengths,
      topImprovementActions,
    };
  }
}
