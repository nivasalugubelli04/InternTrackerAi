import { Injectable, Logger } from '@nestjs/common';
import {
  ApplicationStatus,
  EffortCategory,
  ExecutionPriority,
  HiringInterviewStatus,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { ActionCandidate } from '../interfaces/execution.interfaces';

@Injectable()
export class UnifiedActionAggregatorService {
  private readonly logger = new Logger(UnifiedActionAggregatorService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Aggregates all actionable items from across the entire InternTracker ecosystem
   * without duplicating original entity records.
   */
  async aggregateCandidates(userId: string): Promise<ActionCandidate[]> {
    this.logger.log(`Aggregating execution candidates for user: ${userId}`);
    const now = new Date();
    const candidates: ActionCandidate[] = [];

    // 1. Fetch User and connected entities
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        resume: true,
        careerPreference: true,
        userGoals: { where: { status: 'ACTIVE' } },
        applications: {
          include: {
            job: {
              include: {
                company: true,
                intelligenceProfile: { include: { requirements: true } },
              },
            },
            alignment: true,
            checklists: true,
            preparationPlan: true,
          },
        },
        candidateHiringInterviews: {
          where: {
            status: {
              in: [
                HiringInterviewStatus.SCHEDULED,
                HiringInterviewStatus.CONFIRMED,
                HiringInterviewStatus.IN_PROGRESS,
              ],
            },
            scheduledStart: { gte: now },
          },
          include: {
            job: { include: { company: true } },
          },
          orderBy: { scheduledStart: 'asc' },
        },
        learningEnrollments: {
          where: { completedAt: null },
          include: {
            module: { include: { skill: true } },
          },
        },
        portfolioRecommendations: {
          take: 3,
        },
        professionalContacts: {
          include: {
            followUps: {
              where: { status: 'PENDING' },
              orderBy: { scheduledFor: 'asc' },
            },
            outreachDrafts: {
              where: { isApproved: false },
            },
          },
        },
        careerTrajectories: {
          take: 1,
          orderBy: { updatedAt: 'desc' },
        },
        externalDataRecords: {
          where: { recordType: 'CALENDAR_EVENT' },
          take: 5,
          orderBy: { fetchedAt: 'desc' },
        },
        careerActions: {
          where: {
            status: 'PENDING',
            OR: [{ snoozedUntil: null }, { snoozedUntil: { lte: now } }],
            expiresAt: {
              or: [{ equals: null }, { gt: now }],
            } as any,
          },
        },
      },
    });

    if (!user) {
      this.logger.warn(`User ${userId} not found during action aggregation`);
      return [];
    }

    // ── Source 1: Upcoming Interviews (Highest Urgency) ──────────────────────
    for (const interview of user.candidateHiringInterviews) {
      const scheduledDate = new Date(interview.scheduledStart);
      const hoursUntil = (scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      const isImminent = hoursUntil <= 48;
      const companyName = interview.job?.company?.name || 'Target Company';
      const jobTitle = interview.job?.title || 'Technical Role';

      candidates.push({
        title: `Prepare for technical interview with ${companyName}`,
        description: `Review role requirements, practice system design/coding, and review company context for ${jobTitle}.`,
        source: 'INTERVIEW',
        sourceEntityType: 'HiringInterview',
        sourceEntityId: interview.id,
        priority: isImminent ? ExecutionPriority.CRITICAL : ExecutionPriority.HIGH,
        focusLevel: 'HIGH',
        estimatedEffort: EffortCategory.DEEP_WORK,
        estimatedMinutes: 60,
        deadline: scheduledDate,
        priorityExplanation: `Interview scheduled in ${Math.max(1, Math.round(hoursUntil))} hours. Direct career milestone.`,
        potentialImpact: 'High likelihood of advancing to next round or receiving an offer.',
        suggestedNextStep: 'Open Interview Coach to run a targeted 45-minute practice session.',
        relevanceScore: 98,
      });
    }

    // ── Source 2: Applications & Opportunity Deadlines ────────────────────────
    for (const app of user.applications) {
      const deadline = app.job?.deadline ? new Date(app.job.deadline) : null;
      const daysUntilDeadline = deadline
        ? Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null;
      const companyName = app.job?.company?.name || 'Company';
      const roleTitle = app.job?.title || 'Internship';

      if (
        app.status === ApplicationStatus.DISCOVERED ||
        app.status === ApplicationStatus.APPLICATION_STARTED
      ) {
        const isUrgent = daysUntilDeadline !== null && daysUntilDeadline <= 3;
        candidates.push({
          title: `Finalize & submit application for ${roleTitle} at ${companyName}`,
          description: `Complete application requirements and verify resume alignment before deadline.`,
          source: 'APPLICATION',
          sourceEntityType: 'Application',
          sourceEntityId: app.id,
          priority: isUrgent ? ExecutionPriority.HIGH : ExecutionPriority.IMPORTANT,
          focusLevel: isUrgent ? 'HIGH' : 'MEDIUM',
          estimatedEffort: EffortCategory.MEDIUM,
          estimatedMinutes: 30,
          deadline,
          priorityExplanation: deadline
            ? `Deadline approaches in ${daysUntilDeadline} days.`
            : 'Active target opportunity in your pipeline.',
          potentialImpact: 'Secures candidacy for a high-alignment role.',
          suggestedNextStep: 'Review tailored resume and submit on portal.',
          relevanceScore: 85,
        });
      } else if (app.status === ApplicationStatus.APPLIED) {
        const appliedDate = new Date(app.appliedAt || app.createdAt);
        const daysSinceApply = (now.getTime() - appliedDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceApply >= 7 && daysSinceApply <= 21) {
          candidates.push({
            title: `Send follow-up for ${roleTitle} at ${companyName}`,
            description: `Politely check in on application status with recruiter or hiring team.`,
            source: 'FOLLOW_UP',
            sourceEntityType: 'Application',
            sourceEntityId: app.id,
            priority: ExecutionPriority.WHEN_POSSIBLE,
            focusLevel: 'LOW',
            estimatedEffort: EffortCategory.QUICK,
            estimatedMinutes: 15,
            deadline: null,
            priorityExplanation: `Applied ${Math.round(daysSinceApply)} days ago. A brief status check increases visibility.`,
            potentialImpact: 'Brings your application back to the recruiter top-of-inbox.',
            suggestedNextStep: 'Draft a short 3-sentence note via the Networking tab.',
            relevanceScore: 65,
          });
        }
      }
    }

    // ── Source 3: Active Learning & Skill Gaps ───────────────────────────────
    for (const enrollment of user.learningEnrollments) {
      const skillName = enrollment.module?.skill?.name || 'Core Skill';
      candidates.push({
        title: `Advance skill module: ${enrollment.module.title} (${skillName})`,
        description: `Complete hands-on exercises in ${enrollment.module.title} to close key skill gaps.`,
        source: 'LEARNING',
        sourceEntityType: 'LearningEnrollment',
        sourceEntityId: enrollment.id,
        priority: ExecutionPriority.IMPORTANT,
        focusLevel: 'MEDIUM',
        estimatedEffort: EffortCategory.SHORT,
        estimatedMinutes: 25,
        deadline: null,
        priorityExplanation: `Closing ${skillName} gap directly improves match rates for target roles.`,
        potentialImpact: 'Increases algorithmic match score by up to 15%.',
        suggestedNextStep: 'Complete the next practical coding exercise.',
        relevanceScore: 78,
      });
    }

    // ── Source 4: Networking & Outreach ───────────────────────────────────────
    for (const contact of user.professionalContacts) {
      for (const followUp of contact.followUps) {
        const dueDate = new Date(followUp.scheduledFor);
        const isPastDue = dueDate <= now;
        candidates.push({
          title: `Networking follow-up with ${contact.name} (${contact.role} at ${contact.company || 'Tech'})`,
          description: `Follow up on your previous conversation regarding career insights and guidance.`,
          source: 'NETWORKING',
          sourceEntityType: 'ProfessionalContact',
          sourceEntityId: contact.id,
          priority: isPastDue ? ExecutionPriority.HIGH : ExecutionPriority.IMPORTANT,
          focusLevel: 'MEDIUM',
          estimatedEffort: EffortCategory.QUICK,
          estimatedMinutes: 15,
          deadline: dueDate,
          priorityExplanation: isPastDue
            ? 'Follow-up is due today based on your relationship cadence.'
            : 'Scheduled networking checkpoint.',
          potentialImpact: 'Builds warm advocate relationship for potential internal referrals.',
          suggestedNextStep: 'Review past interaction notes and send brief update note.',
          relevanceScore: 72,
        });
      }

      for (const draft of contact.outreachDrafts) {
        candidates.push({
          title: `Review outreach message for ${contact.name}`,
          description: `Review AI-drafted introduction tailored to ${contact.name}'s background.`,
          source: 'NETWORKING',
          sourceEntityType: 'OutreachDraft',
          sourceEntityId: draft.id,
          priority: ExecutionPriority.WHEN_POSSIBLE,
          focusLevel: 'LOW',
          estimatedEffort: EffortCategory.QUICK,
          estimatedMinutes: 10,
          deadline: null,
          priorityExplanation: 'Draft ready for review. You maintain full control before sending.',
          potentialImpact: 'Initiates valuable mentor or peer connection.',
          suggestedNextStep: 'Inspect message draft, personalize, and copy to send.',
          relevanceScore: 60,
        });
      }
    }

    // ── Source 5: Portfolio Intelligence ─────────────────────────────────────
    for (const rec of user.portfolioRecommendations) {
      candidates.push({
        title: rec.title,
        description: rec.description,
        source: 'PORTFOLIO',
        sourceEntityType: 'PortfolioRecommendation',
        sourceEntityId: rec.id,
        priority:
          rec.priority === 'HIGH' ? ExecutionPriority.IMPORTANT : ExecutionPriority.WHEN_POSSIBLE,
        focusLevel: 'MEDIUM',
        estimatedEffort: EffortCategory.DEEP_WORK,
        estimatedMinutes: 45,
        deadline: null,
        priorityExplanation:
          'High-impact portfolio evidence validates practical engineering competence.',
        potentialImpact: 'Provides tangible proof for technical recruiters & hiring managers.',
        suggestedNextStep: 'Add live deployment link and README architecture diagram.',
        relevanceScore: 70,
      });
    }

    // ── Source 6: User-Created Goals ─────────────────────────────────────────
    for (const goal of user.userGoals) {
      if (goal.deadline) {
        const goalDeadline = new Date(goal.deadline);
        const daysLeft = Math.ceil(
          (goalDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );
        candidates.push({
          title: `Progress Goal: ${goal.title}`,
          description: `Work toward target value (${goal.currentValue}/${goal.targetValue}) before deadline.`,
          source: 'USER_CREATED',
          sourceEntityType: 'UserGoal',
          sourceEntityId: goal.id,
          priority: daysLeft <= 5 ? ExecutionPriority.HIGH : ExecutionPriority.IMPORTANT,
          focusLevel: 'MEDIUM',
          estimatedEffort: EffortCategory.SHORT,
          estimatedMinutes: 30,
          deadline: goalDeadline,
          priorityExplanation: `User-defined career milestone due in ${daysLeft} days.`,
          potentialImpact:
            'Directly moves your self-defined career objective toward 100% completion.',
          suggestedNextStep: 'Log today’s incremental progress.',
          relevanceScore: 75,
        });
      }
    }

    // ── Source 7: Map Existing Phase 37 CareerActions ────────────────────────
    for (const dbAction of user.careerActions) {
      if (!candidates.some((c) => c.title.toLowerCase() === dbAction.actionType.toLowerCase())) {
        const itemCandidate: ActionCandidate = {
          actionId: dbAction.id,
          title: this.formatActionTitle(dbAction.actionType),
          description: dbAction.explanation || 'Recommended action by Career Priority Engine.',
          source: (dbAction.entityType?.toUpperCase() as any) || 'CAREER_STRATEGY',
          sourceEntityType: dbAction.entityType,
          priority: this.mapDbPriority(dbAction.priority),
          focusLevel: dbAction.priority === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
          estimatedEffort: EffortCategory.SHORT,
          estimatedMinutes: 20,
          deadline: dbAction.expiresAt,
          priorityExplanation: dbAction.explanation || 'Priority recommendation from Phase 37.',
          potentialImpact: 'Maintains healthy execution momentum.',
          suggestedNextStep: 'Open details to execute step-by-step.',
          relevanceScore: dbAction.relevanceScore ? dbAction.relevanceScore * 100 : 60,
        };
        if (dbAction.entityId) {
          itemCandidate.sourceEntityId = dbAction.entityId;
        }
        candidates.push(itemCandidate);
      }
    }

    this.logger.log(`Aggregated ${candidates.length} candidate actions for user ${userId}`);
    return candidates;
  }

  private mapDbPriority(priority: string): ExecutionPriority {
    switch (priority?.toUpperCase()) {
      case 'CRITICAL':
        return ExecutionPriority.CRITICAL;
      case 'HIGH':
        return ExecutionPriority.HIGH;
      case 'MEDIUM':
        return ExecutionPriority.IMPORTANT;
      case 'LOW':
        return ExecutionPriority.WHEN_POSSIBLE;
      default:
        return ExecutionPriority.IMPORTANT;
    }
  }

  private formatActionTitle(actionType: string): string {
    return actionType
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}
