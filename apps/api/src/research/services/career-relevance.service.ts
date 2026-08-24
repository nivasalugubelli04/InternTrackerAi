import { Injectable, Logger } from '@nestjs/common';

import {
  OpportunityReadinessLevel,
  RelevanceScoreBreakdown,
} from '../interfaces/research.interfaces';

export interface UserRelevanceProfile {
  userId: string;
  targetRole: string | null;
  careerGoals: string[];
  skills: Array<{ name: string; category?: string; proficiency?: string }>;
  projects: Array<{ title: string; isDeployed?: boolean; techStack?: string[] }>;
  preferredLocations?: string[] | undefined;
  preferredWorkModes?: string[] | undefined;
}

@Injectable()
export class CareerRelevanceService {
  private readonly logger = new Logger(CareerRelevanceService.name);

  /**
   * Evaluates an opportunity against the user's career state to compute grounded relevance scores & explainability.
   */
  evaluateRelevance(
    userProfile: UserRelevanceProfile,
    opportunity: {
      title: string;
      description: string;
      requirements?: string[];
      skills?: string[];
      location?: string | null;
      workMode?: string | null;
    },
  ): RelevanceScoreBreakdown {
    this.logger.log(`Evaluating relevance for ${opportunity.title}`);
    const oppText =
      `${opportunity.title} ${opportunity.description} ${(opportunity.requirements || []).join(' ')}`.toLowerCase();
    const oppSkills = (opportunity.skills || []).map((s) => s.toLowerCase());

    const matchingStrengths: string[] = [];
    const criticalGaps: string[] = [];
    const relevantProjects: string[] = [];
    const recommendedPreparation: string[] = [];

    // 1. Role Alignment (0 - 100)
    let roleAlignmentScore = 50;
    const targetRoleLower = (userProfile.targetRole || '').toLowerCase();
    if (targetRoleLower && oppText.includes(targetRoleLower)) {
      roleAlignmentScore = 95;
      matchingStrengths.push(
        `Directly targets your primary career objective (${userProfile.targetRole}).`,
      );
    } else if (
      targetRoleLower &&
      targetRoleLower.split(' ').some((word) => word.length > 2 && oppText.includes(word))
    ) {
      roleAlignmentScore = 75;
      matchingStrengths.push(`Strong keyword alignment with your target role.`);
    } else {
      roleAlignmentScore = 40;
    }

    // 2. Skill Overlap (0 - 100)
    const userSkillNames = userProfile.skills.map((s) => s.name.toLowerCase());
    const matchedSkills = userProfile.skills.filter(
      (s) => oppText.includes(s.name.toLowerCase()) || oppSkills.includes(s.name.toLowerCase()),
    );

    const skillOverlapScore =
      userSkillNames.length > 0
        ? Math.min(
            95,
            Math.round((matchedSkills.length / Math.max(3, oppSkills.length || 5)) * 100),
          )
        : 30;

    if (matchedSkills.length > 0) {
      matchingStrengths.push(
        `Matches your skills in ${matchedSkills
          .slice(0, 3)
          .map((s) => s.name)
          .join(', ')}.`,
      );
    }

    // Identify gaps from oppSkills not in user skills
    const rawOppSkills = opportunity.skills || [];
    const missingOppSkills = rawOppSkills.filter(
      (os) =>
        !userSkillNames.some(
          (us) => us.includes(os.toLowerCase()) || os.toLowerCase().includes(us),
        ),
    );
    if (missingOppSkills.length > 0) {
      criticalGaps.push(
        `Role requires ${missingOppSkills.slice(0, 3).join(', ')} which are not yet on your profile.`,
      );
      recommendedPreparation.push(`Complete a quick practice module in ${missingOppSkills[0]}.`);
    }

    // 3. Skill Gap Closing Potential (0 - 100)
    let skillGapClosingScore = 60;
    if (missingOppSkills.length > 0 && missingOppSkills.length <= 3) {
      skillGapClosingScore = 85; // High strategic value because gap is small and manageable
      matchingStrengths.push(
        `Opportunity provides an ideal scope to bridge into ${missingOppSkills[0]}.`,
      );
    }

    // 4. Project & Portfolio Relevance (0 - 100)
    let projectRelevanceScore = 30;
    for (const proj of userProfile.projects || []) {
      const projStack = (proj.techStack || []).map((t) => t.toLowerCase());
      const stackOverlap = projStack.filter((t) => oppText.includes(t));

      if (stackOverlap.length >= 2 || oppText.includes(proj.title.toLowerCase())) {
        relevantProjects.push(proj.title);
        projectRelevanceScore = Math.max(projectRelevanceScore, 85);
      } else if (stackOverlap.length >= 1) {
        relevantProjects.push(proj.title);
        projectRelevanceScore = Math.max(projectRelevanceScore, 65);
      }
    }

    if (relevantProjects.length > 0) {
      matchingStrengths.push(
        `Your project "${relevantProjects[0]}" demonstrates direct practical experience.`,
      );
    } else {
      recommendedPreparation.push(
        'Highlight a relevant project demonstrating key technical requirements in your resume.',
      );
    }

    // 5. Location & Work Mode Score (0 - 100)
    let locationWorkModeScore = 70;
    const oppMode = (opportunity.workMode || 'ONSITE').toUpperCase();
    if (userProfile.preferredWorkModes && userProfile.preferredWorkModes.includes(oppMode)) {
      locationWorkModeScore = 90;
    }

    // Composite Overall Score
    const overallScore = Math.round(
      roleAlignmentScore * 0.35 +
        skillOverlapScore * 0.3 +
        projectRelevanceScore * 0.2 +
        locationWorkModeScore * 0.15,
    );

    // Readiness Level
    let readinessLevel: OpportunityReadinessLevel = 'LOW_ALIGNMENT';
    if (overallScore >= 80 && missingOppSkills.length <= 1) {
      readinessLevel = 'READY';
    } else if (overallScore >= 65) {
      readinessLevel = 'NEEDS_PREPARATION';
    } else if (overallScore >= 50) {
      readinessLevel = 'PARTIALLY_READY';
    }

    if (matchingStrengths.length === 0) {
      matchingStrengths.push('Matches general technical domain.');
    }

    return {
      overallScore,
      roleAlignmentScore,
      skillOverlapScore,
      skillGapClosingScore,
      projectRelevanceScore,
      locationWorkModeScore,
      readinessLevel,
      matchingStrengths,
      criticalGaps,
      relevantProjects,
      recommendedPreparation,
    };
  }
}
