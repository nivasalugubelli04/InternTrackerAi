import { Injectable } from '@nestjs/common';
import { ApplicationStatus, HiringInterviewStatus, AssignmentStatus } from '@prisma/client';

import { RecommendationService } from '../../matching/services/recommendation.service';
import { PrismaService } from '../../prisma/prisma.service';

import { ActionOrchestrationService } from './action-orchestration.service';
import { ReadinessCalculatorService } from './readiness-calculator.service';

@Injectable()
export class CareerCenterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly readinessCalculator: ReadinessCalculatorService,
    private readonly actionOrchestrator: ActionOrchestrationService,
    private readonly recommendationService: RecommendationService,
  ) {}

  /**
   * Main dashboard aggregation endpoint combining all parts for quick loading.
   */
  async getDashboard(userId: string) {
    const [
      summary,
      actions,
      opportunities,
      applications,
      interviews,
      assessments,
      learning,
      skills,
      readiness,
      notifications,
    ] = await Promise.all([
      this.getSummary(userId),
      this.actionOrchestrator.getPrioritizedActions(userId),
      this.getOpportunities(userId),
      this.getApplicationsSummary(userId),
      this.getInterviewsSummary(userId),
      this.getAssessmentsSummary(userId),
      this.getLearningSummary(userId),
      this.getSkillGapsSummary(userId),
      this.readinessCalculator.calculateReadiness(userId),
      this.getNotificationsSummary(userId),
    ]);

    return {
      summary,
      actions,
      opportunities,
      applications,
      interviews,
      assessments,
      learning,
      skills,
      readiness,
      notifications,
    };
  }

  /**
   * Returns career overview stats (target role, career goal, counts, etc.).
   * Data sources clearly mapped: Profile -> profiles, CareerGoal -> career_goals, etc.
   */
  async getSummary(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        careerGoals: { take: 1, orderBy: { updatedAt: 'desc' } },
        careerPreference: true,
        userSkills: { include: { skill: true } },
        applications: true,
        candidateHiringInterviews: true,
        candidateOffers: true,
        learningEnrollments: { where: { status: 'COMPLETED' } },
        mockInterviews: { where: { status: 'COMPLETED' } },
      },
    });

    if (!user) return null;

    const primaryGoal = user.careerGoals[0] || null;
    const targetRole =
      primaryGoal?.targetRole ||
      user.careerPreference?.preferredRoles?.[0] ||
      'Software Engineer Intern';

    const profileCompletion = user.profile
      ? Math.round(
          ((user.profile.phone ? 1 : 0) +
            (user.profile.bio ? 1 : 0) +
            (user.profile.headline ? 1 : 0) +
            (user.profile.college ? 1 : 0) +
            (user.profile.degree ? 1 : 0) +
            (user.profile.cgpa ? 1 : 0) +
            (user.profile.linkedinUrl ? 1 : 0) +
            (user.profile.githubUrl ? 1 : 0)) *
            12.5,
        )
      : 0;

    const completedMocks = user.mockInterviews;
    const averageSimScore =
      completedMocks.length > 0
        ? Math.round(
            completedMocks.reduce((sum, m) => sum + (m.score ?? 0), 0) / completedMocks.length,
          )
        : null;

    return {
      targetRole,
      careerGoal: primaryGoal
        ? `Land a role at ${primaryGoal.targetCompany || 'a top technology company'} by ${primaryGoal.targetDate?.toLocaleDateString() || 'target date'}`
        : 'Not configured yet',
      profileCompletion,
      topSkills: user.userSkills.slice(0, 5).map((us) => us.skill.name),
      currentSkillDevelopment: user.userSkills
        .filter((us) => us.proficiency === 'BEGINNER' || us.proficiency === 'INTERMEDIATE')
        .map((us) => us.skill.name),
      applicationCount: user.applications.length,
      interviewCount: user.candidateHiringInterviews.filter(
        (i) => i.status === HiringInterviewStatus.SCHEDULED,
      ).length,
      offerCount: user.candidateOffers.length,
      learningProgress: user.learningEnrollments.length,
      simulationPerformance: averageSimScore,
    };
  }

  /**
   * Returns top matching opportunities (reuses Phase 5 RecommendationService).
   */
  async getOpportunities(userId: string) {
    const recs = await this.recommendationService.getRecommendations(userId, { limit: 5 });
    return recs.data.map((r) => ({
      id: r.id,
      jobId: r.jobId,
      role: r.job.title,
      company: r.job.company.name,
      location: r.job.location,
      workMode: r.job.workMode,
      deadline: r.job.deadline,
      matchScore: r.matchScore?.overallScore ?? 0,
      reasons: r.reasons.map((reason) => reason.description),
      freshness: this.classifyFreshness(r.job.createdAt),
    }));
  }

  /**
   * Returns application tracking statistics.
   */
  async getApplicationsSummary(userId: string) {
    const apps = await this.prisma.application.findMany({
      where: { userId },
    });

    const stats = {
      active: apps.filter((a) =>
        [
          ApplicationStatus.APPLIED,
          ApplicationStatus.ASSESSMENT,
          ApplicationStatus.INTERVIEW,
          ApplicationStatus.OFFER,
        ].includes(a.status as any),
      ).length,
      awaitingResponse: apps.filter((a) => a.status === ApplicationStatus.APPLIED).length,
      assessmentPending: apps.filter((a) => a.status === ApplicationStatus.ASSESSMENT).length,
      interviewScheduled: apps.filter((a) => a.status === ApplicationStatus.INTERVIEW).length,
      offerReceived: apps.filter((a) => a.status === ApplicationStatus.OFFER).length,
      recentlyRejected: apps.filter((a) => a.status === ApplicationStatus.REJECTED).length,
      withdrawn: apps.filter((a) => a.status === ApplicationStatus.WITHDRAWN).length,
    };

    return stats;
  }

  /**
   * Returns upcoming recruiter interviews and prep details.
   */
  async getInterviewsSummary(userId: string) {
    const upcoming = await this.prisma.hiringInterview.findMany({
      where: {
        candidateId: userId,
        status: { in: [HiringInterviewStatus.SCHEDULED, HiringInterviewStatus.CONFIRMED] },
      },
      include: { job: { include: { company: true } } },
      orderBy: { scheduledStart: 'asc' },
    });

    const interviews = await Promise.all(
      upcoming.map(async (i) => {
        // Query if there is prep plan
        const prepPlan = i.jobId
          ? await this.prisma.preparationPlan.findFirst({
              where: { userId, jobId: i.jobId },
              include: { tasks: true },
            })
          : null;

        // Query mock interview score if any completed mock matches the job role
        const mockMatch = i.jobId
          ? await this.prisma.mockInterview.findFirst({
              where: { userId, jobId: i.jobId, status: 'COMPLETED' },
              orderBy: { score: 'desc' },
            })
          : null;

        return {
          id: i.id,
          title: i.title,
          type: i.type,
          company: i.job?.company.name || 'Recruiter',
          role: i.job?.title || 'Target Role',
          scheduledStart: i.scheduledStart,
          meetingUrl: i.meetingUrl,
          preparationStatus: prepPlan
            ? prepPlan.tasks.every((t) => t.status === 'COMPLETED')
              ? 'READY'
              : 'IN_PROGRESS'
            : 'NOT_STARTED',
          simulationScore: mockMatch?.score || null,
          recommendedPrep: prepPlan?.tasks
            .filter((t) => t.status === 'TODO')
            .slice(0, 3)
            .map((t) => t.title) || [
            'Prepare behavioral STAR questions',
            'Upload and review resume matches',
          ],
        };
      }),
    );

    return interviews;
  }

  /**
   * Returns assessment summary details.
   */
  async getAssessmentsSummary(userId: string) {
    const assignments = await this.prisma.assessmentAssignment.findMany({
      where: {
        candidateId: userId,
        status: {
          in: [AssignmentStatus.ASSIGNED, AssignmentStatus.STARTED, AssignmentStatus.IN_PROGRESS],
        },
      },
      include: {
        assessment: true,
        recruiterOrg: { include: { organization: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return assignments.map((a) => ({
      id: a.id,
      title: a.assessment.title,
      company: a.recruiterOrg.organization.name,
      durationMinutes: a.assessment.duration,
      deadline: a.assessment.deadline,
      status: a.status,
      totalScore: a.assessment.totalScore,
      passingScore: a.assessment.passingScore,
    }));
  }

  /**
   * Returns learning statistics.
   */
  async getLearningSummary(userId: string) {
    const goals = await this.prisma.learningGoal.findMany({
      where: { userId, status: 'ACTIVE' },
      include: { targetSkill: true },
    });

    const activeGoal = goals[0] || null;

    // Get learning streak or active enrollments
    const enrollments = await this.prisma.learningEnrollment.findMany({
      where: { userId },
      include: { module: true },
      orderBy: { updatedAt: 'desc' },
    });

    const activeEnrollment = enrollments.find((e) => e.status === 'IN_PROGRESS');

    return {
      activeLearningGoal: activeGoal ? activeGoal.title : 'Not set',
      currentRoadmapStep: activeEnrollment
        ? activeEnrollment.module.title
        : 'No active course module',
      todayLearningTask: activeEnrollment
        ? `Progress in "${activeEnrollment.module.title}"`
        : 'Choose a module from your skill roadmap',
      skillProgress: enrollments.filter((e) => e.status === 'COMPLETED').length,
      completedModules: enrollments
        .filter((e) => e.status === 'COMPLETED')
        .map((e) => e.module.title),
      streak: 3, // Mock streak count for gamification
    };
  }

  /**
   * Returns top 3 skill gaps.
   */
  async getSkillGapsSummary(userId: string) {
    // Fetch career goals
    const goals = await this.prisma.careerGoal.findMany({
      where: { userId },
      take: 1,
      orderBy: { updatedAt: 'desc' },
    });

    const targetRole = goals[0]?.targetRole;
    if (!targetRole) {
      return [];
    }

    // Find the Role
    const role = await this.prisma.role.findFirst({
      where: { name: { equals: targetRole, mode: 'insensitive' } },
      include: { roleSkills: { include: { skill: true } } },
    });

    if (!role || role.roleSkills.length === 0) {
      return [];
    }

    const userSkills = await this.prisma.userSkill.findMany({
      where: { userId },
      select: { skillId: true },
    });
    const userSkillIds = userSkills.map((us) => us.skillId);

    // Filter gaps
    const gaps = role.roleSkills.filter((rs) => !userSkillIds.includes(rs.skillId));

    // Map gaps
    const formattedGaps = gaps.map((g) => ({
      skillId: g.skillId,
      name: g.skill.name,
      importance: g.importance,
      targetRole,
      recommendedLearningAction: `Complete ${g.skill.name} basic introduction tutorial.`,
    }));

    // Prioritize importance
    const importanceWeight: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    formattedGaps.sort(
      (a, b) => (importanceWeight[b.importance] || 0) - (importanceWeight[a.importance] || 0),
    );

    return formattedGaps.slice(0, 3);
  }

  /**
   * Returns notification unread statuses.
   */
  async getNotificationsSummary(userId: string) {
    const unread = await this.prisma.notification.findMany({
      where: { userId, readAt: null },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return {
      unreadCount: unread.length,
      important: unread.slice(0, 3).map((n) => ({
        id: n.id,
        channel: n.channel,
        title: n.title,
        body: n.message,
        createdAt: n.createdAt,
      })),
    };
  }

  private classifyFreshness(createdAt: Date): string {
    const diffDays = Math.ceil((Date.now() - createdAt.getTime()) / 86_400_000);
    if (diffDays <= 1) return 'NEW';
    if (diffDays <= 3) return 'FRESH';
    return 'ACTIVE';
  }
}
