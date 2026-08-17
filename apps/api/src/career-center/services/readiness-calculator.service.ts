import { Injectable } from '@nestjs/common';
import { ApplicationStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

export type ReadinessState = 'READY' | 'DEVELOPING' | 'NEEDS ATTENTION' | 'INSUFFICIENT DATA';

export interface CareerReadinessResult {
  profile: ReadinessState;
  resume: ReadinessState;
  skills: ReadinessState;
  applications: ReadinessState;
  interviews: ReadinessState;
  learning: ReadinessState;
  methodology: Record<string, string>;
}

@Injectable()
export class ReadinessCalculatorService {
  constructor(private readonly prisma: PrismaService) {}

  async calculateReadiness(userId: string): Promise<CareerReadinessResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        resume: true,
        userSkills: { include: { skill: true } },
        careerGoals: { take: 1, orderBy: { updatedAt: 'desc' } },
        careerPreference: true,
        applications: true,
        mockInterviews: { where: { status: 'COMPLETED' } },
        candidateHiringInterviews: { where: { status: 'SCHEDULED' } },
        learningGoals: true,
        learningEnrollments: { include: { module: true } },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // 1. Profile Readiness
    let profileState: ReadinessState = 'INSUFFICIENT DATA';
    const profile = user.profile;
    if (profile) {
      const fields = [
        profile.phone,
        profile.bio,
        profile.headline,
        profile.college,
        profile.degree,
        profile.cgpa,
        profile.graduationYear,
        profile.linkedinUrl,
        profile.githubUrl,
      ];
      const filledCount = fields.filter((f) => f !== null && f !== undefined && f !== '').length;
      if (filledCount >= 7) {
        profileState = 'READY';
      } else if (filledCount >= 3) {
        profileState = 'DEVELOPING';
      } else {
        profileState = 'NEEDS ATTENTION';
      }
    } else {
      profileState = 'NEEDS ATTENTION';
    }

    // 2. Resume Readiness
    let resumeState: ReadinessState = 'NEEDS ATTENTION';
    if (user.resume) {
      if (user.resume.fileUrl) {
        resumeState = 'READY';
      } else {
        resumeState = 'DEVELOPING';
      }
    }

    // 3. Skill Readiness (Target role skill coverage)
    let skillsState: ReadinessState = 'INSUFFICIENT DATA';
    const primaryGoal = user.careerGoals[0];
    const targetRole = primaryGoal?.targetRole || user.careerPreference?.preferredRoles?.[0];

    if (targetRole) {
      // Find role skills
      const role = await this.prisma.role.findFirst({
        where: { name: { equals: targetRole, mode: 'insensitive' } },
        include: { roleSkills: { include: { skill: true } } },
      });

      if (role && role.roleSkills.length > 0) {
        const requiredSkills = role.roleSkills.map((rs) => rs.skill.id);
        const userSkillIds = user.userSkills.map((us) => us.skillId);
        const matchingSkills = requiredSkills.filter((id) => userSkillIds.includes(id));
        const coverage = matchingSkills.length / requiredSkills.length;

        if (coverage >= 0.7) {
          skillsState = 'READY';
        } else if (coverage >= 0.3) {
          skillsState = 'DEVELOPING';
        } else {
          skillsState = 'NEEDS ATTENTION';
        }
      } else {
        // Fallback check based on overall skill catalog count
        const skillCount = user.userSkills.length;
        if (skillCount >= 5) {
          skillsState = 'READY';
        } else if (skillCount >= 2) {
          skillsState = 'DEVELOPING';
        } else {
          skillsState = 'NEEDS ATTENTION';
        }
      }
    } else {
      // No target role specified
      if (user.userSkills.length >= 5) {
        skillsState = 'READY';
      } else if (user.userSkills.length > 0) {
        skillsState = 'DEVELOPING';
      } else {
        skillsState = 'NEEDS ATTENTION';
      }
    }

    // 4. Application Readiness
    let appState: ReadinessState = 'NEEDS ATTENTION';
    if (user.applications.length > 0) {
      const activeApps = user.applications.filter((app) =>
        [
          ApplicationStatus.APPLIED,
          ApplicationStatus.ASSESSMENT,
          ApplicationStatus.INTERVIEW,
          ApplicationStatus.OFFER,
        ].includes(app.status as any),
      );
      if (activeApps.length > 0) {
        appState = 'READY';
      } else {
        appState = 'DEVELOPING';
      }
    }

    // 5. Interview Readiness
    let interviewState: ReadinessState = 'INSUFFICIENT DATA';
    const completedMocks = user.mockInterviews;
    const upcomingRecruiter = user.candidateHiringInterviews;

    if (completedMocks.length > 0) {
      const totalScore = completedMocks.reduce((sum, m) => sum + (m.score ?? 0), 0);
      const avgScore = totalScore / completedMocks.length;

      if (avgScore >= 80) {
        interviewState = 'READY';
      } else if (avgScore >= 60) {
        interviewState = 'DEVELOPING';
      } else {
        interviewState = 'NEEDS ATTENTION';
      }
    } else if (upcomingRecruiter.length > 0) {
      interviewState = 'NEEDS ATTENTION'; // Has upcoming interviews but no mock prep!
    }

    // 6. Learning Readiness
    let learningState: ReadinessState = 'INSUFFICIENT DATA';
    const goals = user.learningGoals;
    const enrollments = user.learningEnrollments;

    if (goals.length > 0 || enrollments.length > 0) {
      const activeGoal = goals.find((g) => g.status === 'ACTIVE');
      const completedModules = enrollments.filter((e) => e.status === 'COMPLETED');
      const inProgressModules = enrollments.filter((e) => e.status === 'IN_PROGRESS');

      if (completedModules.length > 0 && activeGoal) {
        learningState = 'READY';
      } else if (inProgressModules.length > 0 || activeGoal) {
        learningState = 'DEVELOPING';
      } else {
        learningState = 'NEEDS ATTENTION';
      }
    }

    return {
      profile: profileState,
      resume: resumeState,
      skills: skillsState,
      applications: appState,
      interviews: interviewState,
      learning: learningState,
      methodology: {
        profile:
          'READY if onboarding completed and 7+ profile fields filled. DEVELOPING if 3-6 fields. NEEDS ATTENTION if <3 fields.',
        resume:
          'READY if resume document with storage URL uploaded. DEVELOPING if metadata exists but empty storage URL. NEEDS ATTENTION if missing.',
        skills:
          'READY if target role skill coverage >= 70% or user has 5+ skills. DEVELOPING if coverage >= 30% or user has 2+ skills. NEEDS ATTENTION otherwise.',
        applications:
          'READY if user has applications currently in APPLIED, ASSESSMENT, INTERVIEW, or OFFER stages. DEVELOPING if only saved/discovered. NEEDS ATTENTION if no applications tracked.',
        interviews:
          'READY if average mock interview score >= 80%. DEVELOPING if score is 60%-79%. NEEDS ATTENTION if upcoming scheduled interviews exist without completed mock practice, or score < 60%.',
        learning:
          'READY if user has an active learning goal and completed at least 1 module. DEVELOPING if goal is active or enrollments in-progress. NEEDS ATTENTION if goals exist but paused or overdue.',
      },
    };
  }
}
