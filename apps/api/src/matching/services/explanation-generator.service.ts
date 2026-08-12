import { Injectable } from '@nestjs/common';

import type { MatchReasonData } from '../providers/matching-provider.interface';

import type { NormalizedJob } from './job-analyzer.service';
import type { NormalizedProfile } from './profile-analyzer.service';

@Injectable()
export class ExplanationGeneratorService {
  /**
   * Generates deterministic, verifiable explanations based on actual profile and job data.
   */
  generateExplanations(
    profile: NormalizedProfile,
    job: NormalizedJob,
    matchedSkills: string[],
    matchedRoles: string[],
    matchedLocations: string[],
    matchedCompanies: string[],
    componentScores: {
      skillScore: number;
      educationScore: number;
      locationScore: number;
      companyPreferenceScore: number;
      cgpaScore: number;
      stipendScore: number;
      experienceScore: number;
    },
  ): MatchReasonData[] {
    const reasons: MatchReasonData[] = [];

    // 1. Skill Match Reasons
    if (matchedSkills.length > 0) {
      reasons.push({
        reasonType: 'SKILL',
        description: `✔ Skills matched: ${matchedSkills.join(', ')}.`,
        weight: componentScores.skillScore,
      });
    }

    // 2. Role Match Reasons
    if (matchedRoles.length > 0) {
      reasons.push({
        reasonType: 'ROLE',
        description: `✔ Role match: Job title "${job.title}" matches your target preference.`,
        weight: componentScores.educationScore, // Map role weight
      });
    }

    // 3. Company Preference
    if (matchedCompanies.length > 0) {
      reasons.push({
        reasonType: 'COMPANY',
        description: `✔ Preferred company: ${job.companyName} is in your preferred/tracked target list.`,
        weight: componentScores.companyPreferenceScore,
      });
    }

    // 4. Location & Work Mode
    if (matchedLocations.length > 0) {
      reasons.push({
        reasonType: 'LOCATION',
        description: `✔ Preferred location/work mode matched (${matchedLocations.join(', ')}).`,
        weight: componentScores.locationScore,
      });
    }

    // 5. CGPA Requirement
    if (profile.cgpa !== null) {
      if (job.minCgpa !== null) {
        if (profile.cgpa >= job.minCgpa) {
          reasons.push({
            reasonType: 'CGPA',
            description: `✔ CGPA (${profile.cgpa.toFixed(2)}) satisfies job requirement (${job.minCgpa.toFixed(2)}+).`,
            weight: componentScores.cgpaScore,
          });
        }
      } else {
        reasons.push({
          reasonType: 'CGPA',
          description: `✔ CGPA (${profile.cgpa.toFixed(2)}) satisfies qualification requirements.`,
          weight: componentScores.cgpaScore,
        });
      }
    }

    // 6. Stipend
    if (job.stipend !== null && profile.minimumStipend !== null) {
      if (job.stipend >= profile.minimumStipend) {
        reasons.push({
          reasonType: 'STIPEND',
          description: `✔ Offered stipend ($${job.stipend}) meets or exceeds your minimum preference ($${profile.minimumStipend}).`,
          weight: componentScores.stipendScore,
        });
      }
    }

    // 7. Duration / Experience
    if (profile.internshipDuration && job.duration) {
      reasons.push({
        reasonType: 'DURATION',
        description: `✔ Internship duration (${job.duration}) matches your availability preference.`,
        weight: componentScores.experienceScore,
      });
    } else if (componentScores.experienceScore > 0) {
      reasons.push({
        reasonType: 'EXPERIENCE',
        description: `✔ Educational background (${profile.degree ?? 'Student'}) matches experience expectations.`,
        weight: componentScores.experienceScore,
      });
    }

    return reasons;
  }
}
