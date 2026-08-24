import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

export interface FocusSessionSuggestion {
  actionId: string;
  actionTitle: string;
  suggestedDurationMinutes: number;
  recommendedStartTime: string;
  recommendedEndTime: string;
  preparationChecklist: string[];
  calendarContext?: {
    isCalendarConnected: boolean;
    calendarProvider?: string;
    suggestedEventTitle: string;
    suggestedDescription: string;
    canAddToCalendar: boolean;
  };
}

@Injectable()
export class FocusSessionService {
  constructor(private readonly prisma: PrismaService) {}

  async createFocusSessionSuggestion(
    userId: string,
    actionItemId: string,
    durationMinutes = 60,
  ): Promise<FocusSessionSuggestion> {
    const item = await this.prisma.executionPlanItem.findFirst({
      where: { id: actionItemId },
    });

    if (!item) {
      throw new NotFoundException('Execution plan item not found');
    }

    const now = new Date();
    const startTime = new Date(now.getTime() + 15 * 60 * 1000); // 15 mins from now
    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

    // Check if user has calendar integration connected
    const calendarIntegration = await this.prisma.userIntegration.findFirst({
      where: { userId, provider: 'GOOGLE_CALENDAR', status: 'CONNECTED' },
    });

    const isCalendarConnected = !!calendarIntegration;

    const result: FocusSessionSuggestion = {
      actionId: item.id,
      actionTitle: item.title,
      suggestedDurationMinutes: durationMinutes,
      recommendedStartTime: startTime.toISOString(),
      recommendedEndTime: endTime.toISOString(),
      preparationChecklist: [
        'Close distracting browser tabs and notifications',
        'Have relevant notes or job description open',
        'Focus on single outcome for this timebox',
      ],
    };

    if (isCalendarConnected) {
      result.calendarContext = {
        isCalendarConnected: true,
        calendarProvider: 'Google Calendar',
        suggestedEventTitle: `[Career Focus] ${item.title}`,
        suggestedDescription: `${item.description || item.title}\n\nCareer Goal Relevance: ${item.priorityExplanation || 'High leverage career execution block.'}`,
        canAddToCalendar: true,
      };
    } else {
      result.calendarContext = {
        isCalendarConnected: false,
        suggestedEventTitle: `[Career Focus] ${item.title}`,
        suggestedDescription: `${item.description || item.title}`,
        canAddToCalendar: false,
      };
    }

    return result;
  }
}
