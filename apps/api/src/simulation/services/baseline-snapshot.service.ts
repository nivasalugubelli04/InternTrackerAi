import { Injectable, Logger } from '@nestjs/common';

import { CareerIntelligenceService } from '../../career-intelligence/services/career-intelligence.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BaselineCareerSnapshot } from '../interfaces/simulation.interfaces';

@Injectable()
export class BaselineSnapshotService {
  private readonly logger = new Logger(BaselineSnapshotService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly careerIntelligenceService: CareerIntelligenceService,
  ) {}

  /**
   * Captures a comprehensive, non-mutating snapshot of the user's current career state.
   * Does NOT alter the user's active career state, plans, or trajectory.
   */
  async captureBaseline(userId: string): Promise<BaselineCareerSnapshot> {
    this.logger.log(`Capturing Baseline Career Snapshot for user ${userId}`);

    // 1. Fetch Career Intelligence Base State & Trajectory
    const [
      baseState,
      trajectory,
      careerGoals,
      execPref,
      activeSprint,
      externalRecords,
      mockInterviews,
    ] = await Promise.all([
      this.careerIntelligenceService.buildCareerState(userId),
      this.careerIntelligenceService.computeTrajectory(userId).catch(() => ({
        phase: 'EXPLORING',
        momentum: 'STABLE',
      })),
      this.prisma.careerGoal.findMany({
        where: { userId },
        select: { targetRole: true },
      }),
      this.prisma.userExecutionPreference.findUnique({
        where: { userId },
      }),
      this.prisma.careerSprint.findFirst({
        where: { userId, status: 'ACTIVE' },
        select: { id: true, title: true, goal: true, sprintType: true },
      }),
      this.prisma.externalDataRecord.findMany({
        where: { userId },
        select: { recordType: true },
      }),
      this.prisma.mockInterview.findMany({
        where: { userId, status: 'COMPLETED' },
        select: { score: true },
      }),
    ]);

    // 2. Format project list from baseState
    const projects = (baseState.projects || []).map((p: any) => ({
      title: p.title,
      isDeployed: p.description?.toLowerCase().includes('deployed') || false,
      techStack: Array.isArray(p.skills) ? p.skills : [],
    }));

    // 3. Compute mock interview average
    const validScores = mockInterviews
      .map((m: any) => m.score)
      .filter((s: any): s is number => s !== null && s !== undefined && !isNaN(s));
    const mockInterviewAvgScore =
      validScores.length > 0
        ? Math.round(validScores.reduce((a: number, b: number) => a + b, 0) / validScores.length)
        : null;

    // 4. Summarize external integration signals (Phase 44)
    const githubReposTracked = externalRecords.filter(
      (r: any) => r.recordType === 'GITHUB_REPOSITORY',
    ).length;
    const calendarEventsTracked = externalRecords.filter(
      (r: any) => r.recordType === 'CALENDAR_EVENT',
    ).length;

    // 5. Weekly capacity in minutes (defaults to 10 hours = 600 min if not configured)
    const weeklyAvailableMinutes = (execPref?.dailyAvailableMinutes || 60) * 7;

    // 6. Compute Data Completeness Score & Limitations
    const dataLimitations: string[] = [...(baseState.dataLimitations || [])];
    let signalPoints = 0;

    if (baseState.targetRole) signalPoints += 15;
    else
      dataLimitations.push(
        'No target role specified — simulations assume a general software path.',
      );

    if (baseState.skills.length >= 5) signalPoints += 20;
    else if (baseState.skills.length > 0) signalPoints += 10;
    else dataLimitations.push('No technical skills cataloged on profile.');

    if (projects.length >= 2) signalPoints += 20;
    else if (projects.length > 0) signalPoints += 10;
    else dataLimitations.push('No portfolio projects recorded.');

    if (projects.some((p: any) => p.isDeployed)) signalPoints += 10;
    else dataLimitations.push('No public deployed project URLs detected.');

    if (baseState.applicationCount > 0) signalPoints += 15;
    else dataLimitations.push('No active or historical job applications tracked.');

    if (mockInterviews.length > 0) signalPoints += 10;
    else dataLimitations.push('No mock interview sessions recorded.');

    if (baseState.networkingContactCount > 0) signalPoints += 10;
    else dataLimitations.push('No professional networking contacts registered.');

    const dataCompletenessScore = Math.min(100, signalPoints);

    return {
      userId,
      targetRole: baseState.targetRole,
      careerGoals: (careerGoals || []).map((g: any) => g.targetRole || 'Target Career Path'),
      skills: baseState.skills,
      projects,
      evidenceNodeCount: baseState.evidenceNodeCount || 0,
      portfolioMaturity: baseState.portfolioMaturity || 'STARTER',
      activeApplicationCount: baseState.applicationCount || 0,
      totalApplications: baseState.applicationCount || 0,
      mockInterviewCount: mockInterviews.length,
      mockInterviewAvgScore,
      networkingContactCount: baseState.networkingContactCount || 0,
      weeklyAvailableMinutes,
      activeSprint: activeSprint
        ? {
            id: activeSprint.id,
            title: activeSprint.title,
            goal: activeSprint.goal,
            sprintType: activeSprint.sprintType,
          }
        : null,
      externalDataSummary: {
        githubReposTracked,
        calendarEventsTracked,
      },
      trajectoryPhase: (trajectory as any).phase || 'EXPLORING',
      careerMomentum: (trajectory as any).momentum || 'STABLE',
      dataCompletenessScore,
      dataLimitations: Array.from(new Set(dataLimitations)),
      capturedAt: new Date().toISOString(),
    };
  }
}
