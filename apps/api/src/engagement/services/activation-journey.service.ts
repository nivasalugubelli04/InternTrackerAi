import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { ActivationProgressData, NextBestStep } from '../interfaces/engagement.interfaces';

@Injectable()
export class ActivationJourneyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Evaluates user activation progress, time-to-value, and computes the Next Best Step.
   */
  async getActivationProgress(userId: string): Promise<ActivationProgressData> {
    const [
      user,
      profile,
      skillsCount,
      goalsCount,
      savedJobsCount,
      applicationsCount,
      executionTasksCount,
    ] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { createdAt: true },
      }),
      this.prisma.profile.findUnique({ where: { userId } }),
      this.prisma.userSkill.count({ where: { userId } }),
      this.prisma.careerGoal.count({ where: { userId } }),
      this.prisma.savedJob.count({ where: { userId } }),
      this.prisma.application.count({ where: { userId } }),
      this.prisma.executionPlan.count({ where: { userId } }),
    ]);

    const completedMilestones: string[] = [];
    let score = 0.0;

    if (profile?.onboardingCompletedAt || profile?.headline) {
      completedMilestones.push('PROFILE_COMPLETED');
      score += 0.25;
    }
    if (goalsCount > 0) {
      completedMilestones.push('CAREER_GOAL_SET');
      score += 0.25;
    }
    if (skillsCount >= 3) {
      completedMilestones.push('CORE_SKILLS_ADDED');
      score += 0.25;
    } else if (skillsCount > 0) {
      score += 0.15;
    }
    if (savedJobsCount > 0 || applicationsCount > 0 || executionTasksCount > 0) {
      completedMilestones.push('FIRST_ACTION_TAKEN');
      score += 0.25;
    }

    const isActivated = score >= 0.75;

    // Time-to-value calculation
    let timeToValueSec: number | null = null;
    if (user?.createdAt && (savedJobsCount > 0 || applicationsCount > 0)) {
      const firstActionDate = new Date(); // approximate or retrieved from earliest saved job / application
      timeToValueSec = Math.max(
        60,
        Math.round((firstActionDate.getTime() - new Date(user.createdAt).getTime()) / 1000),
      );
    }

    // Determine the Next Best Step (Prioritized, non-overwhelming)
    const nextBestStep = this.determineNextBestStep({
      profile,
      skillsCount,
      goalsCount,
      savedJobsCount,
      applicationsCount,
      executionTasksCount,
    });

    // Update or initialize UserEngagementState
    await this.prisma.userEngagementState.upsert({
      where: { userId },
      create: {
        userId,
        activationProgress: Math.min(1.0, score),
        timeToValueSec,
        segment: isActivated ? 'ACTIVATED_USER' : 'NEW_USER',
        lastMeaningfulActionAt: isActivated ? new Date() : null,
      },
      update: {
        activationProgress: Math.min(1.0, score),
        ...(timeToValueSec !== null ? { timeToValueSec } : {}),
        ...(isActivated ? { segment: 'ACTIVATED_USER' } : {}),
        ...(isActivated ? { lastMeaningfulActionAt: new Date() } : {}),
      },
    });

    return {
      isActivated,
      activationScore: Math.round(score * 100) / 100,
      timeToValueSec,
      completedMilestones,
      nextBestStep,
    };
  }

  /**
   * Deterministically calculates the single highest-leverage next step for unactivated or early users.
   */
  private determineNextBestStep(context: {
    profile: any;
    skillsCount: number;
    goalsCount: number;
    savedJobsCount: number;
    applicationsCount: number;
    executionTasksCount: number;
  }): NextBestStep | null {
    if (!context.profile?.headline && !context.profile?.onboardingCompletedAt) {
      return {
        stepKey: 'COMPLETE_PROFILE',
        title: 'Complete Your Career Profile',
        description:
          'Add your target role, university, and graduation year so AI can match opportunities.',
        actionLabel: 'Complete Profile',
        targetRoute: '/profile/edit',
        estimatedMinutes: 2,
        priority: 'HIGH',
        impactExplanation: 'Improves internship match precision by over 40%.',
      };
    }

    if (context.goalsCount === 0) {
      return {
        stepKey: 'SET_CAREER_GOAL',
        title: 'Define Your Target Career Goal',
        description:
          'Set your primary target internship role (e.g. Software Engineer, Product Manager, AI Engineer).',
        actionLabel: 'Set Career Goal',
        targetRoute: '/career-strategy',
        estimatedMinutes: 1,
        priority: 'HIGH',
        impactExplanation: 'Unlocks tailored career roadmaps and competitive readiness scoring.',
      };
    }

    if (context.skillsCount < 3) {
      return {
        stepKey: 'ADD_CORE_SKILLS',
        title: 'Add Top 3 Technical Skills',
        description:
          'List your core skills (e.g. Python, TypeScript, SQL, React) to benchmark against market demands.',
        actionLabel: 'Add Skills',
        targetRoute: '/skills',
        estimatedMinutes: 2,
        priority: 'MEDIUM',
        impactExplanation:
          'Enables real-time skill gap analysis on high-paying internship postings.',
      };
    }

    if (context.savedJobsCount === 0 && context.applicationsCount === 0) {
      return {
        stepKey: 'EXPLORE_FIRST_OPPORTUNITY',
        title: 'Explore & Save a High-Match Internship',
        description: 'Discover verified opportunities scored specifically for your trajectory.',
        actionLabel: 'Discover Opportunities',
        targetRoute: '/opportunities',
        estimatedMinutes: 3,
        priority: 'HIGH',
        impactExplanation: 'Allows the AI Copilot to prepare tailored application materials.',
      };
    }

    if (context.executionTasksCount === 0) {
      return {
        stepKey: 'START_DAILY_EXECUTION',
        title: 'Generate Your Weekly Career Sprint',
        description:
          'Convert your career target into focused, 30-minute daily execution milestones.',
        actionLabel: 'Generate Sprint',
        targetRoute: '/execution',
        estimatedMinutes: 2,
        priority: 'MEDIUM',
        impactExplanation: 'Keeps your internship preparation structured and on track.',
      };
    }

    return null;
  }
}
