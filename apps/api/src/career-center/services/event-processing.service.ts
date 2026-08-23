import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AiService } from '../../ai/services/ai.service';
import type { AppConfig } from '../../config/configuration';
import {
  NotificationChannel,
  NotificationType,
} from '../../notifications/enums/notification.enums';
import { FrequencyLimiterService } from '../../notifications/services/frequency-limiter.service';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { PreferenceValidatorService } from '../../notifications/services/preference-validator.service';
import { PrismaService } from '../../prisma/prisma.service';

export interface CareerEventPayload {
  userId: string;
  eventType: string;
  source: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, any>;
  importance?: string;
  timestamp?: Date;
}

@Injectable()
export class EventProcessingService {
  private readonly logger = new Logger(EventProcessingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<AppConfig, true>,
    private readonly notificationsService: NotificationsService,
    private readonly preferenceValidator: PreferenceValidatorService,
    private readonly frequencyLimiter: FrequencyLimiterService,
    private readonly aiService: AiService,
  ) {}

  /**
   * Main entry point to process an incoming event asynchronously.
   */
  async processEvent(payload: CareerEventPayload): Promise<any> {
    this.logger.log(`Processing career event ${payload.eventType} for user: ${payload.userId}`);

    // 1. Event Normalization & Validation
    const eventId = await this.normalizeAndSaveEvent(payload);

    // 2. Deduplication check
    const isDuplicate = await this.checkDeduplication(payload);
    if (isDuplicate) {
      await this.logProcessingResult(eventId, 'SKIPPED', 'Duplicate event within 5 minutes.');
      return { success: true, status: 'DUPLICATE' };
    }

    // 3. Relevance Evaluation
    const relevance = await this.evaluateRelevance(payload);
    if (!relevance.isRelevant) {
      await this.logProcessingResult(eventId, 'SKIPPED', relevance.reason);
      return { success: true, status: 'IRRELEVANT' };
    }

    // 4. Priority Engine Integration
    const priority = this.determinePriority(payload, relevance);

    // 5. Decision Rules (Action generation)
    const action = await this.executeDecisionRules(payload, priority, relevance.matchScore);

    // 6. Notification Dispatch
    await this.considerNotification(payload, priority, action);

    // 7. Success log
    await this.logProcessingResult(eventId, 'PROCESSED');
    return { success: true, status: 'PROCESSED', actionId: action?.id };
  }

  // ── Private Pipeline Helpers ──────────────────────────────────────────────

  private async normalizeAndSaveEvent(payload: CareerEventPayload): Promise<string> {
    const defaultImportance = this.getDefaultImportance(payload.eventType);
    const event = await this.prisma.careerEvent.create({
      data: {
        userId: payload.userId,
        eventType: payload.eventType,
        source: payload.source,
        entityType: payload.entityType,
        entityId: payload.entityId || null,
        metadata: payload.metadata || {},
        importance: payload.importance || defaultImportance,
        processed: false,
        timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
      },
    });

    // Create Agent Activity log entry
    await this.prisma.agentActivity.create({
      data: {
        userId: payload.userId,
        eventId: event.id,
        activityType: 'EVENT_DETECTED',
        description: `Detected career event: ${payload.eventType} from ${payload.source}.`,
      },
    });

    return event.id;
  }

