import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { SignalPriority } from '../interfaces/engagement.interfaces';

import { EngagementSignalService } from './engagement-signal.service';
import { NotificationFatigueService } from './notification-fatigue.service';

@Injectable()
export class ChannelSelectionService {
  private readonly logger = new Logger(ChannelSelectionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fatigueService: NotificationFatigueService,
    private readonly signalService: EngagementSignalService,
  ) {}

  /**
   * Evaluates signal priority and user preferences to select delivery channels and dispatch notifications.
   */
  async processAndDispatchSignal(signalId: string): Promise<{
    dispatched: boolean;
    channel?: string | undefined;
    notificationId?: string | undefined;
    reason?: string | undefined;
  }> {
    const signal = await this.prisma.engagementSignal.findUnique({
      where: { id: signalId },
    });

    if (!signal || signal.isHandled) {
      return { dispatched: false, reason: 'Signal not found or already handled' };
    }

    // 1. Fatigue & Quiet Hours Check
    const fatigueCheck = await this.fatigueService.canDeliverNotification(
      signal.userId,
      signal.priority as SignalPriority,
    );

    if (!fatigueCheck.allowed) {
      this.logger.log(
        `Signal ${signal.id} held by fatigue filter: ${fatigueCheck.reason || 'frequency cap'}`,
      );
      return { dispatched: false, reason: fatigueCheck.reason };
    }

    // 2. Select Channel based on Priority
    let channel: 'EMAIL' | 'PUSH' | 'SMS' = 'EMAIL';
    if (signal.priority === 'CRITICAL' || signal.priority === 'HIGH') {
      channel = 'EMAIL';
    } else {
      channel = 'EMAIL';
    }

    // 3. Create Notification record
    const notification = await this.prisma.notification.create({
      data: {
        userId: signal.userId,
        type: signal.signalType,
        title: signal.title,
        message: `${signal.description}\n\n👉 Recommended Action: ${signal.recommendedAction}`,
        priority: signal.priority as any,
        channel: channel as any,
        status: 'DELIVERED',
        sentAt: new Date(),
      },
    });

    // 4. Record action log & fatigue update
    await this.fatigueService.recordNotificationDelivery(
      signal.userId,
      notification.id,
      signal.signalType,
    );

    // 5. Mark signal as handled
    await this.signalService.markSignalHandled(signal.id);

    return {
      dispatched: true,
      channel,
      notificationId: notification.id,
    };
  }

  // ---------------------------------------------------------------------------
  // Domain Specific Engagement Helpers
  // ---------------------------------------------------------------------------

  async triggerOpportunityAlert(params: {
    userId: string;
    jobTitle: string;
    companyName: string;
    matchScore: number;
    jobId: string;
    deadline?: Date | undefined;
  }) {
    const isHighMatch = params.matchScore >= 90;
    const priority: SignalPriority = isHighMatch ? 'HIGH' : 'MEDIUM';

    const signal = await this.signalService.emitSignal(params.userId, {
      signalType: 'OPPORTUNITY_MATCH',
      priority,
      title: `${params.matchScore}% Match: ${params.jobTitle} at ${params.companyName}`,
      description: `New verified opportunity matches your target role and skills with ${params.matchScore}% compatibility.`,
      recommendedAction: 'Review requirements and tailor your application.',
      targetRoute: `/opportunities/${params.jobId}`,
      metadata: { jobId: params.jobId, matchScore: params.matchScore },
    });

    return this.processAndDispatchSignal(signal.id);
  }

  async triggerInterviewReminder(params: {
    userId: string;
    companyName: string;
    roleTitle: string;
    interviewDate: Date;
    applicationId: string;
  }) {
    const hoursRemaining = Math.max(
      1,
      Math.round((new Date(params.interviewDate).getTime() - Date.now()) / (1000 * 60 * 60)),
    );

    const isImminent = hoursRemaining <= 24;
    const priority: SignalPriority = isImminent ? 'CRITICAL' : 'HIGH';

    const signal = await this.signalService.emitSignal(params.userId, {
      signalType: 'INTERVIEW_UPCOMING',
      priority,
      title: `Interview Countdown: ${params.roleTitle} at ${params.companyName}`,
      description: isImminent
        ? `Your interview is scheduled for tomorrow (${hoursRemaining} hours remaining).`
        : `Interview in ${Math.round(hoursRemaining / 24)} days. Focus on mock questions and company research.`,
      recommendedAction: 'Review your personalized Interview Preparation checklist.',
      targetRoute: `/interviews?appId=${params.applicationId}`,
      metadata: { applicationId: params.applicationId, hoursRemaining },
    });

    return this.processAndDispatchSignal(signal.id);
  }
}
