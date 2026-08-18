import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WorkMode } from '@prisma/client';

import { ExplanationGeneratorService } from '../services/explanation-generator.service';
import type { NormalizedJob } from '../services/job-analyzer.service';
import type { NormalizedProfile } from '../services/profile-analyzer.service';

import type { IMatchingProvider, MatchResult } from './matching-provider.interface';

@Injectable()
export class RuleBasedMatchingProvider implements IMatchingProvider {
  constructor(
    private readonly configService: ConfigService,
    private readonly explanationGenerator: ExplanationGeneratorService,
  ) {}

  async calculateMatch(profile: NormalizedProfile, job: NormalizedJob): Promise<MatchResult> {
    const weights = this.configService.get('matching.weights') ?? {
      skills: 30,
      role: 20,
      careerGoal: 15,
      location: 10,
      eligibility: 10,
      company: 5,
      freshness: 5,
      behavioralRelevance: 5,
    };

    // 1. Hard Eligibility Filter
    const eligibilityCheck = this.checkHardEligibility(profile, job);
    if (!eligibilityCheck.isEligible) {
      return {
        overallScore: 0,
        skillScore: 0,
        educationScore: 0,
        locationScore: 0,
        cgpaScore: 0,
        companyPreferenceScore: 0,
        stipendScore: 0,
        experienceScore: 0,
        careerGoalScore: 0,
        freshnessScore: 0,
        behavioralScore: 0,
        matchedSkills: [],
        matchedRoles: [],
        matchedLocations: [],
        matchedCompanies: [],
        confidenceScore: 100,
        reasons: [
          {
            reasonType: 'ELIGIBILITY',
            description: `Not eligible: ${eligibilityCheck.reason}`,
            weight: 0,
          },
        ],
        isEligible: false,
        ineligibilityReason: eligibilityCheck.reason,
        missingSkills: [],
      };
    }

    // 2. Skill Score Calculation (0-100) & Missing Skills
    const { skillScore, matchedSkills, missingSkills } = this.calculateSkillMatch(profile, job);

    // 3. Role Match Score (0-100)
    const { roleScore, matchedRoles } = this.calculateRoleMatch(profile, job);

    // 4. Career Goal Match Score (0-100)
    const careerGoalScore = this.calculateCareerGoalMatch(profile, job);

    // 5. Location Match Score (0-100)
    const { locationScore, matchedLocations } = this.calculateLocationMatch(profile, job);

    // 6. Eligibility Detail Score (0-100)
    const eligibilityScore = this.calculateEligibilityScore(profile, job);

    // 7. Company Preference Score (0-100)
    const { companyScore, matchedCompanies } = this.calculateCompanyMatch(profile, job);

    // 8. Freshness Score (0-100)
    const freshnessScore = this.calculateFreshnessMatch(job);

    // 9. Behavioral Relevance Score (0-100)
    const behavioralScore = this.calculateBehavioralRelevance(profile, job);

    // Normalized Weights
    const totalWeight =
      (weights.skills ?? 30) +
      (weights.role ?? 20) +
      (weights.careerGoal ?? 15) +
      (weights.location ?? 10) +
      (weights.eligibility ?? 10) +
      (weights.company ?? 5) +
      (weights.freshness ?? 5) +
      (weights.behavioralRelevance ?? 5);

    const wSkills = (weights.skills ?? 30) / totalWeight;
    const wRole = (weights.role ?? 20) / totalWeight;
    const wGoal = (weights.careerGoal ?? 15) / totalWeight;
    const wLoc = (weights.location ?? 10) / totalWeight;
    const wElig = (weights.eligibility ?? 10) / totalWeight;
    const wComp = (weights.company ?? 5) / totalWeight;
    const wFresh = (weights.freshness ?? 5) / totalWeight;
    const wBehav = (weights.behavioralRelevance ?? 5) / totalWeight;

    const overallScore = Math.round(
      skillScore * wSkills +
        roleScore * wRole +
        careerGoalScore * wGoal +
        locationScore * wLoc +
        eligibilityScore * wElig +
        companyScore * wComp +
        freshnessScore * wFresh +
        behavioralScore * wBehav,
    );

    // Calculate confidence score based on data completeness
    const confidenceScore = this.calculateConfidence(profile, job);

    const componentScores = {
      skillScore: Math.round(skillScore),
      educationScore: Math.round(roleScore), // Maps to roleScore
      locationScore: Math.round(locationScore),
      companyPreferenceScore: Math.round(companyScore),
      cgpaScore: Math.round(profile.cgpa ? eligibilityScore : 70),
      stipendScore: this.calculateStipendMatch(profile, job),
      experienceScore: Math.round(profile.yearOfStudy ? eligibilityScore : 70),
      careerGoalScore: Math.round(careerGoalScore),
      freshnessScore: Math.round(freshnessScore),
      behavioralScore: Math.round(behavioralScore),
    };

    const reasons = this.explanationGenerator.generateExplanations(
      profile,
      job,
      matchedSkills,
      matchedRoles,
      matchedLocations,
      matchedCompanies,
      componentScores,
    );

    return {
      overallScore: Math.min(100, Math.max(0, overallScore)),
      ...componentScores,
      matchedSkills,
      matchedRoles,
      matchedLocations,
      matchedCompanies,
      confidenceScore,
      reasons,
      isEligible: true,
      missingSkills,
    };
  }