  private async checkDeduplication(payload: CareerEventPayload): Promise<boolean> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const duplicate = await this.prisma.careerEvent.findFirst({
      where: {
        userId: payload.userId,
        eventType: payload.eventType,
        entityType: payload.entityType,
        entityId: payload.entityId || null,
        createdAt: { gte: fiveMinutesAgo },
      },
    });
    return !!duplicate;
  }

  private async evaluateRelevance(
    payload: CareerEventPayload,
  ): Promise<{ isRelevant: boolean; reason?: string; matchScore?: number }> {
    let pref = await this.prisma.automationPreference.findUnique({
      where: { userId: payload.userId },
    });
    if (!pref) {
      pref = await this.prisma.automationPreference.create({
        data: { userId: payload.userId },
      });
    }

    // Guard 1: Proactive assistance disabled
    const isCritical = this.isCriticalEvent(payload.eventType);
    if (!pref.proactiveAssistanceEnabled && !isCritical) {
      return {
        isRelevant: false,
        reason: 'Proactive career assistance is disabled in preferences.',
      };
    }

    // Opportunity matches (Watch mode check)
    if (payload.eventType === 'NEW_OPPORTUNITY' || payload.eventType === 'OPPORTUNITY_UPDATED') {
      if (payload.entityId) {
        const matchesWatch = await this.checkOpportunityWatchMatch(payload.entityId, pref);
        if (matchesWatch) {
          return { isRelevant: true, reason: 'Opportunity matches watched criteria' };
        }

        // Check match score
        const scoreObj = await this.prisma.matchScore.findUnique({
          where: { userId_jobId: { userId: payload.userId, jobId: payload.entityId } },
        });
        const matchScore = scoreObj?.overallScore || 50;

        // Automation intensity filter
        if (pref.automationIntensity === 'MINIMAL' && matchScore < 90) {
          return {
            isRelevant: false,
            reason: 'Opportunity match score below 90% in Minimal mode.',
          };
        }
        if (pref.automationIntensity === 'BALANCED' && matchScore < 75) {
          return {
            isRelevant: false,
            reason: 'Opportunity match score below 75% in Balanced mode.',
          };
        }
        return { isRelevant: true, matchScore };
      }
    }

    // Company watch mode
    if (payload.eventType === 'TRACKED_COMPANY_OPPORTUNITY') {
      const isTracked = payload.entityId
        ? await this.prisma.trackedCompany.findFirst({
            where: { userId: payload.userId, companyId: payload.entityId },
          })
        : null;
      if (!isTracked) {
        return { isRelevant: false, reason: 'Company is not tracked by the candidate.' };
      }
    }

    // Intensity mapping for general events
    const importance = this.getDefaultImportance(payload.eventType);
    if (
      pref.automationIntensity === 'MINIMAL' &&
      importance !== 'HIGH' &&
      importance !== 'CRITICAL'
    ) {
      return {
        isRelevant: false,
        reason: `Suppressed low/medium priority event ${payload.eventType} in Minimal mode.`,
      };
    }
    if (pref.automationIntensity === 'BALANCED' && importance === 'LOW') {
      return {
        isRelevant: false,
        reason: `Suppressed low priority event ${payload.eventType} in Balanced mode.`,
      };
    }

    return { isRelevant: true };
  }

  private determinePriority(
    payload: CareerEventPayload,
    relevance: { matchScore?: number },
  ): 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const defaultImportance = this.getDefaultImportance(payload.eventType) as any;
    if (
      payload.eventType === 'NEW_OPPORTUNITY' &&
      relevance.matchScore &&
      relevance.matchScore >= 90
    ) {
      return 'HIGH';
    }
    return defaultImportance;
  }

  private async executeDecisionRules(
    payload: CareerEventPayload,
    priority: string,
    matchScore?: number,
  ): Promise<any> {
    let actionType = '';
    let safetyClass = 'TYPE_A';

    switch (payload.eventType) {
      case 'FOLLOW_UP_DUE':
      case 'FOLLOW_UP_OVERDUE':
        actionType = 'FOLLOW_UP';
        safetyClass = 'TYPE_B';
        break;

      case 'INTERVIEW_SCHEDULED':
      case 'INTERVIEW_UPCOMING':
      case 'INTERVIEW_TOMORROW':
        actionType = 'INTERVIEW_PREP';
        safetyClass = 'TYPE_A';
        break;

      case 'NEW_OPPORTUNITY':
      case 'HIGH_MATCH_OPPORTUNITY':
        actionType = 'REVIEW_JOB';
        safetyClass = 'TYPE_A';
        break;

      case 'SKILL_GAP_CHANGED':
        actionType = 'LEARNING_TASK';
        safetyClass = 'TYPE_A';
        break;

      case 'GOAL_AT_RISK':
        actionType = 'GOAL_CHECK';
        safetyClass = 'TYPE_B';
        break;

      case 'USER_INACTIVE':
        actionType = 'LEARNING_TASK';
        safetyClass = 'TYPE_A';
        break;

      default:
        return null;
    }

    // Safety classification limits
    if (actionType === 'SEND_EMAIL') {
      safetyClass = 'TYPE_C';
    }

    // Calculate expiry date (default 7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Call AI explanation and drafting proactively for high/critical importance actions
    let explanation = this.getDeterministicExplanation(actionType);
    let draft: any = null;

    if (priority === 'HIGH' || priority === 'CRITICAL') {
      const aiResponse = await this.generateAiExplanationAndDraft(
        actionType,
        payload.entityType,
        payload.entityId,
      );
      explanation = aiResponse.explanation;
      draft = aiResponse.draft;
    }

    // Create Action record in CareerAction
    const action = await this.prisma.careerAction.create({
      data: {
        userId: payload.userId,
        actionType,
        entityType: payload.entityType,
        entityId: payload.entityId || null,
        priority,
        status: 'PENDING',
        expiresAt,
        explanation,
        draft: draft || {},
        safetyClass,
        isApproved: safetyClass === 'TYPE_A' ? true : null,
        relevanceScore: matchScore || null,
      },
    });

    await this.prisma.agentActivity.create({
      data: {
        userId: payload.userId,
        eventId: null,
        activityType: 'ACTION_CREATED',
        description: `Created proactive ${actionType} action priority: ${priority}.`,
      },
    });

    return action;
  }

  private async considerNotification(
    payload: CareerEventPayload,
    priority: string,
    action: any,
  ): Promise<void> {
    const pref = await this.prisma.automationPreference.findUnique({
      where: { userId: payload.userId },
    });
    if (!pref) return;

    // Check category toggles
    let enabled = true;
    const type = payload.eventType;

    if (type.includes('OPPORTUNITY')) enabled = pref.opportunityAlerts;
    else if (type.includes('INTERVIEW')) enabled = pref.interviewReminders;
    else if (type.includes('FOLLOW_UP') || type.includes('APPLICATION'))
      enabled = pref.followUpReminders;
    else if (type.includes('LEARNING') || type.includes('SKILL')) enabled = pref.learningReminders;
    else if (type.includes('INSIGHT') || type.includes('TREND')) enabled = pref.careerInsights;
    else if (type.includes('COMPANY')) enabled = pref.companyAlerts;

    if (!enabled) return;

    // Check quiet hours
    const quietHours = await this.preferenceValidator.checkQuietHours(payload.userId);
    let scheduledFor: Date | undefined;

    if (quietHours.isQuietHours) {
      if (priority === 'CRITICAL') {
        scheduledFor = undefined;
      } else {
        scheduledFor = quietHours.resumesAt;
      }
    }

    // Check frequency limit
    const isInstant = priority === 'HIGH' || priority === 'CRITICAL';
    const limitCheck = await this.frequencyLimiter.checkLimit(payload.userId, isInstant);
    if (!limitCheck.passed) {
      this.logger.log(
        `Notification for event ${payload.eventType} supressed due to frequency limit.`,
      );
      return;
    }

    // Smart Bundling logic for low/medium opportunity items
    if (payload.eventType === 'NEW_OPPORTUNITY' && priority === 'LOW') {
      await this.bundleNotification(payload);
      return;
    }

    // Standard single dispatch
    const title = this.getNotificationTitle(payload.eventType);
    const message =
      action?.explanation ||
      `Recommended action for ${payload.eventType}. Review your command center.`;

    const notifyData: any = {
      userId: payload.userId,
      type: NotificationType.INSTANT_ALERT,
      title,
      message,
      channel: NotificationChannel.PUSH,
    };
    if (scheduledFor) {
      notifyData.scheduledFor = scheduledFor;
    }

    await this.notificationsService.queueNotification(notifyData);

    await this.prisma.agentActivity.create({
      data: {
        userId: payload.userId,
        activityType: 'NOTIFICATION_SENT',
        description: `Dispatched notification for ${payload.eventType}.`,
      },
    });
  }

  private async bundleNotification(payload: CareerEventPayload): Promise<void> {
    let bundle = await this.prisma.notificationBundle.findFirst({
      where: { userId: payload.userId, bundleType: 'NEW_OPPORTUNITIES' },
    });

    const eventRecord = await this.prisma.careerEvent.findFirst({
      where: { userId: payload.userId, eventType: payload.eventType },
      orderBy: { createdAt: 'desc' },
    });

    if (!bundle) {
      bundle = await this.prisma.notificationBundle.create({
        data: {
          userId: payload.userId,
          bundleType: 'NEW_OPPORTUNITIES',
          eventIds: eventRecord ? [eventRecord.id] : [],
        },
      });

      // Schedule delayed dispatch of bundled details in 5 mins
      setTimeout(
        async () => {
          try {
            if (!bundle) return;
            const freshBundle = await this.prisma.notificationBundle.findUnique({
              where: { id: bundle.id },
            });
            if (freshBundle && freshBundle.eventIds.length > 0) {
              const count = freshBundle.eventIds.length;
              const message = `${count} new opportunities match your target career goals.`;
              await this.notificationsService.queueNotification({
                userId: payload.userId,
                type: NotificationType.DAILY_DIGEST,
                title: '🎯 New Matches Available',
                message,
                channel: NotificationChannel.PUSH,
              });

              // Clear bundle
              await this.prisma.notificationBundle.delete({ where: { id: freshBundle.id } });
            }
          } catch (err) {
            this.logger.error('Bundling task failure', err);
          }
        },
        5 * 60 * 1000,
      );
    } else {
      const updatedEvents = [...bundle.eventIds];
      if (eventRecord && !updatedEvents.includes(eventRecord.id)) {
        updatedEvents.push(eventRecord.id);
        await this.prisma.notificationBundle.update({
          where: { id: bundle.id },
          data: { eventIds: updatedEvents },
        });
      }
    }
  }

  private async checkOpportunityWatchMatch(jobId: string, pref: any): Promise<boolean> {
    const job = await this.prisma.jobPosting.findUnique({
      where: { id: jobId },
      include: { company: true },
    });
    if (!job) return false;

    const roleMatch = pref.watchedRoles.some((role: string) =>
      job.title.toLowerCase().includes(role.toLowerCase()),
    );
    const companyMatch = pref.watchedCompanies.some((comp: string) =>
      job.company.name.toLowerCase().includes(comp.toLowerCase()),
    );
    const locationMatch = pref.watchedLocations.some((loc: string) =>
      job.location?.toLowerCase().includes(loc.toLowerCase()),
    );
    const workModeMatch = pref.watchedWorkModes.some((wm: string) =>
      job.workMode?.toLowerCase().includes(wm.toLowerCase()),
    );
    const skillMatch = pref.watchedSkills.some((skill: string) =>
      job.requirements.some((req) => req.toLowerCase().includes(skill.toLowerCase())),
    );

    return roleMatch || companyMatch || locationMatch || workModeMatch || skillMatch;
  }

  private async generateAiExplanationAndDraft(
    actionType: string,
    entityType: string,
    entityId: string | null | undefined,
  ): Promise<{ explanation: string; draft: any }> {
    const aiConfig = this.configService.get<any>('ai');
    const isAiEnabled = aiConfig?.enabled ?? true;
    if (!isAiEnabled) {
      return { explanation: this.getDeterministicExplanation(actionType), draft: null };
    }

    let contextStr = '';
    if (entityType === 'JobPosting' && entityId) {
      const job = await this.prisma.jobPosting.findUnique({
        where: { id: entityId },
        include: { company: true },
      });
      if (job)
        contextStr = `Job: "${job.title}" at "${job.company.name}". Requirements: ${job.requirements.join(', ')}.`;
    } else if (entityType === 'Application' && entityId) {
      const app = await this.prisma.application.findUnique({ where: { id: entityId } });
      if (app)
        contextStr = `Application for "${app.jobTitleSnapshot}" at "${app.companyNameSnapshot}". Status: ${app.status}.`;
    } else if (entityType === 'HiringInterview' && entityId) {
      const interview = await this.prisma.hiringInterview.findUnique({
        where: { id: entityId },
        include: { job: { include: { company: true } } },
      });
      if (interview)
        contextStr = `Interview with "${interview.job?.company.name}" scheduled at ${interview.scheduledStart}.`;
    } else if (entityType === 'UserGoal' && entityId) {
      const goal = await this.prisma.userGoal.findUnique({ where: { id: entityId } });
      if (goal)
        contextStr = `Goal: "${goal.title}". Progress: ${goal.currentValue}/${goal.targetValue}.`;
    }

    const systemPrompt = `You are a Career Agent Advisor at InternTracker AI.
Generate a JSON output containing a concise grounded explanation of why this action is shown, and a pre-drafted template if needed.
Facts: ${contextStr}`;

    try {
      const provider = (this.aiService as any).aiProvider;
      const result = await provider.generateStructuredOutput(
        `Action: ${actionType}, Entity: ${entityType}. Explain why.`,
        {
          type: 'object',
          properties: {
            explanation: { type: 'string' },
            draft: { type: 'object' },
          },
          required: ['explanation'],
        },
        systemPrompt,
      );
      return { explanation: result.explanation, draft: result.draft };
    } catch (e) {
      return {
        explanation: this.getDeterministicExplanation(actionType),
        draft: this.getDeterministicDraft(actionType),
      };
    }
  }

  private getDeterministicExplanation(actionType: string): string {
    switch (actionType) {
      case 'FOLLOW_UP':
        return 'It has been 7 days since you applied. We recommend sending a follow-up inquiry to show initiative.';
      case 'INTERVIEW_PREP':
        return 'Your interview is approaching. We recommend reviewing preparation questions and practice mocks.';
      case 'REVIEW_JOB':
        return 'A new job posting highly aligns with your profile and target internship goals.';
      case 'LEARNING_TASK':
        return 'Docker and Python remain major skill gaps for target roles. Practice recommended learning milestones.';
      case 'GOAL_CHECK':
        return 'You are behind on your weekly goal targets. Consider applying to more roles.';
      default:
        return 'Fulfill recommended strategic tasks in your command center to increase placement odds.';
    }
  }

  private getDeterministicDraft(actionType: string): any {
    if (actionType === 'FOLLOW_UP') {
      return {
        subject: 'Follow-up on application status',
        body: 'Dear Recruiter,\n\nI hope this email finds you well.\n\nI am writing to express my continued interest in the position and politely inquire if there are any updates regarding my application status.\n\nThank you for your time.\n\nSincerely,\nCandidate',
      };
    }
    return null;
  }

  private getNotificationTitle(eventType: string): string {
    switch (eventType) {
      case 'NEW_OPPORTUNITY':
        return '🎯 New Match Discovered';
      case 'INTERVIEW_TOMORROW':
        return '⏰ Interview Tomorrow!';
      case 'FOLLOW_UP_DUE':
        return '✉️ Time to Follow Up';
      case 'GOAL_AT_RISK':
        return '⚠️ Goal Targets at Risk';
      default:
        return '✨ Career Agent Update';
    }
  }

  private getDefaultImportance(eventType: string): string {
    if (this.isCriticalEvent(eventType)) return 'CRITICAL';
    if (
      eventType.includes('HIGH_MATCH') ||
      eventType.includes('RISK') ||
      eventType.includes('OVERDUE')
    )
      return 'HIGH';
    if (eventType.includes('SCHEDULED') || eventType.includes('UPDATED')) return 'MEDIUM';
    return 'LOW';
  }

  private isCriticalEvent(eventType: string): boolean {
    return eventType === 'INTERVIEW_TOMORROW' || eventType === 'ASSESSMENT_DUE';
  }

  private async logProcessingResult(
    eventId: string,
    status: string,
    reason?: string | null,
  ): Promise<void> {
    await this.prisma.eventProcessingLog.upsert({
      where: { eventId },
      create: { eventId, status, reason: reason || null },
      update: { status, reason: reason || null },
    });
  }
}
