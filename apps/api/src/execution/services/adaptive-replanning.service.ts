import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

export interface ReplanTriggerSuggestion {
  triggerType:
    | 'INTERVIEW_ADDED'
    | 'DEADLINE_CHANGED'
    | 'APPLICATION_STATUS_CHANGED'
    | 'USER_MISSED_ACTION'
    | 'NEW_OPPORTUNITY';
  title: string;
  reason: string;
  recommendedAction: string;
  suggestedChanges: string[];
}

@Injectable()
export class AdaptiveReplanningService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Evaluates whether current active plan needs adaptive replanning based on recent state changes.
   */
  async evaluateReplanTriggers(userId: string): Promise<ReplanTriggerSuggestion | null> {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // 1. Check for newly scheduled interview in last 24h
    const newInterview = await this.prisma.hiringInterview.findFirst({
      where: {
        candidateId: userId,
        createdAt: { gte: twentyFourHoursAgo },
      },
      include: { job: { include: { company: true } } },
    });

    if (newInterview) {
      const companyName = newInterview.job?.company?.name || 'Target Company';
      return {
        triggerType: 'INTERVIEW_ADDED',
        title: 'Plan Update Available: New Interview Scheduled',
        reason: `An interview with ${companyName} has been added to your schedule.`,
        recommendedAction:
          'Reprioritize your next 3 days to dedicate focused time to technical interview preparation.',
        suggestedChanges: [
          'Elevate technical interview preparation to Next Best Action',
          'Snooze non-urgent networking outreach until after the interview',
        ],
      };
    }

    // 2. Check for overdue/missed actions
    const overduePlan = await this.prisma.executionPlan.findFirst({
      where: {
        userId,
        planType: 'DAILY',
        status: 'ACTIVE',
        targetDate: { lt: new Date(now.setHours(0, 0, 0, 0)) },
      },
      include: { items: { where: { status: 'PENDING' } } },
    });

    if (overduePlan && overduePlan.items.length > 0) {
      return {
        triggerType: 'USER_MISSED_ACTION',
        title: 'Plan Carryover: Incomplete Actions Detected',
        reason: `${overduePlan.items.length} actions from a previous day were not marked complete.`,
        recommendedAction: 'Choose whether to reschedule, reduce scope, or archive these actions.',
        suggestedChanges: [
          'Carry forward top 1-2 critical actions to today',
          'Deprioritize or archive secondary items to prevent overload',
        ],
      };
    }

    return null;
  }
}
