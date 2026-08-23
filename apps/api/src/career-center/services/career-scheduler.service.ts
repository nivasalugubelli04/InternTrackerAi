import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { AiService } from '../../ai/services/ai.service';
import {
  NotificationType,
  NotificationChannel,
} from '../../notifications/enums/notification.enums';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';

import { CareerEventsService } from './career-events.service';
import { CommandCenterService } from './command-center.service';

@Injectable()
export class CareerSchedulerService {
  private readonly logger = new Logger(CareerSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsService: CareerEventsService,
    private readonly commandCenter: CommandCenterService,
    private readonly notificationsService: NotificationsService,
    private readonly aiService: AiService,
  ) {}

  /**
   * Hourly check for deadlines (Application deadlines, Assessment deadlines, Upcoming interviews)
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkDeadlines(): Promise<void> {
    this.logger.log('Running deadline monitoring cron...');
    const now = new Date();
    const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // 1. Application/Opportunity deadlines
    const closingJobs = await this.prisma.jobPosting.findMany({
      where: {
        deadline: { gt: now, lte: next24h },
        status: 'ACTIVE',
      },
      include: { recommendations: { where: { isSaved: true } } },
    });

    for (const job of closingJobs) {
      for (const rec of job.recommendations) {
        await this.eventsService.publish({
          userId: rec.userId,
          eventType: 'OPPORTUNITY_CLOSING_SOON',
          source: 'Deadline Watcher',
          entityType: 'JobPosting',
          entityId: job.id,
          importance: 'HIGH',
        });
      }
    }

    // 2. Assessment assignments deadlines
    const dueAssessments = await this.prisma.assessmentAssignment.findMany({
      where: {
        status: { in: ['ASSIGNED', 'STARTED', 'IN_PROGRESS'] },
        assessment: { deadline: { gt: now, lte: next24h } },
      },
      include: { assessment: true },
    });

    for (const assign of dueAssessments) {
      await this.eventsService.publish({
        userId: assign.candidateId,
        eventType: 'ASSESSMENT_DUE',
        source: 'Deadline Watcher',
        entityType: 'AssessmentAssignment',
        entityId: assign.id,
        importance: 'CRITICAL',
      });
    }

    // 3. Interviews tomorrow (between 22h and 26h from now)
    const next26h = new Date(now.getTime() + 26 * 60 * 60 * 1000);
    const next22h = new Date(now.getTime() + 22 * 60 * 60 * 1000);
    const tomorrowInterviews = await this.prisma.hiringInterview.findMany({
      where: {
        scheduledStart: { gt: next22h, lte: next26h },
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
      },
    });

    for (const interview of tomorrowInterviews) {
      await this.eventsService.publish({
        userId: interview.candidateId,
        eventType: 'INTERVIEW_TOMORROW',
        source: 'Deadline Watcher',
        entityType: 'HiringInterview',
        entityId: interview.id,
        importance: 'CRITICAL',
      });
    }

    // 4. Inactivity detection: upcoming interview but no mock prep in 3 days
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const upcomingInterviews = await this.prisma.hiringInterview.findMany({
      where: {
        scheduledStart: { gt: now, lte: next24h },
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
      },
      include: {
        candidate: {
          include: {
            mockInterviews: {
              where: { createdAt: { gte: threeDaysAgo } },
            },
          },
        },
      },
    });

    for (const interview of upcomingInterviews) {
      if (interview.candidate.mockInterviews.length === 0) {
        await this.eventsService.publish({
          userId: interview.candidateId,
          eventType: 'USER_INACTIVE',
          source: 'Inactivity Detector',
          entityType: 'HiringInterview',
          entityId: interview.id,
          importance: 'MEDIUM',
        });
      }
    }

    // 5. Application Follow-ups: applied 7 days ago, no response
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
    const pendingFollowUps = await this.prisma.application.findMany({
      where: {
        status: 'APPLIED',
        appliedAt: { gt: eightDaysAgo, lte: sevenDaysAgo },
      },
    });

    for (const app of pendingFollowUps) {
      await this.eventsService.publish({
        userId: app.userId,
        eventType: 'FOLLOW_UP_DUE',
        source: 'Deadline Watcher',
        entityType: 'Application',
        entityId: app.id,
        importance: 'HIGH',
      });
    }
  }

  /**
   * Daily check for goal risk detection
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkGoalRisk(): Promise<void> {
    this.logger.log('Running goal risk monitoring cron...');
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const goalsAtRisk = await this.prisma.userGoal.findMany({
      where: {
        status: 'ACTIVE',
        deadline: { lte: tomorrow },
      },
    });

    for (const goal of goalsAtRisk) {
      if (goal.currentValue < goal.targetValue) {
        await this.eventsService.publish({
          userId: goal.userId,
          eventType: 'GOAL_AT_RISK',
          source: 'Goal System',
          entityType: 'UserGoal',
          entityId: goal.id,
          importance: 'HIGH',
        });
      }
    }
  }

  /**
   * Daily digest generation: runs every evening at 17:00 (5 PM)
   */
  @Cron('0 17 * * *')
  async runDailyDigest(): Promise<void> {
    this.logger.log('Generating daily digests...');
    const activeUsers = await this.prisma.user.findMany({
      where: { isActive: true },
    });

    for (const user of activeUsers) {
      const pref = await this.prisma.automationPreference.findUnique({
        where: { userId: user.id },
      });
      if (pref && !pref.dailyDigest) continue;

      const data = await this.commandCenter.getCommandCenterData(user.id);
      if (data.priorityActions.length === 0 && data.upcomingEvents.length === 0) {
        continue;
      }

      let brief = '';
      try {
        const provider = (this.aiService as any).aiProvider;
        const systemPrompt = `You are a career summary assistant. Summarize today's activities. Factual and grounded only.`;
        const result = await provider.generateText(
          `Candidate Summary: ${JSON.stringify(data)}`,
          systemPrompt,
        );
        brief = result.text;
      } catch (err) {
        brief = `Daily Digest: You have ${data.priorityActions.length} pending actions and ${data.upcomingEvents.length} upcoming events today. Review your command center.`;
      }

      await this.notificationsService.queueNotification({
        userId: user.id,
        type: NotificationType.DAILY_DIGEST,
        title: '💼 Your Daily Career Digest',
        message: brief,
        channel: NotificationChannel.PUSH,
      });
    }
  }
}
