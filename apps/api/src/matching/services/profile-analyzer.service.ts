import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { WorkMode } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { KeywordNormalizerService } from './keyword-normalizer.service';

export interface NormalizedProfile {
  userId: string;
  skills: string[];
  preferredRoles: string[];
  preferredLocations: string[];
  preferredCompanies: string[];
  preferredWorkModes: WorkMode[];
  minimumStipend: number | null;
  internshipDuration: string | null;
  cgpa: number | null;
  degree: string | null;
  branch: string | null;
  college: string | null;
  yearOfStudy: number | null;
  graduationYear: number | null;
  resumeKeywords: string[];
  trackedCompanyNames: string[];
  careerGoals: Array<{ targetRole: string; targetCompany: string | null }>;
  learningGoals: Array<{ title: string; skillId: string | null; targetRole: string | null }>;
  applicationHistory: Array<{ jobId: string; status: string }>;
  savedJobs: string[];
  interactionHistory: Array<{ jobId: string | null; interactionType: string }>;
  certifications: Array<{ title: string; provider: string }>;
}

@Injectable()
export class ProfileAnalyzerService {
  private readonly logger = new Logger(ProfileAnalyzerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly keywordNormalizer: KeywordNormalizerService,
  ) {}

  /**
   * Fetches and normalizes user profile data for matching.
   */
  async analyzeProfile(userId: string): Promise<NormalizedProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        userSkills: {
          include: { skill: true },
        },
        careerPreference: true,
        resume: true,
        trackedCompanies: {
          include: { company: true },
        },
        careerGoals: true,
        learningGoals: {
          include: { targetSkill: true },
        },
        applications: true,
        savedJobs: true,
        jobInteractions: true,
        certifications: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const rawSkillNames = user.userSkills.map((us) => us.skill.name);
    const normalizedSkills = this.keywordNormalizer.normalizeKeywords(rawSkillNames);

    const careerPref = user.careerPreference;
    const preferredRoles = careerPref?.preferredRoles ?? [];
    const preferredLocations = careerPref?.preferredLocations ?? [];
    const preferredCompanies = careerPref?.preferredCompanies ?? [];
    const preferredWorkModes = careerPref?.preferredWorkMode ?? [];
    const minimumStipend = careerPref?.minimumStipend ?? null;
    const internshipDuration = careerPref?.internshipDuration ?? null;

    const profile = user.profile;
    const cgpa = profile?.cgpa ? Number(profile.cgpa) : null;
    const degree = profile?.degree ?? null;
    const branch = profile?.branch ?? null;
    const college = profile?.college ?? null;
    const yearOfStudy = profile?.yearOfStudy ?? null;
    const graduationYear = profile?.graduationYear ?? null;

    // Tracked company names
    const trackedCompanyNames = user.trackedCompanies
      .filter((tc) => tc.trackingEnabled)
      .map((tc) => tc.company.name);

    // Extract keywords from bio, headline, and resume file name/metadata
    const resumeText = [profile?.headline, profile?.bio, user.resume?.fileName]
      .filter(Boolean)
      .join(' ');

    const resumeKeywords = this.keywordNormalizer.extractKeywordsFromText(resumeText);

    // Combine skill list and resume keywords for complete skill profile
    const allSkills = this.keywordNormalizer.normalizeKeywords([
      ...normalizedSkills,
      ...resumeKeywords,
    ]);

    // Map new fields
    const careerGoals = user.careerGoals.map((cg) => ({
      targetRole: cg.targetRole,
      targetCompany: cg.targetCompany,
    }));

    const learningGoals = user.learningGoals.map((lg) => ({
      title: lg.title,
      skillId: lg.targetSkillId,
      targetRole: lg.targetRole,
    }));

    const applicationHistory = user.applications.map((app) => ({
      jobId: app.jobId,
      status: app.status,
    }));

    const savedJobs = user.savedJobs.map((sj) => sj.jobId);

    const interactionHistory = user.jobInteractions.map((ji) => ({
      jobId: ji.jobId,
      interactionType: ji.interactionType,
    }));

    const certifications = user.certifications.map((cert) => ({
      title: cert.title,
      provider: cert.provider,
    }));

    this.logger.debug(
      `Analyzed profile for user ${userId}: ${allSkills.length} skills, ${preferredRoles.length} roles`,
    );

    return {
      userId,
      skills: allSkills,
      preferredRoles,
      preferredLocations,
      preferredCompanies,
      preferredWorkModes,
      minimumStipend,
      internshipDuration,
      cgpa,
      degree,
      branch,
      college,
      yearOfStudy,
      graduationYear,
      resumeKeywords,
      trackedCompanyNames,
      careerGoals,
      learningGoals,
      applicationHistory,
      savedJobs,
      interactionHistory,
      certifications,
    };
  }
}