  /**
   * Helper to perform hard eligibility exclusions.
   */
  checkHardEligibility(
    profile: NormalizedProfile,
    job: NormalizedJob,
  ): { isEligible: boolean; reason?: string } {
    const now = new Date();

    // 1. Expired
    if (job.applicationDeadline && job.applicationDeadline < now) {
      return { isEligible: false, reason: 'Job application deadline has passed' };
    }

    // 2. Impossible CGPA Requirement
    if (profile.cgpa !== null && job.minCgpa !== null && profile.cgpa < job.minCgpa) {
      return {
        isEligible: false,
        reason: `CGPA requirement mismatch (User CGPA: ${profile.cgpa}, Min Required: ${job.minCgpa})`,
      };
    }

    // 3. Graduation year mismatch
    if (
      profile.graduationYear !== null &&
      job.graduationRequirement !== null &&
      profile.graduationYear !== job.graduationRequirement
    ) {
      return {
        isEligible: false,
        reason: `Graduation batch mismatch (User batch: ${profile.graduationYear}, Required: ${job.graduationRequirement})`,
      };
    }

    // 4. Experience requirement mismatch
    if (job.experienceRequirement !== null && job.experienceRequirement > 0) {
      const estimatedExpYears = profile.yearOfStudy ? Math.max(0, profile.yearOfStudy - 1) : 0;
      if (estimatedExpYears < job.experienceRequirement) {
        return {
          isEligible: false,
          reason: `Experience requirement mismatch (Required: ${job.experienceRequirement} years)`,
        };
      }
    }

    // 5. Work mode explicitly excluded
    if (
      profile.preferredWorkModes.length === 1 &&
      profile.preferredWorkModes.includes(WorkMode.REMOTE) &&
      job.workMode === WorkMode.ONSITE
    ) {
      return { isEligible: false, reason: 'User restricts preferences to Remote roles only' };
    }

    return { isEligible: true };
  }

  private calculateSkillMatch(
    profile: NormalizedProfile,
    job: NormalizedJob,
  ): { skillScore: number; matchedSkills: string[]; missingSkills: string[] } {
    const jobSkills = Array.from(new Set([...job.requiredSkills, ...job.descriptionKeywords]));
    if (jobSkills.length === 0) {
      return { skillScore: 70, matchedSkills: [], missingSkills: [] };
    }

    const matchedSkills = profile.skills.filter((userSkill) =>
      jobSkills.some((js) => js.toLowerCase() === userSkill.toLowerCase()),
    );

    const missingSkills = job.requiredSkills.filter(
      (reqSkill) =>
        !profile.skills.some((userSkill) => userSkill.toLowerCase() === reqSkill.toLowerCase()),
    );

    let score = 0;
    if (job.requiredSkills.length > 0) {
      const requiredOverlap = job.requiredSkills.filter((rs) =>
        profile.skills.some((us) => us.toLowerCase() === rs.toLowerCase()),
      );
      const requiredScore = (requiredOverlap.length / job.requiredSkills.length) * 70;
      const bonusScore = (matchedSkills.length / Math.max(1, jobSkills.length)) * 30;
      score = requiredScore + bonusScore;
    } else {
      score = (matchedSkills.length / Math.max(1, jobSkills.length)) * 100;
    }

    return {
      skillScore: Math.min(100, score),
      matchedSkills,
      missingSkills,
    };
  }

  private calculateRoleMatch(
    profile: NormalizedProfile,
    job: NormalizedJob,
  ): { roleScore: number; matchedRoles: string[] } {
    if (profile.preferredRoles.length === 0) {
      return { roleScore: 60, matchedRoles: [] };
    }

    const titleLower = job.title.toLowerCase();
    const roleCatLower = job.roleCategory.toLowerCase();

    const matchedRoles = profile.preferredRoles.filter((role) => {
      const roleLower = role.toLowerCase();
      return (
        titleLower.includes(roleLower) ||
        roleLower.includes(titleLower) ||
        roleCatLower.includes(roleLower)
      );
    });

    const score = matchedRoles.length > 0 ? 100 : 20;

    return {
      roleScore: score,
      matchedRoles,
    };
  }

  private calculateCareerGoalMatch(profile: NormalizedProfile, job: NormalizedJob): number {
    if (profile.careerGoals.length === 0) {
      return 50; // Neutral default
    }

    const titleLower = job.title.toLowerCase();
    const compLower = job.companyName.toLowerCase();

    let maxGoalScore = 20;

    for (const goal of profile.careerGoals) {
      const targetRoleLower = goal.targetRole.toLowerCase();
      const targetCompLower = goal.targetCompany?.toLowerCase() ?? '';

      const roleMatch =
        titleLower.includes(targetRoleLower) || targetRoleLower.includes(titleLower);
      const compMatch =
        targetCompLower &&
        (compLower.includes(targetCompLower) || targetCompLower.includes(compLower));

      if (roleMatch && compMatch) {
        maxGoalScore = Math.max(maxGoalScore, 100);
      } else if (roleMatch) {
        maxGoalScore = Math.max(maxGoalScore, 85);
      } else if (compMatch) {
        maxGoalScore = Math.max(maxGoalScore, 70);
      }
    }

    return maxGoalScore;
  }

