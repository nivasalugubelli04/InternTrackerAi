import { Injectable, NotFoundException } from '@nestjs/common';

import { AiService } from '../../ai/services/ai.service';
import { PrismaService } from '../../prisma/prisma.service';

import { ActionOrchestrationService } from './action-orchestration.service';
import { CareerStrategyService } from './career-strategy.service';

@Injectable()
export class CommandCenterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly actionOrch: ActionOrchestrationService,
    private readonly strategyService: CareerStrategyService,
    private readonly aiService: AiService,
  ) {}

  /**
   * Generates the central normalized career state for a user.
   */
  async getCommandCenterData(userId: string): Promise<any> {
    const now = new Date();

    // 1. Fetch user data in single query for optimal performance
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        resume: true,
        applications: true,
        candidateHiringInterviews: {
          include: { job: { include: { company: true } } },
        },
        mockInterviews: true,
        learningEnrollments: {
          include: { module: { include: { skill: true } } },
        },
        userGoals: {
          where: { status: 'ACTIVE' },
        },
        recommendations: {
          include: { job: { include: { company: true } } },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    // 2. Fetch live priority actions
    const actions = await this.actionOrch.getPrioritizedActions(userId);

    // 3. Fetch strategy and forecast data
    const strategy = await this.strategyService.getCareerStrategy(userId);
    const forecast = await this.strategyService.getHiringForecast(strategy.targetRole);

    // 4. Calculate Career Health Percentages
    const profileScore =
      user.resume?.fileUrl && user.profile?.bio && user.profile?.headline ? 95 : 60;
    const skillsScore =
      user.learningEnrollments.length > 0
        ? Math.min(100, user.learningEnrollments.length * 15 + 40)
        : 40;
    const portfolioScore = user.profile?.githubUrl || user.profile?.portfolioUrl ? 90 : 50;
    const appsScore =
      user.applications.length > 0 ? Math.min(100, user.applications.length * 10 + 30) : 30;
    const mockScores = user.mockInterviews
      .map((m) => m.score)
      .filter((s): s is number => typeof s === 'number');
    const interviewScore =
      mockScores.length > 0
        ? Math.round(mockScores.reduce((a, b) => a + b, 0) / mockScores.length)
        : 50;

    // 5. Select Dynamic Focus of the day
    let focus = 'Opportunity Discovery';
    if (actions.some((a) => a.priority === 'CRITICAL' && a.actionType === 'INTERVIEW_PREP')) {
      focus = 'Interview Preparation';
    } else if (
      actions.some((a) => a.actionType === 'ASSESSMENT_PENDING' || a.actionType === 'FOLLOW_UP')
    ) {
      focus = 'Application Sprint';
    } else if (actions.some((a) => a.actionType === 'LEARNING_TASK')) {
      focus = 'Skill Roadmap Improvement';
    } else if (!user.resume?.fileUrl) {
      focus = 'Profile Optimization';
    }

    // 6. Time-based Greeting
    const hour = now.getHours();
    let greeting = 'Good morning';
    if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
    else if (hour >= 17) greeting = 'Good evening';

    // 7. Profile completeness details
    const profileCompletenessWarnings = [];
    if (!user.resume?.fileUrl) profileCompletenessWarnings.push('Upload a PDF resume');
    if (!user.profile?.bio) profileCompletenessWarnings.push('Add profile biography details');
    if (!user.profile?.headline)
      profileCompletenessWarnings.push('Add profile professional headline');

    // 8. Upcoming events list
    const upcomingEvents = user.candidateHiringInterviews
      .filter((i) => i.scheduledStart > now)
      .map((i) => ({
        id: i.id,
        title: `Interview: ${i.title} with ${i.job?.company?.name || 'Recruiter'}`,
        time: i.scheduledStart,
      }));

    return {
      greeting,
      todayFocus: focus,
      overallReadiness: strategy.overallScore,
      targetRole: strategy.targetRole,
      careerHealth: {
        profile: profileScore,
        skills: skillsScore,
        portfolio: portfolioScore,
        applications: appsScore,
        interview: interviewScore,
      },
      priorityActions: actions,
      profileWarnings: profileCompletenessWarnings,
      upcomingEvents,
      goals: user.userGoals,
      opportunitiesSummary: {
        totalMatches: user.recommendations.length,
        strongMatches: user.recommendations.filter((r) => (r.rank || 0) <= 2).length,
      },
      applicationsSummary: {
        total: user.applications.length,
        interviews: user.applications.filter((a) => a.status === 'INTERVIEW').length,
        offers: user.applications.filter((a) => a.status === 'OFFER').length,
      },
      forecast: {
        forecastText: forecast.forecastText,
        confidence: forecast.confidence,
      },
    };
  }

  /**
   * Goals CRUD
   */
  async getUserGoals(userId: string): Promise<any[]> {
    return this.prisma.userGoal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createUserGoal(userId: string, data: any): Promise<any> {
    return this.prisma.userGoal.create({
      data: {
        userId,
        type: data.type,
        title: data.title,
        targetValue: data.targetValue,
        deadline: data.deadline ? new Date(data.deadline) : null,
        status: 'ACTIVE',
      },
    });
  }

  async adjustUserGoal(userId: string, goalId: string, data: any): Promise<any> {
    const goal = await this.prisma.userGoal.findFirst({
      where: { id: goalId, userId },
    });
    if (!goal) throw new NotFoundException('Goal not found');

    return this.prisma.userGoal.update({
      where: { id: goalId },
      data: {
        currentValue: data.currentValue !== undefined ? data.currentValue : goal.currentValue,
        targetValue: data.targetValue !== undefined ? data.targetValue : goal.targetValue,
        status: data.status || goal.status,
      },
    });
  }

  /**
   * Dynamic Weekly Review generator with Gemini integration
   */
  async getWeeklyReview(userId: string): Promise<any> {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        applications: {
          where: { createdAt: { gte: oneWeekAgo } },
        },
        mockInterviews: {
          where: { createdAt: { gte: oneWeekAgo } },
        },
        learningEnrollments: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');

    const appCount = user.applications.length;
    const interviewCount = user.applications.filter((a) => a.status === 'INTERVIEW').length;
    const learningCompleted = user.learningEnrollments.filter((e) => e.progress >= 1.0).length;

    const summaryContext = {
      appCount,
      interviewCount,
      learningCompleted,
      timeframe: 'weekly',
    };

    let aiExplanation = '';
    let isFallback = false;

    try {
      const systemPrompt = `You are a grounded Career Strategy Advisor. Review the student's performance data. Summarize achievements and highlight next steps without inventing facts outside the data context. Keep it concise.`;
      const userPrompt = `Student performance context:\n${JSON.stringify(summaryContext)}`;

      const provider = (this.aiService as any).aiProvider;
      if (provider && typeof provider.generateText === 'function') {
        const result = await provider.generateText(userPrompt, systemPrompt);
        aiExplanation = result.text;
      } else {
        throw new Error('AI offline');
      }
    } catch (e) {
      isFallback = true;
      aiExplanation = `WEEKLY SUMMARY (Fallback template)
You completed ${appCount} applications and reached ${interviewCount} interview milestones this week. Your learning roadmap is advancing. Focus next week on technical mock preparation.`;
    }

    return {
      timeframe: 'weekly',
      applications: appCount,
      interviews: interviewCount,
      learningProgress: learningCompleted,
      aiExplanation,
      isFallback,
    };
  }

  /**
   * Dynamic Monthly Review
   */
  async getMonthlyReview(userId: string): Promise<any> {
    const now = new Date();
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        applications: {
          where: { createdAt: { gte: oneMonthAgo } },
        },
        mockInterviews: {
          where: { createdAt: { gte: oneMonthAgo } },
        },
        learningEnrollments: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');

    const appCount = user.applications.length;
    const interviewCount = user.applications.filter((a) => a.status === 'INTERVIEW').length;
    const learningCompleted = user.learningEnrollments.filter((e) => e.progress >= 1.0).length;

    const summaryContext = {
      appCount,
      interviewCount,
      learningCompleted,
      timeframe: 'monthly',
    };

    let aiExplanation = '';
    let isFallback = false;

    try {
      const systemPrompt = `You are a grounded Career Strategy Advisor. Review the student's monthly performance data. Summarize achievements and highlight next steps without inventing facts outside the data context. Keep it concise.`;
      const userPrompt = `Student monthly performance context:\n${JSON.stringify(summaryContext)}`;

      const provider = (this.aiService as any).aiProvider;
      if (provider && typeof provider.generateText === 'function') {
        const result = await provider.generateText(userPrompt, systemPrompt);
        aiExplanation = result.text;
      } else {
        throw new Error('AI offline');
      }
    } catch (e) {
      isFallback = true;
      aiExplanation = `MONTHLY REVIEW SUMMARY (Fallback template)
Over the last 30 days, you submitted ${appCount} applications and logged ${learningCompleted} learning modules. Continue testing with mock simulators to increase placement odds.`;
    }

    return {
      timeframe: 'monthly',
      applications: appCount,
      interviews: interviewCount,
      learningProgress: learningCompleted,
      aiExplanation,
      isFallback,
    };
  }

  /**
   * Grounded AI assistant command routing
   */
  async chatCommandCenter(userId: string, message: string): Promise<any> {
    const data = await this.getCommandCenterData(userId);
    const systemPrompt = `You are the grounded Career Command Center AI Assistant. Ground your suggestions 100% in this user's current data.
Do NOT invent deadlines, scores, interviews, or matches.
Focus solely on user queries related to "What should I do today?", "Am I ready?", etc.
State that details are unknown if they are not present in the provided state context.`;

    const userPrompt = `User Command: "${message}"\n\nUser CommandCenter State context:\n${JSON.stringify(data)}`;

    try {
      const provider = (this.aiService as any).aiProvider;
      if (provider && typeof provider.generateText === 'function') {
        const result = await provider.generateText(userPrompt, systemPrompt);
        return {
          content: result.text,
          actions: data.priorityActions.slice(0, 2),
        };
      }
      throw new Error('AI Offline');
    } catch (e) {
      return {
        content: `My reasoning system is currently offline. Based on your current dashboard, your focus today is: "${data.todayFocus}". You have ${data.priorityActions.length} pending actions.`,
        actions: data.priorityActions.slice(0, 2),
      };
    }
  }
}
