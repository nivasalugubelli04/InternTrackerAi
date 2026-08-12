import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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
      skills: 35,
      role: 20,
      location: 15,
      company: 10,
      cgpa: 10,
      stipend: 5,
      experience: 5,
    };

    // 1. Skill Score Calculation (0-100)
    const { skillScore, matchedSkills } = this.calculateSkillMatch(profile, job);

    // 2. Role Match Score (0-100)
    const { roleScore, matchedRoles } = this.calculateRoleMatch(profile, job);

    // 3. Location Match Score (0-100)
    const { locationScore, matchedLocations } = this.calculateLocationMatch(profile, job);

    // 4. Company Preference Score (0-100)
    const { companyScore, matchedCompanies } = this.calculateCompanyMatch(profile, job);

    // 5. CGPA Score (0-100)
    const cgpaScore = this.calculateCgpaMatch(profile, job);

    // 6. Stipend Score (0-100)
    const stipendScore = this.calculateStipendMatch(profile, job);

    // 7. Experience / Duration Score (0-100)
    const experienceScore = this.calculateExperienceMatch(profile, job);

    // Normalize weights to sum to 1.0
    const totalWeight =
      weights.skills +
      weights.role +
      weights.location +
      weights.company +
      weights.cgpa +
      weights.stipend +
      weights.experience;

    const wSkills = weights.skills / totalWeight;
    const wRole = weights.role / totalWeight;
    const wLoc = weights.location / totalWeight;
    const wComp = weights.company / totalWeight;
    const wCgpa = weights.cgpa / totalWeight;
    const wStipend = weights.stipend / totalWeight;
    const wExp = weights.experience / totalWeight;

    const overallScore = Math.round(
      skillScore * wSkills +
        roleScore * wRole +
        locationScore * wLoc +
        companyScore * wComp +
        cgpaScore * wCgpa +
        stipendScore * wStipend +
        experienceScore * wExp,
    );

    // Calculate confidence score based on available data completeness
    const confidenceScore = this.calculateConfidence(profile, job);

    const componentScores = {
      skillScore: Math.round(skillScore),
      educationScore: Math.round(roleScore), // Map role score to educationScore DB column
      locationScore: Math.round(locationScore),
      companyPreferenceScore: Math.round(companyScore),
      cgpaScore: Math.round(cgpaScore),
      stipendScore: Math.round(stipendScore),
      experienceScore: Math.round(experienceScore),
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
    };
  }

  private calculateSkillMatch(
    profile: NormalizedProfile,
    job: NormalizedJob,
  ): { skillScore: number; matchedSkills: string[] } {
    if (job.requiredSkills.length === 0 && job.descriptionKeywords.length === 0) {
      return { skillScore: 70, matchedSkills: [] }; // Neutral score if no job skills detected
    }

    const jobSkills = Array.from(new Set([...job.requiredSkills, ...job.descriptionKeywords]));
    const matchedSkills = profile.skills.filter((userSkill) =>
      jobSkills.some((js) => js.toLowerCase() === userSkill.toLowerCase()),
    );

    const requiredOverlap = job.requiredSkills.filter((rs) =>
      profile.skills.some((us) => us.toLowerCase() === rs.toLowerCase()),
    );

    let score = 0;
    if (job.requiredSkills.length > 0) {
      const requiredScore = (requiredOverlap.length / job.requiredSkills.length) * 70;
      const bonusScore = (matchedSkills.length / Math.max(1, jobSkills.length)) * 30;
      score = requiredScore + bonusScore;
    } else {
      score = (matchedSkills.length / Math.max(1, jobSkills.length)) * 100;
    }

    return {
      skillScore: Math.min(100, score),
      matchedSkills,
    };
  }

  private calculateRoleMatch(
    profile: NormalizedProfile,
    job: NormalizedJob,
  ): { roleScore: number; matchedRoles: string[] } {
    if (profile.preferredRoles.length === 0) {
      return { roleScore: 60, matchedRoles: [] }; // Default neutral
    }

    const titleLower = job.title.toLowerCase();
    const matchedRoles = profile.preferredRoles.filter((role) => {
      const roleLower = role.toLowerCase();
      return titleLower.includes(roleLower) || roleLower.includes(titleLower);
    });

    const score = matchedRoles.length > 0 ? 100 : 20;

    return {
      roleScore: score,
      matchedRoles,
    };
  }

  private calculateLocationMatch(
    profile: NormalizedProfile,
    job: NormalizedJob,
  ): { locationScore: number; matchedLocations: string[] } {
    const matchedLocations: string[] = [];
    let score = 50; // Neutral default

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

  private calculateCgpaMatch(profile: NormalizedProfile, job: NormalizedJob): number {
    if (profile.cgpa === null) return 70; // Neutral
    if (job.minCgpa === null) return 100; // Satisfies any requirement

    if (profile.cgpa >= job.minCgpa) {
      return 100;
    } else {
      const ratio = profile.cgpa / job.minCgpa;
      return Math.round(ratio * 70);
    }
  }

  private calculateStipendMatch(profile: NormalizedProfile, job: NormalizedJob): number {
    if (profile.minimumStipend === null || job.stipend === null) return 80;
    if (job.stipend >= profile.minimumStipend) return 100;

    const ratio = job.stipend / profile.minimumStipend;
    return Math.round(ratio * 100);
  }

  private calculateExperienceMatch(profile: NormalizedProfile, job: NormalizedJob): number {
    if (!job.experienceLevel) return 80;
    const expLower = job.experienceLevel.toLowerCase();

    if (expLower.includes('intern') || expLower.includes('entry') || expLower.includes('fresh')) {
      return 100;
    }

    if (profile.yearOfStudy && profile.yearOfStudy >= 3) {
      return 90;
    }

    return 70;
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
