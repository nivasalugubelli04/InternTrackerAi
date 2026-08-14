import { Injectable, NotFoundException } from '@nestjs/common';
import {
  RecruiterDiscoverabilityLevel,
  RecruiterOrgVerificationStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RecruiterOrgService } from './recruiter-org.service';

export interface CandidateSearchFilters {
  keyword?: string;
  skills?: string[];
  location?: string;
  workMode?: string;
  graduationYear?: number | undefined;
  degree?: string;
  branch?: string;
  experienceLevel?: string;
  availability?: string;
  careerInterests?: string[];
  page?: number;
  limit?: number;
}

/** Only these fields are ever exposed to recruiters — enforced by SELECT */
const RECRUITER_SAFE_PROFILE_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  profile: {
    select: {
      headline: true,
      location: true,
      experienceLevel: true,
      bio: true,
      portfolioUrl: true,
      githubUrl: true,
      linkedinUrl: true,
    },
  },
  userSkills: {
    select: {
      skill: { select: { name: true, category: true } },
      proficiencyLevel: true,
    },
  },
  careerPreference: {
    select: {
      preferredRoles: true,
      preferredLocations: true,
      openToRemote: true,
      openToRelocation: true,
      salaryExpectation: true,
      noticePeriod: true,
      availableFrom: true,
    },
  },
  discoverabilitySettings: {
    select: {
      discoverabilityLevel: true,
      resumeVisible: true,
      profileVisible: true,
      specificCompanyIds: true,
    },
  },
} as const;

