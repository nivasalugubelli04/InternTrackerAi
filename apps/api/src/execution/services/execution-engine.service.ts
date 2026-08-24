import { Injectable, Logger } from '@nestjs/common';
import {
  ApplicationStatus,
  ExecutionItemStatus,
  HiringInterviewStatus,
  PlanStatus,
  PlanType,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import {
  DailyPlanResponse,
  ExecutionItemDto,
  WeeklyPlanResponse,
} from '../interfaces/execution.interfaces';

import { ActionDecompositionService } from './action-decomposition.service';
import { DeadlineIntelligenceService } from './deadline-intelligence.service';
import { DependencyEngineService } from './dependency-engine.service';
import { ExecutionAiService } from './execution-ai.service';
import { NextBestActionService } from './next-best-action.service';
import { UnifiedActionAggregatorService } from './unified-action-aggregator.service';
import { WorkloadIntelligenceService } from './workload-intelligence.service';

@Injectable()
export class ExecutionEngineService {
  private readonly logger = new Logger(ExecutionEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aggregator: UnifiedActionAggregatorService,
    private readonly dependencyEngine: DependencyEngineService,
    private readonly deadlineService: DeadlineIntelligenceService,
    private readonly workloadService: WorkloadIntelligenceService,
    private readonly nbaService: NextBestActionService,
    private readonly decompositionService: ActionDecompositionService,
    private readonly executionAi: ExecutionAiService,
  ) {}

  /**
   * Generates or fetches the active Daily Execution Plan for the user.
   */
  async getDailyPlan(userId: string, targetDate?: Date): Promise<DailyPlanResponse> {
    const date = targetDate || new Date();
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // 1. Check if an active plan already exists for today
    let plan = await this.prisma.executionPlan.findFirst({
      where: {
        userId,
        planType: PlanType.DAILY,
        status: PlanStatus.ACTIVE,
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        items: {
          include: {
            dependencies: true,
            prerequisites: true,
          },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    // If no active plan for today, generate one
    if (!plan || plan.items.length === 0) {
      plan = await this.generateDailyPlan(userId, date);
    }

    // 2. Fetch User Execution Preferences
    const userPrefs = await this.prisma.userExecutionPreference.findUnique({
      where: { userId },
    });
    const maxDailyActions = userPrefs?.maxDailyActions || 3;

    // 3. Map items to DTOs
    const allItems: ExecutionItemDto[] = (plan?.items || []).map((item) => ({
      id: item.id,
      orderIndex: item.orderIndex,
      title: item.title,
      description: item.description,
      source: item.source as any,
      sourceEntityType: item.sourceEntityType,
      sourceEntityId: item.sourceEntityId,
      priority: item.priority,
      focusLevel: item.focusLevel as any,
      estimatedEffort: item.estimatedEffort,
      estimatedMinutes: item.estimatedMinutes,
      deadline: item.deadline ? item.deadline.toISOString() : null,
      priorityExplanation: item.priorityExplanation,
      potentialImpact: item.potentialImpact,
      suggestedNextStep: item.suggestedNextStep,
      status: item.status,
      isBlocked: item.isBlocked,
      blockerReason: item.blockerReason,
      subSteps: (item.subSteps as any) || [],
      startedAt: item.startedAt ? item.startedAt.toISOString() : null,
      completedAt: item.completedAt ? item.completedAt.toISOString() : null,
    }));

    const todayActions = allItems.slice(0, maxDailyActions);
    const laterTodayActions = allItems.slice(maxDailyActions);

    // 4. Candidate pool for NBA & Deadlines
    const rawCandidates = await this.aggregator.aggregateCandidates(userId);
    const dependencyAnalysis = this.dependencyEngine.analyzeDependencies(rawCandidates);
    const nba = this.nbaService.selectNextBestAction(dependencyAnalysis.orderedActions);
    const deadlineAssessment = this.deadlineService.assessDeadlines(rawCandidates);

    // 5. Active Sprint
    const activeSprint = await this.prisma.careerSprint.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: { items: true },
    });

    return {
      id: plan ? plan.id : 'generated-daily-plan',
      targetDate: startOfDay.toISOString(),
      planObjective: plan ? plan.planObjective : 'Daily Execution Plan',
      primaryFocus: plan ? plan.primaryFocus : 'Career Execution',
      workloadRisk: (plan?.workloadRisk as any) || 'BALANCED',
      workloadReason: plan?.workloadReason || null,
      totalEstimatedMinutes: plan ? plan.totalEstimatedMinutes : 60,
      nextBestAction: nba,
      todayActions,
      laterTodayActions,
      upcomingDeadlines: [
        ...deadlineAssessment.criticalDeadlines.map((d) => ({
          title: d.title,
          source: d.source,
          deadline: d.deadline.toISOString(),
          daysRemaining: d.daysRemaining,
        })),
        ...deadlineAssessment.approachingDeadlines.map((d) => ({
          title: d.title,
          source: d.source,
          deadline: d.deadline.toISOString(),
          daysRemaining: d.daysRemaining,
        })),
      ],
      blockedActions: dependencyAnalysis.blockedActions.map((b) => ({
        id: b.action.sourceEntityId || b.action.title,
        title: b.action.title,
        blockerReason: b.blockerReason,
        prerequisiteTitle: b.prerequisiteActionTitle || null,
      })),
      activeSprint: activeSprint
        ? {
            id: activeSprint.id,
            title: activeSprint.title,
            goal: activeSprint.goal,
            sprintType: activeSprint.sprintType,
            startDate: activeSprint.startDate.toISOString(),
            endDate: activeSprint.endDate.toISOString(),
            durationDays: activeSprint.durationDays,
            status: activeSprint.status,
            progressPercent: activeSprint.progressPercent,
            reflection: activeSprint.reflection,
            keyMilestones: activeSprint.keyMilestones,
            items: activeSprint.items.map((i) => ({
              id: i.id,
              title: i.title,
              isMilestone: i.isMilestone,
              status: i.status,
              targetDay: i.targetDay,
            })),
          }
        : null,
    };
  }

  /**
   * Generates a new Daily Plan from live state.
   */
  async generateDailyPlan(userId: string, targetDate?: Date): Promise<any> {
    const date = targetDate || new Date();

    // 1. Gather all candidates
    const rawCandidates = await this.aggregator.aggregateCandidates(userId);

    // 2. Run Dependency Engine
    const { orderedActions } = this.dependencyEngine.analyzeDependencies(rawCandidates);

    // 3. User Preferences & Workload
    const userPrefs = await this.prisma.userExecutionPreference.findUnique({
      where: { userId },
    });
    const workload = this.workloadService.assessWorkload(orderedActions, userPrefs || undefined);

    // 4. Synthesize AI / Deterministic Plan Overview
    const userProfile = await this.prisma.profile.findUnique({ where: { userId } });
    const careerPref = await this.prisma.careerPreference.findUnique({ where: { userId } });
    const targetRole =
      careerPref?.preferredRoles?.[0] || userProfile?.headline || 'Software Engineer';

    const synthesis = await this.executionAi.synthesizePlanStrategy(
      userId,
      orderedActions,
      targetRole,
      'DAILY',
    );

    // 5. Supersede previous active daily plans
    await this.prisma.executionPlan.updateMany({
      where: { userId, planType: PlanType.DAILY, status: PlanStatus.ACTIVE },
      data: { status: PlanStatus.SUPERSEDED },
    });

    // 6. Create ExecutionPlan and ExecutionPlanItems in DB
    const plan = await this.prisma.executionPlan.create({
      data: {
        userId,
        planType: PlanType.DAILY,
        targetDate: date,
        planObjective: synthesis.planObjective,
        primaryFocus: synthesis.primaryFocus,
        secondaryFocus: synthesis.secondaryFocus || null,
        maintainFocus: synthesis.maintainFocus || null,
        workloadRisk: workload.risk,
        workloadReason: workload.explanation || null,
        reasoning: synthesis.reasoning,
        totalEstimatedMinutes: workload.totalEstimatedMinutes,
        status: PlanStatus.ACTIVE,
        aiGenerated: true,
        items: {
          create: orderedActions.slice(0, 10).map((action, index) => {
            const subSteps = this.decompositionService.decomposeAction(action);
            return {
              actionId: action.actionId || null,
              orderIndex: index + 1,
              title: action.title,
              description: action.description || null,
              source: action.source,
              sourceEntityType: action.sourceEntityType || null,
              sourceEntityId: action.sourceEntityId || null,
              priority: action.priority,
              focusLevel: action.focusLevel,
              estimatedEffort: action.estimatedEffort,
              estimatedMinutes: action.estimatedMinutes,
              deadline: action.deadline || null,
              priorityExplanation: action.priorityExplanation || null,
              potentialImpact: action.potentialImpact || null,
              suggestedNextStep: action.suggestedNextStep || null,
              status: ExecutionItemStatus.PENDING,
              isBlocked: action.isBlocked || false,
              blockerReason: action.blockerReason || null,
              subSteps: subSteps as any,
            };
          }),
        },
      },
      include: {
        items: true,
      },
    });

    return plan;
  }

  /**
   * Generates or fetches the active Weekly Career Execution Plan.
   */
  async getWeeklyPlan(userId: string): Promise<WeeklyPlanResponse> {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Sunday/Monday start
    weekStart.setHours(0, 0, 0, 0);

    let plan = await this.prisma.executionPlan.findFirst({
      where: {
        userId,
        planType: PlanType.WEEKLY,
        status: PlanStatus.ACTIVE,
        weekStartDate: { gte: weekStart },
      },
      include: {
        items: { orderBy: { orderIndex: 'asc' } },
      },
    });

    if (!plan) {
      plan = await this.generateWeeklyPlan(userId, weekStart);
    }

    const rawCandidates = await this.aggregator.aggregateCandidates(userId);
    this.logger.log(`Found ${rawCandidates.length} candidate actions for user ${userId}`);

    // Extract weekly breakdowns
    const applications = await this.prisma.application.findMany({
      where: {
        userId,
        status: {
          in: [
            ApplicationStatus.DISCOVERED,
            ApplicationStatus.APPLICATION_STARTED,
            ApplicationStatus.APPLIED,
          ],
        },
      },
      include: { job: { include: { company: true } }, alignment: true },
      take: 3,
    });

    const interviews = await this.prisma.hiringInterview.findMany({
      where: {
        candidateId: userId,
        scheduledStart: { gte: now },
        status: { in: [HiringInterviewStatus.SCHEDULED, HiringInterviewStatus.CONFIRMED] },
      },
      include: { job: { include: { company: true } } },
      take: 3,
    });

    const enrollments = await this.prisma.learningEnrollment.findMany({
      where: { userId, completedAt: null },
      include: { module: { include: { skill: true } } },
      take: 3,
    });

    const contacts = await this.prisma.professionalContact.findMany({
      where: { userId },
      include: { followUps: { where: { status: 'PENDING' } } },
      take: 3,
    });

    return {
      id: plan ? plan.id : 'weekly-plan',
      weekStartDate: weekStart.toISOString(),
      planObjective: plan ? plan.planObjective : 'Weekly Career Execution Plan',
      primaryFocus: plan ? plan.primaryFocus : 'Application & Interview Execution',
      secondaryFocus: plan?.secondaryFocus || null,
      maintainFocus: plan?.maintainFocus || null,
      workloadRisk: (plan?.workloadRisk as any) || 'BALANCED',
      workloadReason: plan?.workloadReason || null,
      totalEstimatedMinutes: plan ? plan.totalEstimatedMinutes : 120,
      topOpportunities: applications.map((a) => ({
        company: a.job?.company?.name || 'Company',
        roleTitle: a.job?.title || 'Internship',
        deadline: a.job?.deadline ? a.job.deadline.toISOString() : null,
        alignmentScore: a.alignment?.overallAlignment || 80,
      })),
      interviewPreparations: interviews.map((i) => ({
        company: i.job?.company?.name || 'Company',
        scheduledDate: i.scheduledStart.toISOString(),
        stage: 'Technical Interview',
        status: i.status,
      })),
      learningPriorities: enrollments.map((e) => ({
        skill: e.module?.skill?.name || 'Core Tech',
        moduleTitle: e.module?.title || 'Skill Module',
        estimatedMinutes: 30,
      })),
      projectMilestones: [
        { projectTitle: 'AI InternTracker Engine', milestone: 'Deploy API & live dashboard' },
      ],
      networkingActions: contacts.map((c) => ({
        contactName: c.name,
        company: c.company || 'Tech Leader',
        goal: 'Relationship Follow-up',
      })),
      actions: (plan?.items || []).map((item) => ({
        id: item.id,
        orderIndex: item.orderIndex,
        title: item.title,
        description: item.description,
        source: item.source as any,
        sourceEntityType: item.sourceEntityType,
        sourceEntityId: item.sourceEntityId,
        priority: item.priority,
        focusLevel: item.focusLevel as any,
        estimatedEffort: item.estimatedEffort,
        estimatedMinutes: item.estimatedMinutes,
        deadline: item.deadline ? item.deadline.toISOString() : null,
        priorityExplanation: item.priorityExplanation,
        potentialImpact: item.potentialImpact,
        suggestedNextStep: item.suggestedNextStep,
        status: item.status,
        isBlocked: item.isBlocked,
        blockerReason: item.blockerReason,
        subSteps: (item.subSteps as any) || [],
      })),
      recommendedDistribution: {
        applyPercent: 30,
        preparePercent: 40,
        buildPercent: 20,
        networkPercent: 10,
      },
    };
  }

  async generateWeeklyPlan(userId: string, weekStart: Date): Promise<any> {
    const rawCandidates = await this.aggregator.aggregateCandidates(userId);
    const { orderedActions } = this.dependencyEngine.analyzeDependencies(rawCandidates);

    const userProfile = await this.prisma.profile.findUnique({ where: { userId } });
    const careerPref = await this.prisma.careerPreference.findUnique({ where: { userId } });
    const targetRole =
      careerPref?.preferredRoles?.[0] || userProfile?.headline || 'Software Engineer';

    const synthesis = await this.executionAi.synthesizePlanStrategy(
      userId,
      orderedActions,
      targetRole,
      'WEEKLY',
    );

    await this.prisma.executionPlan.updateMany({
      where: { userId, planType: PlanType.WEEKLY, status: PlanStatus.ACTIVE },
      data: { status: PlanStatus.SUPERSEDED },
    });

    const plan = await this.prisma.executionPlan.create({
      data: {
        userId,
        planType: PlanType.WEEKLY,
        weekStartDate: weekStart,
        planObjective: synthesis.planObjective,
        primaryFocus: synthesis.primaryFocus,
        secondaryFocus: synthesis.secondaryFocus || null,
        maintainFocus: synthesis.maintainFocus || null,
        workloadRisk: synthesis.workloadRisk,
        workloadReason: synthesis.workloadReason || null,
        reasoning: synthesis.reasoning,
        totalEstimatedMinutes: orderedActions.reduce((s, a) => s + (a.estimatedMinutes || 30), 0),
        status: PlanStatus.ACTIVE,
        aiGenerated: true,
        items: {
          create: orderedActions.slice(0, 15).map((action, idx) => ({
            actionId: action.actionId || null,
            orderIndex: idx + 1,
            title: action.title,
            description: action.description || null,
            source: action.source,
            sourceEntityType: action.sourceEntityType || null,
            sourceEntityId: action.sourceEntityId || null,
            priority: action.priority,
            focusLevel: action.focusLevel,
            estimatedEffort: action.estimatedEffort,
            estimatedMinutes: action.estimatedMinutes,
            deadline: action.deadline || null,
            priorityExplanation: action.priorityExplanation || null,
            potentialImpact: action.potentialImpact || null,
            suggestedNextStep: action.suggestedNextStep || null,
            status: ExecutionItemStatus.PENDING,
            isBlocked: action.isBlocked || false,
            blockerReason: action.blockerReason || null,
            subSteps: this.decompositionService.decomposeAction(action) as any,
          })),
        },
      },
      include: { items: true },
    });

    return plan;
  }
}