  private calculateLocationMatch(
    profile: NormalizedProfile,
    job: NormalizedJob,
  ): { locationScore: number; matchedLocations: string[] } {
    const matchedLocations: string[] = [];
    let score = 50;

    if (job.workMode && profile.preferredWorkModes.includes(job.workMode)) {
      matchedLocations.push(`WorkMode: ${job.workMode}`);
      score += 40;
    }

    if (job.location) {
      const jobLocLower = job.location.toLowerCase();
      const hasLocMatch = profile.preferredLocations.some((prefLoc) =>
        jobLocLower.includes(prefLoc.toLowerCase()),
      );
      if (hasLocMatch) {
        matchedLocations.push(`Location: ${job.location}`);
        score += 50;
      }
    }

    return {
      locationScore: Math.min(100, score),
      matchedLocations,
    };
  }

  private calculateEligibilityScore(profile: NormalizedProfile, job: NormalizedJob): number {
    let matchesCount = 0;
    let totalChecks = 0;

    // CGPA checks
    if (job.minCgpa !== null) {
      totalChecks++;
      if (profile.cgpa !== null && profile.cgpa >= job.minCgpa) {
        matchesCount++;
      }
    }

    // Experience checks
    if (job.experienceRequirement !== null && job.experienceRequirement > 0) {
      totalChecks++;
      const userExp = profile.yearOfStudy ? Math.max(0, profile.yearOfStudy - 1) : 0;
      if (userExp >= job.experienceRequirement) {
        matchesCount++;
      }
    }

    // Graduation batch checks
    if (job.graduationRequirement !== null) {
      totalChecks++;
      if (profile.graduationYear === job.graduationRequirement) {
        matchesCount++;
      }
    }

    if (totalChecks === 0) return 100;
    return Math.round((matchesCount / totalChecks) * 100);
  }

  private calculateCompanyMatch(
    profile: NormalizedProfile,
    job: NormalizedJob,
  ): { companyScore: number; matchedCompanies: string[] } {
    const matchedCompanies: string[] = [];
    const jobCompLower = job.companyName.toLowerCase();

    const isPreferred = profile.preferredCompanies.some(
      (c) => c.toLowerCase().includes(jobCompLower) || jobCompLower.includes(c.toLowerCase()),
    );
    const isTracked = profile.trackedCompanyNames.some(
      (c) => c.toLowerCase().includes(jobCompLower) || jobCompLower.includes(c.toLowerCase()),
    );

    if (isPreferred || isTracked) {
      matchedCompanies.push(job.companyName);
      return { companyScore: 100, matchedCompanies };
    }

    return { companyScore: 50, matchedCompanies: [] };
  }

  private calculateFreshnessMatch(job: NormalizedJob): number {
    const ageMs = Date.now() - job.postedAt.getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);

    if (ageDays <= 1) return 100; // New today
    if (ageDays <= 3) return 85; // Recent
    if (ageDays <= 7) return 60; // Older
    return 30; // Cold
  }

  private calculateBehavioralRelevance(profile: NormalizedProfile, job: NormalizedJob): number {
    // If the user has saved or applied to this specific job
    if (profile.savedJobs.includes(job.jobId)) return 100;
    if (profile.applicationHistory.some((app) => app.jobId === job.jobId)) return 100;

    // Check interaction signals
    const hasViewed = profile.interactionHistory.some(
      (ji) => ji.jobId === job.jobId && ji.interactionType === 'VIEW',
    );
    if (hasViewed) return 80;

    // Mapped signals for same company/role category
    const interactedWithSameCompany = profile.interactionHistory.some(
      (ji) =>
        ji.jobId &&
        profile.savedJobs.includes(ji.jobId) &&
        job.companyName.toLowerCase().includes(job.companyName.toLowerCase()),
    );
    if (interactedWithSameCompany) return 70;

    return 50; // Neutral default
  }

  private calculateStipendMatch(profile: NormalizedProfile, job: NormalizedJob): number {
    if (profile.minimumStipend === null || job.stipend === null) return 80;
    if (job.stipend >= profile.minimumStipend) return 100;

    const ratio = job.stipend / profile.minimumStipend;
    return Math.round(ratio * 100);
  }

  private calculateConfidence(profile: NormalizedProfile, job: NormalizedJob): number {
    let inputsCount = 0;
    if (profile.skills.length > 0) inputsCount++;
    if (profile.preferredRoles.length > 0) inputsCount++;
    if (profile.preferredLocations.length > 0) inputsCount++;
    if (profile.cgpa !== null) inputsCount++;
    if (job.requiredSkills.length > 0 || job.descriptionKeywords.length > 0) inputsCount++;
    if (job.location) inputsCount++;

    return Math.min(100, Math.round((inputsCount / 6) * 100));
  }
}
