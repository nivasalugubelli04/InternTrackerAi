import { Injectable, Logger } from '@nestjs/common';
import { JobPostingStatus } from '@prisma/client';

import { AiService } from '../../ai/services/ai.service';
import { PrismaService } from '../../prisma/prisma.service';

export interface StrategicScoreBreakdown {
  targetRoleAlignment: number; // 0-20
  skillCoverage: number; // 0-30
  opportunityAvailability: number; // 0-15
  applicationReadiness: number; // 0-15
  interviewReadiness: number; // 0-15
  portfolioReadiness: number; // 0-5
}

@Injectable()
export class CareerStrategyService {
  private readonly logger = new Logger(CareerStrategyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  /**
   * Generates a comprehensive personalized career strategy report.
   */
  async getCareerStrategy(userId: string) {
    this.logger.log(`Generating Career Strategy for user: ${userId}`);

    // 1. Fetch user data
    const [user, userSkills, applications, mockInterviews, activeGoal, preferences] =
      await Promise.all([
        this.prisma.user.findUnique({
          where: { id: userId },
          include: { profile: true },
        }),
        this.prisma.userSkill.findMany({
          where: { userId },
          include: { skill: true },
        }),
        this.prisma.application.findMany({
          where: { userId },
        }),
        this.prisma.mockInterview.findMany({
          where: { userId, status: 'COMPLETED' },
        }),
        this.prisma.careerGoal.findFirst({
          where: { userId },
          orderBy: { updatedAt: 'desc' },
        }),
        this.prisma.careerPreference.findUnique({
          where: { userId },
        }),
      ]);

    const targetRole =
      activeGoal?.targetRole || preferences?.preferredRoles?.[0] || 'Software Engineer Intern';

    // 2. Fetch all active job postings to compute statistics
    const activeJobs = await this.prisma.jobPosting.findMany({
      where: { status: JobPostingStatus.ACTIVE },
      select: { requirements: true, title: true, companyId: true, company: true },
    });

    const totalJobs = activeJobs.length;

    // 3. Compute Strategic Score breakdown
    const scoreBreakdown = this.calculateStrategicScoreBreakdown({
      hasTarget: !!(activeGoal || preferences?.preferredRoles?.length),
      userSkillsCount: userSkills.length,
      activeJobs,
      targetRole,
      applications,
      mockInterviews,
      profile: user?.profile || null,
    });

    const overallScore =
      scoreBreakdown.targetRoleAlignment +
      scoreBreakdown.skillCoverage +
      scoreBreakdown.opportunityAvailability +
      scoreBreakdown.applicationReadiness +
      scoreBreakdown.interviewReadiness +
      scoreBreakdown.portfolioReadiness;

    // Save or update score in database for persistence
    await this.prisma.careerReadiness.upsert({
      where: { userId },
      update: {
        overallReadiness: overallScore,
        skillReadiness: (scoreBreakdown.skillCoverage / 30) * 100,
        portfolioReadiness: (scoreBreakdown.portfolioReadiness / 5) * 100,
        resumeReadiness: user?.profile ? 80 : 20,
        applicationReadiness: (scoreBreakdown.applicationReadiness / 15) * 100,
        interviewReadiness: (scoreBreakdown.interviewReadiness / 15) * 100,
        goalAlignment: (scoreBreakdown.targetRoleAlignment / 20) * 100,
        breakdownJson: JSON.parse(JSON.stringify(scoreBreakdown)),
        lastCalculatedAt: new Date(),
      },
      create: {
        userId,
        overallReadiness: overallScore,
        skillReadiness: (scoreBreakdown.skillCoverage / 30) * 100,
        portfolioReadiness: (scoreBreakdown.portfolioReadiness / 5) * 100,
        resumeReadiness: user?.profile ? 80 : 20,
        applicationReadiness: (scoreBreakdown.applicationReadiness / 15) * 100,
        interviewReadiness: (scoreBreakdown.interviewReadiness / 15) * 100,
        goalAlignment: (scoreBreakdown.targetRoleAlignment / 20) * 100,
        breakdownJson: JSON.parse(JSON.stringify(scoreBreakdown)),
      },
    });

    // 4. Generate Skill Priority Matrix
    const skillCounts = new Map<string, number>();
    for (const job of activeJobs) {
      for (const req of job.requirements) {
        const clean = req.trim().toLowerCase();
        skillCounts.set(clean, (skillCounts.get(clean) ?? 0) + 1);
      }
    }

    const userSkillNames = new Set(userSkills.map((us) => us.skill.name.toLowerCase().trim()));

    const priorityMatrix = {
      highestPriority: [] as string[], // High Demand + User Gap
      maintain: [] as string[], // High Demand + User Strong
      lowerPriority: [] as string[], // Low Demand + User Gap
      optional: [] as string[], // Low Demand + User Strong
    };

    // Evaluate all distinct active market skills
    Array.from(skillCounts.entries()).forEach(([name, count]) => {
      const percentage = totalJobs > 0 ? (count / totalJobs) * 100 : 0;
      const isHighDemand = percentage >= 15;
      const isUserStrong = userSkillNames.has(name);

      const display = name.toUpperCase();
      if (isHighDemand && !isUserStrong) priorityMatrix.highestPriority.push(display);
      else if (isHighDemand && isUserStrong) priorityMatrix.maintain.push(display);
      else if (!isHighDemand && !isUserStrong) priorityMatrix.lowerPriority.push(display);
      else priorityMatrix.optional.push(display);
    });

    // 5. Adjacent Careers Discovery
    const adjacentRoles = await this.calculateAdjacentRoles(
      targetRole,
      userSkills.map((us) => us.skill.name),
    );

    // 6. Generate personal AI strategy summary text
    let strategySummary = '';
    let isFallback = false;

    const summaryContext = {
      targetRole,
      overallScore,
      scoreBreakdown,
      highestPriorityGaps: priorityMatrix.highestPriority.slice(0, 4),
      maintainSkills: priorityMatrix.maintain.slice(0, 4),
      nextAction:
        priorityMatrix.highestPriority.length > 0
          ? `Complete a learning module or project on ${priorityMatrix.highestPriority[0]}`
          : 'Optimize your portfolio and mock interview scores.',
    };

    try {
      const systemPrompt = `You are a grounded Career Strategy Assistant. Ground your suggestions completely in the provided context metrics.
Explain the student's career strategy status facts. Why are they positioned well or poorly? What concrete actions should they take?
Keep it concise, with short paragraphs and bullet points.`;
      const userPrompt = `Student career metrics:\n${JSON.stringify(summaryContext)}`;

      const provider = (this.aiService as any).aiProvider;
      if (provider && typeof provider.generateText === 'function') {
        const aiResult = await provider.generateText(userPrompt, systemPrompt);
        strategySummary = aiResult.text;
      } else {
        throw new Error('AI Provider offline');
      }
    } catch (err) {
      isFallback = true;
      strategySummary = `YOUR CURRENT STRATEGY (Fallback templates)
Target: ${targetRole}
Strategic Score: ${overallScore}% aligned with your goals.
Strongest Areas: ${summaryContext.maintainSkills.join(', ') || 'Not configured'}
Priority Gaps: ${summaryContext.highestPriorityGaps.join(', ') || 'None identified'}
Next Action: ${summaryContext.nextAction}
Reasoning: You are highly matched for jobs requiring ${summaryContext.maintainSkills.slice(0, 2).join(', ')}. Improving your understanding of ${summaryContext.highestPriorityGaps.slice(0, 2).join(', ')} will unlock significantly more listings on the platform.`;
    }

    return {
      targetRole,
      overallScore,
      scoreBreakdown,
      priorityMatrix: {
        highestPriority: priorityMatrix.highestPriority.slice(0, 6),
        maintain: priorityMatrix.maintain.slice(0, 6),
        lowerPriority: priorityMatrix.lowerPriority.slice(0, 6),
        optional: priorityMatrix.optional.slice(0, 6),
      },
      adjacentRoles,
      strategySummary,
      isAiPowered: !isFallback,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Calculate score breakdown out of 100.
   */
  private calculateStrategicScoreBreakdown(params: {
    hasTarget: boolean;
    userSkillsCount: number;
    activeJobs: { title: string; requirements: string[] }[];
    targetRole: string;
    applications: any[];
    mockInterviews: any[];
    profile: any;
  }): StrategicScoreBreakdown {
    // 1. Target Role Alignment (Max 20)
    const targetRoleAlignment = params.hasTarget ? 20 : 0;

    // 2. Skill Coverage (Max 30)
    // Overlap with postings for that target role
    const matchedJobs = params.activeJobs.filter((job) =>
      job.title.toLowerCase().includes(params.targetRole.toLowerCase()),
    );
    const targetSkills = new Set<string>();
    for (const j of matchedJobs) {
      j.requirements.forEach((req) => targetSkills.add(req.toLowerCase().trim()));
    }
    const skillCoverage =
      targetSkills.size > 0
        ? Math.min(30, Math.round((params.userSkillsCount / targetSkills.size) * 30))
        : Math.min(30, params.userSkillsCount * 3);

    // 3. Opportunity Availability (Max 15)
    // Based on actual platform posting volumes
    const targetCount = matchedJobs.length;
    let opportunityAvailability = 0;
    if (targetCount >= 10) opportunityAvailability = 15;
    else if (targetCount >= 5) opportunityAvailability = 10;
    else if (targetCount > 0) opportunityAvailability = 5;

    // 4. Application Readiness (Max 15)
    const activeApps = params.applications.filter(
      (app) => app.status !== 'REJECTED' && app.status !== 'WITHDRAWN' && app.status !== 'SAVED',
    ).length;
    const applicationReadiness = Math.min(15, activeApps * 5);

    // 5. Interview Readiness (Max 15)
    const avgMockScore =
      params.mockInterviews.length > 0
        ? params.mockInterviews.reduce((sum, m) => sum + (m.score ?? 0), 0) /
          params.mockInterviews.length
        : 0;
    const interviewReadiness =
      avgMockScore > 0 ? Math.min(15, Math.round((avgMockScore / 100) * 15)) : 5;

    // 6. Portfolio Readiness (Max 5)
    let portfolioReadiness = 0;
    if (params.profile?.githubUrl) portfolioReadiness += 2;
    if (params.profile?.linkedinUrl) portfolioReadiness += 2;
    if (params.profile?.portfolioUrl) portfolioReadiness += 1;

    return {
      targetRoleAlignment,
      skillCoverage,
      opportunityAvailability,
      applicationReadiness,
      interviewReadiness,
      portfolioReadiness,
    };
  }

  /**
   * Computes adjacent role overlaps based on database role-skills configuration.
   */
  private async calculateAdjacentRoles(targetRole: string, userSkillNames: string[]) {
    // Fetch all roles in database
    const roles = await this.prisma.role.findMany({
      include: {
        roleSkills: {
          include: { skill: true },
        },
      },
    });

    const target = roles.find(
      (r) => r.name.toLowerCase().trim() === targetRole.toLowerCase().trim(),
    );
    const targetSkillsSet = new Set(
      target?.roleSkills.map((rs) => rs.skill.name.toLowerCase().trim()) ?? [],
    );

    return roles
      .filter((r) => r.name.toLowerCase().trim() !== targetRole.toLowerCase().trim())
      .map((r) => {
        const otherSkills = r.roleSkills.map((rs) => rs.skill.name.toLowerCase().trim());
        const totalOther = otherSkills.length;
        if (totalOther === 0) return { role: r.name, overlapPercentage: 0, skillGapsCount: 0 };

        const matchedSkills = otherSkills.filter(
          (s) => targetSkillsSet.has(s) || userSkillNames.map((us) => us.toLowerCase()).includes(s),
        );
        const overlapPercentage = Math.round((matchedSkills.length / totalOther) * 100);
        const gaps = otherSkills.filter(
          (s) => !userSkillNames.map((us) => us.toLowerCase()).includes(s),
        );

        return {
          role: r.name,
          overlapPercentage,
          skillGapsCount: gaps.length,
          gapsList: gaps.slice(0, 3).map((g) => g.toUpperCase()),
        };
      })
      .sort((a, b) => b.overlapPercentage - a.overlapPercentage)
      .slice(0, 4);
  }

  /**
   * Generates a job market hiring forecast.
   */
  async getHiringForecast(userId: string) {
    const activeGoal = await this.prisma.careerGoal.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
    const preferences = await this.prisma.careerPreference.findUnique({
      where: { userId },
    });
    const targetRole =
      activeGoal?.targetRole || preferences?.preferredRoles?.[0] || 'Software Engineer';

    // Query active and historical postings matching this role to see historical timeline
    const postings = await this.prisma.jobPosting.findMany({
      where: {
        title: { contains: targetRole, mode: 'insensitive' },
      },
      select: { createdAt: true },
    });

    const totalSample = postings.length;
    const dataWindowMonths = 6;

    // Monthly bucket counts (past 6 months)
    const buckets = Array(dataWindowMonths).fill(0);
    const now = new Date();
    postings.forEach((p) => {
      const diffMs = now.getTime() - p.createdAt.getTime();
      const diffMonths = Math.floor(diffMs / (30 * 24 * 60 * 60 * 1000));
      if (diffMonths >= 0 && diffMonths < dataWindowMonths) {
        buckets[diffMonths]++;
      }
    });

    // Reverse to show chronologically
    const historyData = buckets.reverse();

    // Data Sufficiency check
    if (totalSample < 5) {
      return {
        targetRole,
        forecastText: 'Not enough data yet to identify a reliable hiring forecast.',
        confidence: 'LOW',
        sampleSize: totalSample,
        dataWindowMonths,
        hasSufficientData: false,
        projection: [],
      };
    }

    const averageMonthlyCount = Math.round((totalSample / dataWindowMonths) * 10) / 10;
    const trendDirection =
      historyData[dataWindowMonths - 1] >= historyData[0] ? 'RISING' : 'DECLINING';

    let confidence = 'LOW';
    if (totalSample >= 30) confidence = 'HIGH';
    else if (totalSample >= 10) confidence = 'MODERATE';

    const projection = Array(3)
      .fill(0)
      .map((_, i) => {
        const factor = trendDirection === 'RISING' ? 1.1 + i * 0.05 : 0.9 - i * 0.05;
        return {
          month: new Date(now.getFullYear(), now.getMonth() + i + 1, 1).toLocaleString('default', {
            month: 'long',
          }),
          expectedPostings: Math.max(1, Math.round(averageMonthlyCount * factor)),
        };
      });

    return {
      targetRole,
      forecastText: `Hiring for "${targetRole}" is expected to remain ${trendDirection.toLowerCase()} over the next quarter based on ${totalSample} observed postings.`,
      confidence,
      sampleSize: totalSample,
      dataWindowMonths,
      hasSufficientData: true,
      projection,
      historyData,
    };
  }

  /**
   * Aggregates company intelligence.
   */
  async getCompanyIntelligence(companyId: string, userId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: {
        jobPostings: {
          select: {
            id: true,
            title: true,
            requirements: true,
            stipend: true,
            postedDate: true,
            status: true,
          },
        },
      },
    });

    if (!company) {
      return null;
    }

    const activeJobs = company.jobPostings.filter((p) => p.status === JobPostingStatus.ACTIVE);
    const tracking = await this.prisma.trackedCompany.findUnique({
      where: {
        userId_companyId: { userId, companyId },
      },
    });

    const userSkills = await this.prisma.userSkill.findMany({
      where: { userId },
      include: { skill: true },
    });

    const userSkillNames = new Set(userSkills.map((us) => us.skill.name.toLowerCase().trim()));

    // Calculate match score
    const requiredSkills = new Set<string>();
    activeJobs.forEach((job) => {
      job.requirements.forEach((req) => requiredSkills.add(req.toLowerCase().trim()));
    });

    let matchPercentage = 0;
    if (requiredSkills.size > 0) {
      let matchedCount = 0;
      requiredSkills.forEach((s) => {
        if (userSkillNames.has(s)) matchedCount++;
      });
      matchPercentage = Math.round((matchedCount / requiredSkills.size) * 100);
    } else {
      matchPercentage = userSkillNames.size > 0 ? 50 : 0;
    }

    // Historical hiring timeline
    const now = new Date();
    const months = Array(6)
      .fill(0)
      .map((_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        return {
          month: d.toLocaleString('default', { month: 'long' }),
          year: d.getFullYear(),
          count: 0,
        };
      })
      .reverse();

    company.jobPostings.forEach((p) => {
      const date = p.postedDate ?? new Date();
      months.forEach((m) => {
        if (
          date.toLocaleString('default', { month: 'long' }) === m.month &&
          date.getFullYear() === m.year
        ) {
          m.count++;
        }
      });
    });

    // Check if user has applications to this company
    const applications = await this.prisma.application.findMany({
      where: {
        userId,
        job: { companyId },
      },
      select: {
        id: true,
        status: true,
        jobTitleSnapshot: true,
        appliedAt: true,
      },
    });

    return {
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
        logoUrl: company.logoUrl,
        website: company.website,
        industry: company.industry,
        headquarters: company.headquarters,
      },
      isTracked: !!tracking?.trackingEnabled,
      priority: tracking?.priority ?? 'MEDIUM',
      activeJobsCount: activeJobs.length,
      activeJobs: activeJobs.slice(0, 5),
      matchPercentage,
      requiredSkills: Array.from(requiredSkills)
        .slice(0, 8)
        .map((s) => s.toUpperCase()),
      hiringTimeline: months,
      applications,
    };
  }
}
