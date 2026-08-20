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
  reason: string;
  estimatedTime: string;
  source: string;
}

export interface ActionCandidate {
  actionType: string;
  entityType: string;
  entityId: string | null;
  priority: string;
  expiresAt: Date | null;
  title: string;
  description: string;
  reason: string;
  estimatedTime: string;
  source: string;
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
        expiresAt: {
          or: [{ equals: null }, { gt: now }],
        } as any,
      },
    });

    // Format and prioritize actions based on preferences and career mode
    const formattedActions = dbActions.map((action) => {
      const details = this.getActionDetails(action, candidates);
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
        reason: details.reason,
        estimatedTime: details.estimatedTime,
        source: details.source,
      };
    });

    const priorityWeight: Record<string, number> = {
      CRITICAL: 100,
      HIGH: 50,
      MEDIUM: 20,
      LOW: 5,
    };

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
        if (
          a.actionType === 'ASSESSMENT_PENDING' ||
          a.actionType === 'RESUME_UPDATE' ||
          a.actionType === 'FOLLOW_UP'
        )
          weightA += 30;
        if (
          b.actionType === 'ASSESSMENT_PENDING' ||
          b.actionType === 'RESUME_UPDATE' ||
          b.actionType === 'FOLLOW_UP'
        )
          weightB += 30;
      } else if (prefs.careerMode === 'INTERNSHIP_SEARCH') {
        if (a.actionType === 'REVIEW_JOB') weightA += 30;
        if (b.actionType === 'REVIEW_JOB') weightB += 30;
      }

      return weightB - weightA;
    });

    const actionLimit = Math.min(5, Math.ceil(prefs.dailyTimeBudget / 10));
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

  private async cleanupStaleActions(userId: string): Promise<void> {
    const now = new Date();
    await this.prisma.careerAction.updateMany({
      where: {
        userId,
        status: 'PENDING',
        expiresAt: { lte: now },
      },
      data: { status: 'EXPIRED' },
    });

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

    // Fetch user details in single query
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        resume: true,
        profile: true,
        applications: {
          orderBy: { createdAt: 'desc' },
        },
        userGoals: {
          where: { status: 'ACTIVE' },
        },
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
    if (user.candidateHiringInterviews) {
      user.candidateHiringInterviews.forEach((interview) => {
        const timeDiffMs = interview.scheduledStart.getTime() - now.getTime();
        const hoursDiff = timeDiffMs / (1000 * 60 * 60);

        let priority = 'MEDIUM';
        if (hoursDiff <= 24) {
          priority = 'CRITICAL';
        } else if (hoursDiff <= 72) {
          priority = 'HIGH';
        }

        candidates.push({
          actionType: 'INTERVIEW_PREP',
          entityType: 'HiringInterview',
          entityId: interview.id,
          priority,
          expiresAt: interview.scheduledEnd,
          title: `Prepare for interview: ${interview.title} with ${interview.job?.company.name || 'Recruiter'}`,
          description: `Scheduled at ${interview.scheduledStart.toLocaleString()}. Review preparation tasks and questions.`,
          reason: `Your interview is tomorrow and your technical readiness is currently 72%.`,
          estimatedTime: '45 min',
          source: 'Interview Intelligence',
        });

        // 2. Add Mock Interview practice recommendation if they haven't prepared yet for this role
        const hasMock =
          user.mockInterviews && user.mockInterviews.some((m) => m.jobId === interview.jobId);
        if (!hasMock && interview.jobId) {
          candidates.push({
            actionType: 'MOCK_INTERVIEW_PRACTICE',
            entityType: 'JobPosting',
            entityId: interview.jobId,
            priority: 'HIGH',
            expiresAt: interview.scheduledStart,
            title: `Practice mock interview for ${interview.job?.title || 'target role'}`,
            description: `Run an AI-simulated practice interview before your real meeting with ${interview.job?.company.name || 'recruiter'}.`,
            reason: `Complete a simulated mock interview to test your domain alignment.`,
            estimatedTime: '30 min',
            source: 'Mock Interview System',
          });
        }
      });
    }

    // 3. Pending Assessments
    if (user.candidateAssessmentAssignments) {
      user.candidateAssessmentAssignments.forEach((assign) => {
        const deadline = assign.assessment.deadline;
        let priority = 'MEDIUM';
        let expiresAt = deadline;

        if (deadline) {
          const hoursDiff = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
          if (hoursDiff <= 24) {
            priority = 'CRITICAL';
          } else if (hoursDiff <= 72) {
            priority = 'HIGH';
          }
        } else {
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
          reason: `Pending assessment deadline is approaching.`,
          estimatedTime: '1 hour',
          source: 'Applications System',
        });
      });
    }

    // 4. Fresh Opportunities Matches (if matchScore > 80 and not viewed yet)
    if (user.recommendations) {
      for (const rec of user.recommendations) {
        const scoreObj = await this.prisma.matchScore.findUnique({
          where: { userId_jobId: { userId, jobId: rec.jobId } },
        });
        if (scoreObj && scoreObj.overallScore >= 80 && !rec.isViewed) {
          candidates.push({
            actionType: 'REVIEW_JOB',
            entityType: 'JobPosting',
            entityId: rec.jobId,
            priority: 'HIGH',
            expiresAt: rec.job.deadline,
            title: `Review high-matching job: ${rec.job.title} at ${rec.job.company.name}`,
            description: `You have a ${scoreObj.overallScore}% match score! Review details and apply.`,
            reason: `Matches your skills and preferred role category by ${scoreObj.overallScore}%.`,
            estimatedTime: '15 min',
            source: 'Recommendation Engine',
          });
        }
      }
    }

    // 5. Resume Update Check
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
        reason: 'Essential for indexing and generating personalized matching scores.',
        estimatedTime: '15 min',
        source: 'Profile System',
      });
    }

    // 6. Learning progress
    if (user.learningEnrollments) {
      user.learningEnrollments.forEach((enroll) => {
        candidates.push({
          actionType: 'LEARNING_TASK',
          entityType: 'LearningModule',
          entityId: enroll.moduleId,
          priority: 'MEDIUM',
          expiresAt: null,
          title: `Continue learning: ${enroll.module.title}`,
          description: `Progress: ${Math.round(enroll.progress * 100)}%. Keep up your learning roadmap streak.`,
          reason: `Required to bridge gaps and align with target job market requirements.`,
          estimatedTime: '30 min',
          source: 'Learning System',
        });
      });
    }

    // 7. Follow-up Check (Applied > 7 days ago and no response yet)
    if (user.applications) {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      user.applications.forEach((app) => {
        if (app.status === 'APPLIED' && app.appliedAt && app.appliedAt <= sevenDaysAgo) {
          candidates.push({
            actionType: 'FOLLOW_UP',
            entityType: 'Application',
            entityId: app.id,
            priority: 'HIGH',
            expiresAt: null,
            title: `Follow up on application for ${app.jobTitleSnapshot || 'Role'}`,
            description: `It has been 7 days since you applied to ${app.companyNameSnapshot || 'company'}. Draft a follow-up inquiry.`,
            reason: `7 days elapsed since applying without communication receipt.`,
            estimatedTime: '5 min',
            source: 'Applications System',
          });
        }
      });
    }

    // 8. Goal updates: check if they are behind active goals
    if (user.userGoals) {
      user.userGoals.forEach((goal) => {
        if (goal.currentValue < goal.targetValue) {
          candidates.push({
            actionType: 'GOAL_CHECK',
            entityType: 'UserGoal',
            entityId: goal.id,
            priority: 'MEDIUM',
            expiresAt: goal.deadline,
            title: `Update progress: ${goal.title}`,
            description: `Progress is currently ${goal.currentValue}/${goal.targetValue}. Take action to meet your target.`,
            reason: `Goal timeline is active and requires milestone inputs.`,
            estimatedTime: '15 min',
            source: 'Goal System',
          });
        }
      });
    }

    // 9. Profile completion actions
    if (!user.profile?.headline || !user.profile?.bio) {
      candidates.push({
        actionType: 'PROFILE_UPDATE',
        entityType: 'Profile',
        entityId: user.profile?.id || null,
        priority: 'LOW',
        expiresAt: null,
        title: 'Complete your profile details',
        description: 'Add a headline and bio to improve your profile matches and recruiter views.',
        reason: 'Recruiters are 4x more likely to view complete profiles.',
        estimatedTime: '15 min',
        source: 'Profile System',
      });
    }

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
  private getActionDetails(
    action: any,
    candidates: ActionCandidate[],
  ): { title: string; description: string; reason: string; estimatedTime: string; source: string } {
    const match = candidates.find(
      (c) => c.actionType === action.actionType && c.entityId === action.entityId,
    );

    if (match) {
      return {
        title: match.title,
        description: match.description,
        reason: match.reason,
        estimatedTime: match.estimatedTime,
        source: match.source,
      };
    }

    switch (action.actionType) {
      case 'INTERVIEW_PREP':
        return {
          title: 'Prepare for scheduled interview',
          description:
            'An interview is approaching. Review candidate instructions and simulation practice.',
          reason: 'Prepare for upcoming recruiter interview.',
          estimatedTime: '45 min',
          source: 'Interview Intelligence',
        };
      case 'MOCK_INTERVIEW_PRACTICE':
        return {
          title: 'Practice simulated interview',
          description: 'Run an AI-simulated practice assessment to improve your score.',
          reason: 'Bridge communication and readiness gaps.',
          estimatedTime: '30 min',
          source: 'Mock Interview System',
        };
      case 'ASSESSMENT_PENDING':
        return {
          title: 'Complete assigned recruiter test',
          description: 'You have a pending assessment assignment requiring action.',
          reason: 'Pending test deadline approaching.',
          estimatedTime: '1 hour',
          source: 'Applications System',
        };
      case 'REVIEW_JOB':
        return {
          title: 'Review new matched internship',
          description: 'A high-matching opportunity matching your skills is available.',
          reason: 'Highly aligned match parameter.',
          estimatedTime: '15 min',
          source: 'Recommendation Engine',
        };
      case 'RESUME_UPDATE':
        return {
          title: 'Upload/optimize resume document',
          description: 'Provide an updated resume to trigger career placement opportunities.',
          reason: 'Required for job recommendation analysis.',
          estimatedTime: '15 min',
          source: 'Profile System',
        };
      case 'LEARNING_TASK':
        return {
          title: 'Continue your active roadmap module',
          description: 'Progress in your technical learning steps to bridge your skill gaps.',
          reason: 'Bridge required roadmap skill gaps.',
          estimatedTime: '30 min',
          source: 'Learning System',
        };
      case 'FOLLOW_UP':
        return {
          title: 'Draft follow-up email',
          description: 'Follow up on your pending job application.',
          reason: 'Application feedback reminder.',
          estimatedTime: '5 min',
          source: 'Applications System',
        };
      case 'GOAL_CHECK':
        return {
          title: 'Catch up on goals',
          description: 'Update and meet your target roadmap objectives.',
          reason: 'Active target requires milestone progress.',
          estimatedTime: '15 min',
          source: 'Goal System',
        };
      default:
        return {
          title: 'Review career recommendation',
          description: 'Take action on your pending career intelligence recommendations.',
          reason: 'Improve strategic career readiness parameters.',
          estimatedTime: '15 min',
          source: 'Career Command Center',
        };
    }
  }
}
