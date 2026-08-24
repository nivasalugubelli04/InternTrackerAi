import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { PlanReviewDto } from '../interfaces/execution.interfaces';

@Injectable()
export class WeeklyReviewService {
  constructor(private readonly prisma: PrismaService) {}

  async generateWeeklyReview(userId: string): Promise<PlanReviewDto> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 1. Gather actions completed and pending in past 7 days
    const plans = await this.prisma.executionPlan.findMany({
      where: {
        userId,
        createdAt: { gte: sevenDaysAgo },
      },
      include: { items: true },
    });

    const allItems = plans.flatMap((p) => p.items);
    const completedItems = allItems.filter((i) => i.status === 'COMPLETED');
    const carriedForwardItems = allItems.filter(
      (i) => i.status === 'PENDING' || i.status === 'RESCHEDULED' || i.status === 'BLOCKED',
    );

    // 2. Gather interviews completed or attended
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        applications: {
          where: { createdAt: { gte: sevenDaysAgo } },
          include: { job: { include: { company: true } } },
        },
        candidateHiringInterviews: {
          where: { createdAt: { gte: sevenDaysAgo } },
          include: { job: { include: { company: true } } },
        },
        mockInterviews: {
          where: { createdAt: { gte: sevenDaysAgo } },
        },
        learningEnrollments: {
          where: { completedAt: { gte: sevenDaysAgo } },
          include: { module: true },
        },
      },
    });

    const whatWentWell: string[] = [];
    if (completedItems.length > 0) {
      whatWentWell.push(`Completed ${completedItems.length} prioritized career execution actions.`);
    }
    if (user && user.applications.length > 0) {
      whatWentWell.push(`Submitted ${user.applications.length} targeted internship applications.`);
    }
    if (user && user.mockInterviews.length > 0) {
      whatWentWell.push(
        `Completed ${user.mockInterviews.length} technical interview practice sessions.`,
      );
    }
    if (user && user.learningEnrollments.length > 0) {
      whatWentWell.push(
        `Mastered ${user.learningEnrollments.length} key engineering learning modules.`,
      );
    }
    if (whatWentWell.length === 0) {
      whatWentWell.push('Maintained active career strategy tracking and pipeline awareness.');
    }

    const progressMade: string[] = [
      `Overall execution velocity: ${completedItems.length}/${Math.max(1, allItems.length)} planned items executed.`,
      'Pipeline momentum refreshed for the upcoming week.',
    ];

    const actionsCarriedForward = Array.from(
      new Set(carriedForwardItems.map((i) => i.title)),
    ).slice(0, 5);

    const currentBottlenecks: string[] = [];
    const blockedItems = allItems.filter((i) => i.isBlocked);
    if (blockedItems.length > 0) {
      currentBottlenecks.push(
        `${blockedItems.length} actions are waiting on prerequisite completion.`,
      );
    } else {
      currentBottlenecks.push('No blocking dependencies currently detected.');
    }

    const nextFocusRecommendations = [
      'Focus primarily on high-leverage interview preparation & imminent deadlines.',
      'Maintain steady cadence of 2-3 focused actions per day.',
    ];

    // Save review record
    const review = await this.prisma.planReview.create({
      data: {
        userId,
        reviewPeriod: 'WEEKLY',
        periodStartDate: sevenDaysAgo,
        periodEndDate: now,
        whatWentWell,
        progressMade,
        actionsCarriedForward,
        currentBottlenecks,
        nextFocusRecommendations,
        completedActionsCount: completedItems.length,
        totalActionsCount: allItems.length,
      },
    });

    return {
      id: review.id,
      reviewPeriod: review.reviewPeriod,
      periodStartDate: review.periodStartDate.toISOString(),
      periodEndDate: review.periodEndDate.toISOString(),
      whatWentWell: review.whatWentWell,
      progressMade: review.progressMade,
      actionsCarriedForward: review.actionsCarriedForward,
      currentBottlenecks: review.currentBottlenecks,
      nextFocusRecommendations: review.nextFocusRecommendations,
      completedActionsCount: review.completedActionsCount,
      totalActionsCount: review.totalActionsCount,
      userNotes: review.userNotes,
    };
  }

  async getLatestReview(userId: string): Promise<PlanReviewDto | null> {
    const review = await this.prisma.planReview.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!review) return null;

    return {
      id: review.id,
      reviewPeriod: review.reviewPeriod,
      periodStartDate: review.periodStartDate.toISOString(),
      periodEndDate: review.periodEndDate.toISOString(),
      whatWentWell: review.whatWentWell,
      progressMade: review.progressMade,
      actionsCarriedForward: review.actionsCarriedForward,
      currentBottlenecks: review.currentBottlenecks,
      nextFocusRecommendations: review.nextFocusRecommendations,
      completedActionsCount: review.completedActionsCount,
      totalActionsCount: review.totalActionsCount,
      userNotes: review.userNotes,
    };
  }

  async saveReviewNotes(userId: string, reviewId: string, notes: string): Promise<PlanReviewDto> {
    await this.prisma.planReview.updateMany({
      where: { id: reviewId, userId },
      data: { userNotes: notes },
    });

    const review = await this.prisma.planReview.findUnique({
      where: { id: reviewId },
    });
    if (!review) throw new Error('Review not found');

    return {
      id: review.id,
      reviewPeriod: review.reviewPeriod,
      periodStartDate: review.periodStartDate.toISOString(),
      periodEndDate: review.periodEndDate.toISOString(),
      whatWentWell: review.whatWentWell,
      progressMade: review.progressMade,
      actionsCarriedForward: review.actionsCarriedForward,
      currentBottlenecks: review.currentBottlenecks,
      nextFocusRecommendations: review.nextFocusRecommendations,
      completedActionsCount: review.completedActionsCount,
      totalActionsCount: review.totalActionsCount,
      userNotes: review.userNotes,
    };
  }
}
