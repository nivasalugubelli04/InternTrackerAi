import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { HiringInterviewStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

export interface CareerActionItem {
  id: string;
  actionType: string;
  entityType: string;
  entityId: string | null;
  priority: string;
  status: string;
  title: string;
  description: string;
  expiresAt: Date | null;
}

export interface ActionCandidate {
  actionType: string;
  entityType: string;
  entityId: string | null;
  priority: string;
  expiresAt: Date | null;
  title: string;
  description: string;
}

@Injectable()
export class ActionOrchestrationService {
  private readonly logger = new Logger(ActionOrchestrationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Syncs and generates daily priority actions for the user based on actual state.
   */
  async getPrioritizedActions(userId: string): Promise<CareerActionItem[]> {
    this.logger.log(`Syncing daily actions for user: ${userId}`);
    // 1. Fetch user preferences
    let prefs = await this.prisma.careerCenterPreference.findUnique({
      where: { userId },
    });
    if (!prefs) {
      prefs = await this.prisma.careerCenterPreference.create({
        data: { userId },
      });
    }

    // Clean up stale or expired actions
    await this.cleanupStaleActions(userId);

    // Generate action candidates
    const candidates = await this.generateActionCandidates(userId);

    // Sync candidates with DB CareerAction table
    await this.syncActionsWithDatabase(userId, candidates);

    // Fetch active non-snoozed, non-expired actions
    const now = new Date();
    const dbActions = await this.prisma.careerAction.findMany({
      where: {
        userId,
        status: 'PENDING',
        OR: [{ snoozedUntil: null }, { snoozedUntil: { lte: now } }],
        OR_EXPIRES: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      } as any, // Using standard prisma typing below
    });

    // Format and prioritize actions based on preferences and career mode
    const formattedActions = dbActions.map((action) => {
      const details = this.getActionDetails(action);
      return {
        id: action.id,
        actionType: action.actionType,
        entityType: action.entityType,
        entityId: action.entityId,
        priority: action.priority,
        status: action.status,
        title: details.title,
        description: details.description,
        expiresAt: action.expiresAt,
      };
    });

    // Prioritize
    const priorityWeight: Record<string, number> = { URGENT: 100, HIGH: 50, MEDIUM: 20, LOW: 5 };

    const sortedActions = formattedActions.sort((a, b) => {
      let weightA = priorityWeight[a.priority] || 0;
      let weightB = priorityWeight[b.priority] || 0;

      // Career mode priority boost
      if (prefs.careerMode === 'INTERVIEW_PREPARATION') {
        if (a.actionType === 'INTERVIEW_PREP' || a.actionType === 'MOCK_INTERVIEW_PRACTICE')
          weightA += 30;
        if (b.actionType === 'INTERVIEW_PREP' || b.actionType === 'MOCK_INTERVIEW_PRACTICE')
          weightB += 30;
      } else if (prefs.careerMode === 'SKILL_BUILDING') {
        if (a.actionType === 'LEARNING_TASK') weightA += 30;
        if (b.actionType === 'LEARNING_TASK') weightB += 30;
      } else if (prefs.careerMode === 'APPLICATION_FOCUS') {
        if (a.actionType === 'ASSESSMENT_PENDING' || a.actionType === 'RESUME_UPDATE')
          weightA += 30;
        if (b.actionType === 'ASSESSMENT_PENDING' || b.actionType === 'RESUME_UPDATE')
          weightB += 30;
      } else if (prefs.careerMode === 'INTERNSHIP_SEARCH') {
        if (a.actionType === 'REVIEW_JOB') weightA += 30;
        if (b.actionType === 'REVIEW_JOB') weightB += 30;
      }

      return weightB - weightA;
    });

    // Limit actions (default max 5 or budget-based)
    const actionLimit = Math.min(5, Math.ceil(prefs.dailyTimeBudget / 10)); // e.g. 30 min -> max 3, but cap at 5
    return sortedActions.slice(0, Math.max(3, actionLimit));
  }

  async completeAction(actionId: string, userId: string): Promise<any> {
    const action = await this.prisma.careerAction.findFirst({
      where: { id: actionId, userId },
    });
    if (!action) throw new NotFoundException('Action not found');

    return this.prisma.careerAction.update({
      where: { id: actionId },
      data: { status: 'COMPLETED' },
    });
  }

  async dismissAction(actionId: string, userId: string): Promise<any> {
    const action = await this.prisma.careerAction.findFirst({
      where: { id: actionId, userId },
    });
    if (!action) throw new NotFoundException('Action not found');

    return this.prisma.careerAction.update({
      where: { id: actionId },
      data: { status: 'DISMISSED' },
    });
  }

  async snoozeAction(actionId: string, userId: string, hours = 24): Promise<any> {
    const action = await this.prisma.careerAction.findFirst({
      where: { id: actionId, userId },
    });
    if (!action) throw new NotFoundException('Action not found');

    const snoozedUntil = new Date();
    snoozedUntil.setHours(snoozedUntil.getHours() + hours);

    return this.prisma.careerAction.update({
      where: { id: actionId },
      data: { status: 'SNOOZED', snoozedUntil },
    });
  }

  /**
   * Helper to clean up stale actions in the database.
   */
  private async cleanupStaleActions(userId: string): Promise<void> {
    const now = new Date();
    // 1. Mark expired actions
    await this.prisma.careerAction.updateMany({
      where: {
        userId,
        status: 'PENDING',
        expiresAt: { lte: now },
      },
      data: { status: 'EXPIRED' },
    });

    // 2. Remove stale interview prep actions if the interview scheduledStart has passed
    const pastInterviews = await this.prisma.hiringInterview.findMany({
      where: { candidateId: userId, scheduledStart: { lte: now } },
      select: { id: true },
    });
    if (pastInterviews && pastInterviews.length > 0) {
      const interviewIds = pastInterviews.map((i) => i.id);
      await this.prisma.careerAction.updateMany({
        where: {
          userId,
          actionType: 'INTERVIEW_PREP',
          entityType: 'HiringInterview',
          entityId: { in: interviewIds },
          status: 'PENDING',
        },
        data: { status: 'EXPIRED' },
      });
    }
  }

  /**
   * Generates logical action candidates based on the user's live system state.
   */
  private async generateActionCandidates(userId: string): Promise<ActionCandidate[]> {
    const candidates: ActionCandidate[] = [];
    const now = new Date();

    // Fetch user details
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        resume: true,
        candidateHiringInterviews: {
          where: {
            scheduledStart: { gt: now },
            status: { in: [HiringInterviewStatus.SCHEDULED, HiringInterviewStatus.CONFIRMED] },
          },
          include: { job: { include: { company: true } } },
        },
        candidateAssessmentAssignments: {
          where: { status: { in: ['ASSIGNED', 'STARTED', 'IN_PROGRESS'] } },
          include: { assessment: true },
        },
        mockInterviews: true,
        learningEnrollments: {
          where: { status: 'IN_PROGRESS' },
          include: { module: { include: { skill: true } } },
        },
        recommendations: {
          where: { isDismissed: false },
          include: { job: { include: { company: true } } },
          orderBy: { rank: 'asc' },
          take: 5,
        },
      },
    });

    if (!user) return [];

    // 1. Recruiter Interviews Prep actions
    user.candidateHiringInterviews.forEach((interview) => {
      const timeDiffMs = interview.scheduledStart.getTime() - now.getTime();
      const hoursDiff = timeDiffMs / (1000 * 60 * 60);

      let priority = 'MEDIUM';
      if (hoursDiff <= 24) {
        priority = 'URGENT';
      } else if (hoursDiff <= 72) {
        priority = 'HIGH';
      }

      candidates.push({
        actionType: 'INTERVIEW_PREP',
        entityType: 'HiringInterview',
        entityId: interview.id,
        priority,
        expiresAt: interview.scheduledEnd,
        // Used temporarily for details mapper
        title: `Prepare for interview: ${interview.title} with ${interview.job?.company.name || 'Recruiter'}`,
        description: `Scheduled at ${interview.scheduledStart.toLocaleString()}. Review preparation tasks and questions.`,
      });

      // 2. Add Mock Interview practice recommendation if they haven't prepared yet for this role
      const hasMock = user.mockInterviews.some((m) => m.jobId === interview.jobId);
      if (!hasMock && interview.jobId) {
        candidates.push({
          actionType: 'MOCK_INTERVIEW_PRACTICE',
          entityType: 'JobPosting',
          entityId: interview.jobId,
          priority: 'HIGH',
          expiresAt: interview.scheduledStart,
          title: `Practice mock interview for ${interview.job?.title || 'target role'}`,
          description: `Run an AI-simulated practice interview before your real meeting with ${interview.job?.company.name || 'recruiter'}.`,
        });
      }
    });

    // 3. Pending Assessments
    user.candidateAssessmentAssignments.forEach((assign) => {
      const deadline = assign.assessment.deadline;
      let priority = 'MEDIUM';
      let expiresAt = deadline;

      if (deadline) {
        const hoursDiff = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
        if (hoursDiff <= 24) {
          priority = 'URGENT';
        } else if (hoursDiff <= 72) {
          priority = 'HIGH';
        }
      } else {
        // Fallback expires in 7 days
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
      }

      candidates.push({
        actionType: 'ASSESSMENT_PENDING',
        entityType: 'AssessmentAssignment',
        entityId: assign.id,
        priority,
        expiresAt,
        title: `Finish assessment: ${assign.assessment.title}`,
        description: `${deadline ? `Deadline: ${deadline.toLocaleDateString()}. ` : ''}Complete your pending evaluation code/MCQ test.`,
      });
    });

    // 4. Fresh Opportunities Matches (if matchScore > 80 and not viewed yet)
    for (const rec of user.recommendations) {
      const scoreObj = await this.prisma.matchScore.findUnique({
        where: { userId_jobId: { userId, jobId: rec.jobId } },
      });
      if (scoreObj && scoreObj.overallScore >= 80 && !rec.isViewed) {
        candidates.push({
          actionType: 'REVIEW_JOB',
          entityType: 'JobPosting',
          entityId: rec.jobId,
          priority: 'MEDIUM',
          expiresAt: rec.job.deadline,
          title: `Review high-matching job: ${rec.job.title} at ${rec.job.company.name}`,
          description: `You have a ${scoreObj.overallScore}% match score! Review details and apply.`,
        });
      }
    }

    // 5. Resume Update Check (if saved or applied to jobs but no resume upload/old)
    if (!user.resume?.fileUrl) {
      candidates.push({
        actionType: 'RESUME_UPDATE',
        entityType: 'User',
        entityId: userId,
        priority: 'HIGH',
        expiresAt: null,
        title: 'Upload your career resume',
        description:
          'Complete your profile by uploading a PDF resume to generate targeted applications and roadmap skills.',
      });
    }

    // 6. Learning progress
    user.learningEnrollments.forEach((enroll) => {
      candidates.push({
        actionType: 'LEARNING_TASK',
        entityType: 'LearningModule',
        entityId: enroll.moduleId,
        priority: 'MEDIUM',
        expiresAt: null,
        title: `Continue learning: ${enroll.module.title}`,
        description: `Progress: ${Math.round(enroll.progress * 100)}%. Keep up your learning roadmap streak.`,
      });
    });

    return candidates;
  }

  /**
   * Upserts or ignores action records based on user's persistent action catalog to avoid duplicates.
   */
  private async syncActionsWithDatabase(
    userId: string,
    candidates: ActionCandidate[],
  ): Promise<void> {
    for (const c of candidates) {
      const existing = await this.prisma.careerAction.findFirst({
        where: {
          userId,
          actionType: c.actionType,
          entityType: c.entityType,
          entityId: c.entityId || null,
        },
      });

      if (existing) {
        // If it was already completed/skipped/dismissed, we respect it and do not modify.
        // If it is pending, we update its priority / expiresAt dynamically.
        if (existing.status === 'PENDING') {
          await this.prisma.careerAction.update({
            where: { id: existing.id },
            data: {
              priority: c.priority,
              expiresAt: c.expiresAt,
            },
          });
        }
      } else {
        // Create new pending action
        await this.prisma.careerAction.create({
          data: {
            userId,
            actionType: c.actionType,
            entityType: c.entityType,
            entityId: c.entityId || null,
            priority: c.priority,
            expiresAt: c.expiresAt,
            status: 'PENDING',
          },
        });
      }
    }
  }

  /**
   * Helper to retrieve localized descriptions for dynamically sync'd database records.
   */
  private getActionDetails(action: any): { title: string; description: string } {
    // Generate text descriptions based on action categories (fallbacks if not parsed live)
    switch (action.actionType) {
      case 'INTERVIEW_PREP':
        return {
          title: 'Prepare for scheduled interview',
          description:
            'An interview is approaching. Review candidate instructions and simulation practice.',
        };
      case 'MOCK_INTERVIEW_PRACTICE':
        return {
          title: 'Practice simulated interview',
          description: 'Run an AI-simulated practice assessment to improve your score.',
        };
      case 'ASSESSMENT_PENDING':
        return {
          title: 'Complete assigned recruiter test',
          description: 'You have a pending assessment assignment requiring action.',
        };
      case 'REVIEW_JOB':
        return {
          title: 'Review new matched internship',
          description: 'A high-matching opportunity matching your skills is available.',
        };
      case 'RESUME_UPDATE':
        return {
          title: 'Upload/optimize resume document',
          description: 'Provide an updated resume to trigger career placement opportunities.',
        };
      case 'LEARNING_TASK':
        return {
          title: 'Continue your active roadmap module',
          description: 'Progress in your technical learning steps to bridge your skill gaps.',
        };
      default:
        return {
          title: 'Review career recommendation',
          description: 'Take action on your pending career intelligence recommendations.',
        };
    }
  }
}
