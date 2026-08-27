import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { DailyFocusCardData } from '../interfaces/engagement.interfaces';

@Injectable()
export class DailyFocusService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates or retrieves the single highest-impact priority action for today.
   */
  async getDailyFocus(userId: string): Promise<DailyFocusCardData> {
    const todayStr = new Date().toISOString().split('T')[0] || '2026-08-27';

    // 1. Check if focus item already computed for today
    const existing = await this.prisma.dailyFocusItem.findUnique({
      where: { userId_date: { userId, date: todayStr } },
    });

    if (existing) {
      return {
        id: existing.id,
        title: existing.title,
        reason: existing.reason,
        actionLabel: existing.actionLabel,
        targetRoute: existing.targetRoute,
        priority: existing.priority as any,
        matchScore: existing.matchScore,
        deadline: existing.deadline,
        isCompleted: existing.isCompleted,
        date: existing.date,
      };
    }

    // 2. Synthesize new daily focus based on user context
    const [interviews, applications, savedJobs, profile, executionTasks] = await Promise.all([
      this.prisma.application.findMany({
        where: { userId, status: 'INTERVIEWING' as any },
        take: 1,
      }),
      this.prisma.application.findMany({
        where: { userId, status: 'DRAFT' as any },
        orderBy: { createdAt: 'desc' },
        take: 1,
      }),
      this.prisma.savedJob.findMany({
        where: { userId },
        include: { job: true },
        take: 1,
      }),
      this.prisma.profile.findUnique({ where: { userId } }),
      this.prisma.executionPlan.findMany({
        where: { userId, status: 'ACTIVE' as any },
        take: 1,
      }),
    ]);

    let focusItem: {
      title: string;
      reason: string;
      actionLabel: string;
      targetRoute: string;
      priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
      matchScore?: number | undefined;
      deadline?: Date | undefined;
    };

    if (interviews.length > 0) {
      focusItem = {
        title: 'Prepare for Upcoming Internship Interview',
        reason:
          'You have an active interview in progress. Review company specifics and technical focus areas.',
        actionLabel: 'Open Interview Prep',
        targetRoute: '/interviews',
        priority: 'HIGH',
      };
    } else if (applications.length > 0) {
      focusItem = {
        title: 'Complete and Submit Your Draft Application',
        reason:
          'You have an unfinished application in draft. Submitting early improves review probability.',
        actionLabel: 'Review Application',
        targetRoute: '/applications',
        priority: 'HIGH',
      };
    } else if (savedJobs.length > 0 && savedJobs[0]?.job) {
      const job = savedJobs[0].job;
      focusItem = {
        title: `Tailor Resume for ${job.title}`,
        reason: 'Saved opportunity ready for AI tailoring and keyword alignment.',
        actionLabel: 'Tailor Application',
        targetRoute: `/opportunities/${job.id}`,
        priority: 'MEDIUM',
        matchScore: 92,
      };
    } else if (!profile?.onboardingCompletedAt) {
      focusItem = {
        title: 'Complete Career Profile & Target Role',
        reason: 'Unlocks tailored internship match scores and automated career roadmaps.',
        actionLabel: 'Finish Onboarding',
        targetRoute: '/profile',
        priority: 'HIGH',
      };
    } else if (executionTasks.length > 0) {
      focusItem = {
        title: 'Complete 1 Focused Daily Execution Task',
        reason: 'Maintain weekly career sprint momentum and skill gap closures.',
        actionLabel: 'View Sprint',
        targetRoute: '/execution',
        priority: 'MEDIUM',
      };
    } else {
      focusItem = {
        title: 'Explore High-Match Summer 2027 Internships',
        reason: 'New verified listings added this week matching your target trajectory.',
        actionLabel: 'Discover Internships',
        targetRoute: '/opportunities',
        priority: 'LOW',
        matchScore: 94,
      };
    }

    const created = await this.prisma.dailyFocusItem.create({
      data: {
        userId,
        date: todayStr,
        title: focusItem.title,
        reason: focusItem.reason,
        actionLabel: focusItem.actionLabel,
        targetRoute: focusItem.targetRoute,
        priority: focusItem.priority as any,
        matchScore: focusItem.matchScore || null,
        deadline: focusItem.deadline || null,
        isCompleted: false,
      },
    });

    return {
      id: created.id,
      title: created.title,
      reason: created.reason,
      actionLabel: created.actionLabel,
      targetRoute: created.targetRoute,
      priority: created.priority as any,
      matchScore: created.matchScore,
      deadline: created.deadline,
      isCompleted: created.isCompleted,
      date: created.date,
    };
  }

  /**
   * Marks daily focus action as completed.
   */
  async completeDailyFocus(userId: string, id: string) {
    const item = await this.prisma.dailyFocusItem.update({
      where: { id },
      data: { isCompleted: true },
    });

    // Record action log & update engagement state
    await this.prisma.engagementActionLog.create({
      data: {
        userId,
        actionType: 'COMPLETED',
        featureArea: 'DAILY_FOCUS',
        details: { focusTitle: item.title },
      },
    });

    await this.prisma.userEngagementState.upsert({
      where: { userId },
      create: { userId, lastMeaningfulActionAt: new Date() },
      update: { lastMeaningfulActionAt: new Date() },
    });

    return item;
  }
}