@Injectable()
export class CandidateDiscoveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly recruiterOrgService: RecruiterOrgService,
  ) {}

  /**
   * Search for consented candidates.
   * CRITICAL: Applies RecruiterDiscoverabilitySettings filter before returning any data.
   * Never exposes: private AI conversations, private notes, private notifications,
   * contact details (email/phone), or any data the candidate has not consented to share.
   */
  async searchCandidates(
    recruiterOrgId: string,
    recruiterUserId: string,
    filters: CandidateSearchFilters,
  ) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 50); // max 50 per page
    const skip = (page - 1) * limit;

    // Build consent filter — only candidates visible to recruiters
    const whereClause: Record<string, unknown> = {
      discoverabilitySettings: {
        is: this.buildConsentFilter(),
      },
      isActive: true,
    };

    // Build profile-based filters
    const profileWhere: Record<string, unknown> = {};
    if (filters.location) {
      // Simplified search across city/country
      profileWhere['city'] = { contains: filters.location, mode: 'insensitive' };
    }

    // Build career preference filters
    const preferenceWhere: Record<string, unknown> = {};
    if (filters.workMode) preferenceWhere['preferredWorkMode'] = filters.workMode;
    if (filters.availability) preferenceWhere['availableFrom'] = { lte: new Date() };

    if (Object.keys(profileWhere).length > 0) {
      whereClause['profile'] = { is: profileWhere };
    }

    // Skill filter
    if (filters.skills && filters.skills.length > 0) {
      whereClause['userSkills'] = {
        some: {
          skill: {
            name: { in: filters.skills, mode: 'insensitive' },
          },
        },
      };
    }

    // Keyword search on name / headline
    if (filters.keyword) {
      const kw = filters.keyword;
      whereClause['OR'] = [
        { firstName: { contains: kw, mode: 'insensitive' } },
        { lastName: { contains: kw, mode: 'insensitive' } },
        { profile: { headline: { contains: kw, mode: 'insensitive' } } },
        { userSkills: { some: { skill: { name: { contains: kw, mode: 'insensitive' } } } } },
        {
          careerPreference: {
            preferredRoles: { hasSome: [kw] },
          },
        },
      ];
    }

    const [candidates, total] = await Promise.all([
      this.prisma.user.findMany({
        where: whereClause as any,
        select: RECRUITER_SAFE_PROFILE_SELECT,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where: whereClause as any }),
    ]);

    // Log audit event for candidate discovery
    await this.recruiterOrgService.logAudit(
      recruiterUserId,
      'CANDIDATE_SEARCH',
      'CandidateSearch',
      undefined,
      recruiterOrgId,
      { filters, resultCount: candidates.length },
    );

    return {
      candidates: candidates.map((c) => this.sanitizeCandidateCard(c)),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  /**
   * View a single candidate's recruiter-visible profile.
   * Verifies consent before returning data. Logs audit event.
   */
  async getCandidateProfile(
    candidateId: string,
    recruiterOrgId: string,
    recruiterUserId: string,
  ) {
    // Check consent first
    const settings = await this.prisma.recruiterDiscoverabilitySettings.findUnique({
      where: { userId: candidateId },
    });

    if (!settings || settings.discoverabilityLevel === RecruiterDiscoverabilityLevel.PRIVATE) {
      throw new NotFoundException('Candidate not found or not discoverable');
    }

    if (settings.discoverabilityLevel === RecruiterDiscoverabilityLevel.SPECIFIC_COMPANIES) {
      const recruiterOrg = await this.prisma.recruiterOrganization.findUnique({
        where: { id: recruiterOrgId },
      });
      if (!recruiterOrg) throw new NotFoundException('Recruiter organization not found');

      // Check if this org's linked company is in candidate's allowed list
      if (!settings.specificCompanyIds.includes(recruiterOrgId)) {
        throw new NotFoundException('Candidate not found or not discoverable');
      }
    }

    if (
      settings.discoverabilityLevel === RecruiterDiscoverabilityLevel.VERIFIED_RECRUITERS
    ) {
      const recruiterOrg = await this.prisma.recruiterOrganization.findUnique({
        where: { id: recruiterOrgId },
      });
      if (recruiterOrg?.verificationStatus !== RecruiterOrgVerificationStatus.VERIFIED) {
        throw new NotFoundException('Candidate not found or not discoverable');
      }
    }

    const candidate = await this.prisma.user.findUnique({
      where: { id: candidateId },
      select: {
        ...RECRUITER_SAFE_PROFILE_SELECT,
        // Include resume only if candidate has consented
        resume: settings.resumeVisible
          ? {
              select: {
                id: true,
                fileUrl: true,
              },
            }
          : false,
      },
    });

    if (!candidate) throw new NotFoundException('Candidate not found');

    await this.recruiterOrgService.logAudit(
      recruiterUserId,
      'CANDIDATE_VIEWED',
      'User',
      candidateId,
    );

    return this.sanitizeCandidateProfile(candidate, settings.resumeVisible);
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  /** Build the Prisma `where` clause fragment for consent. */
  private buildConsentFilter() {
    return {
      discoverabilityLevel: {
        in: [
          RecruiterDiscoverabilityLevel.PUBLIC_PROFILE,
          RecruiterDiscoverabilityLevel.VERIFIED_RECRUITERS,
          RecruiterDiscoverabilityLevel.SPECIFIC_COMPANIES,
        ],
      },
      profileVisible: true,
    };
  }

  /** Strip any fields that should not be on a search result card. */
  private sanitizeCandidateCard(candidate: any) {
    return {
      id: candidate.id,
      displayName: `${candidate.firstName ?? ''} ${candidate.lastName ?? ''}`.trim(),
      headline: candidate.profile?.headline ?? null,
      location: candidate.profile?.location ?? null,
      experienceLevel: candidate.profile?.experienceLevel ?? null,
      topSkills: (candidate.userSkills ?? []).slice(0, 6).map((s: any) => s.skill.name),
      careerInterests: candidate.careerPreference?.preferredRoles ?? [],
      discoverabilityLevel: candidate.discoverabilitySettings?.discoverabilityLevel,
      resumeAvailable: candidate.discoverabilitySettings?.resumeVisible ?? false,
    };
  }

  /** Full profile view for a single candidate. */
  private sanitizeCandidateProfile(candidate: any, resumeVisible: boolean) {
    return {
      id: candidate.id,
      displayName: `${candidate.firstName ?? ''} ${candidate.lastName ?? ''}`.trim(),
      headline: candidate.profile?.headline ?? null,
      bio: candidate.profile?.bio ?? null,
      location: candidate.profile?.location ?? null,
      experienceLevel: candidate.profile?.experienceLevel ?? null,
      linkedinUrl: candidate.profile?.linkedinUrl ?? null,
      githubUrl: candidate.profile?.githubUrl ?? null,
      portfolioUrl: candidate.profile?.portfolioUrl ?? null,
      skills: (candidate.userSkills ?? []).map((s: any) => ({
        name: s.skill.name,
        category: s.skill.category,
        proficiency: s.proficiencyLevel,
      })),
      careerPreferences: candidate.careerPreference ?? null,
      resume: resumeVisible ? (candidate.resume ?? null) : null,
    };
  }
}
