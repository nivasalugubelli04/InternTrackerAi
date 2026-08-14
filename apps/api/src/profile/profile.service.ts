import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import type { Profile, UserSkill, Skill, Prisma } from '@prisma/client';

import { EngagementTrackerService } from '../engagement/services/engagement-tracker.service';
import { PrismaService } from '../prisma/prisma.service';

import type { AddSkillDto } from './dto/add-skill.dto';
import type { CreateProfileDto } from './dto/create-profile.dto';
import type { UpdateProfileDto } from './dto/update-profile.dto';

export interface ProfileCompletion {
  total: number;
  sections: {
    personal: number;
    education: number;
    skills: number;
    resume: number;
    careerPreferences: number;
  };
}

export type ProfileWithSkills = Profile & {
  userSkills: (UserSkill & { skill: Skill })[];
};

/**
 * ProfileService — all profile CRUD and completion calculation.
 *
 * Completion Rules (each section = 20%):
 *  - personal:  headline + bio + phone + city + country (≥ 3 filled)
 *  - education: college + degree + branch + graduationYear + cgpa (≥ 3 filled)
 *  - skills:    at least 1 UserSkill added
 *  - resume:    Resume record exists
 *  - career:    at least 1 preferred role AND 1 work mode selected
 */
@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly engagementTracker: EngagementTrackerService,
  ) {}

  // ── Create ────────────────────────────────────────────────────────────────
  async create(userId: string, dto: CreateProfileDto): Promise<Profile> {
    const existing = await this.prisma.profile.findUnique({ where: { userId } });
    if (existing) {
      throw new ConflictException('Profile already exists. Use PATCH to update.');
    }

    const profile = await this.prisma.profile.create({
      data: {
        userId,
        ...this.buildCreateData(dto),
      },
    });

    this.logger.log({ userId, profileId: profile.id }, 'Profile created');
    return profile;
  }

  // ── Find own profile (with skills) ───────────────────────────────────────
  async findByUserId(userId: string): Promise<ProfileWithSkills> {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const userSkills = await this.prisma.userSkill.findMany({
      where: { userId },
      include: { skill: true },
    });

    return { ...profile, userSkills };
  }

  // ── Update ────────────────────────────────────────────────────────────────
  async update(userId: string, dto: UpdateProfileDto): Promise<Profile> {
    await this.ensureExists(userId);

    const profile = await this.prisma.profile.update({
      where: { userId },
      data: this.buildUpdateData(dto),
    });

    this.logger.log({ userId }, 'Profile updated');

    // Phase 16: Track engagement event
    await this.engagementTracker.trackAction(userId, 'PROFILE_COMPLETE');

    return profile;
  }

  // ── Completion ────────────────────────────────────────────────────────────
  async getCompletion(userId: string): Promise<ProfileCompletion> {
    const [profile, skillCount, resumeRecord, careerPref] = await Promise.all([
      this.prisma.profile.findUnique({ where: { userId } }),
      this.prisma.userSkill.count({ where: { userId } }),
      this.prisma.resume.findUnique({ where: { userId }, select: { id: true } }),
      this.prisma.careerPreference.findUnique({ where: { userId } }),
    ]);

    const personal = profile ? this.scorePersonal(profile) : 0;
    const education = profile ? this.scoreEducation(profile) : 0;
    const skills = skillCount >= 1 ? 20 : 0;
    const resume = resumeRecord !== null ? 20 : 0;
    const careerPreferences = careerPref ? this.scoreCareer(careerPref) : 0;

    return {
      total: personal + education + skills + resume + careerPreferences,
      sections: { personal, education, skills, resume, careerPreferences },
    };
  }

  // ── Add Skill ─────────────────────────────────────────────────────────────
  async addSkill(userId: string, dto: AddSkillDto): Promise<UserSkill> {
    await this.ensureExists(userId);

    const skill = await this.prisma.skill.findUnique({ where: { id: dto.skillId } });
    if (!skill) throw new NotFoundException(`Skill ${dto.skillId} not found`);

    const userSkill = await this.prisma.userSkill.upsert({
      where: { userId_skillId: { userId, skillId: dto.skillId } },
      create: { userId, skillId: dto.skillId, proficiency: dto.proficiency },
      update: { proficiency: dto.proficiency },
    });

    this.logger.log({ userId, skillId: dto.skillId }, 'Skill added/updated');
    return userSkill;
  }

  // ── Remove Skill ─────────────────────────────────────────────────────────
  async removeSkill(userId: string, skillId: string): Promise<void> {
    const existing = await this.prisma.userSkill.findUnique({
      where: { userId_skillId: { userId, skillId } },
    });
    if (!existing) throw new NotFoundException('Skill not associated with your profile');

    await this.prisma.userSkill.delete({
      where: { userId_skillId: { userId, skillId } },
    });

    this.logger.log({ userId, skillId }, 'Skill removed');
  }

  // ── Mark onboarding complete ──────────────────────────────────────────────
  async completeOnboarding(userId: string): Promise<Profile> {
    await this.ensureExists(userId);
    return this.prisma.profile.update({
      where: { userId },
      data: { onboardingCompletedAt: new Date() },
    });
  }

  // ── Private Helpers ───────────────────────────────────────────────────────

  private async ensureExists(userId: string): Promise<void> {
    const exists = await this.prisma.profile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Profile not found. Create it first.');
  }

  /**
   * Builds data object for profile creation — only includes defined fields
   * to satisfy exactOptionalPropertyTypes with Prisma.
   */
  private buildCreateData(dto: CreateProfileDto): Prisma.ProfileCreateWithoutUserInput {
    const data: Prisma.ProfileCreateWithoutUserInput = {};
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.gender !== undefined) data.gender = dto.gender;
    if (dto.dateOfBirth !== undefined) data.dateOfBirth = new Date(dto.dateOfBirth);
    if (dto.bio !== undefined) data.bio = dto.bio;
    if (dto.headline !== undefined) data.headline = dto.headline;
    if (dto.city !== undefined) data.city = dto.city;
    if (dto.state !== undefined) data.state = dto.state;
    if (dto.country !== undefined) data.country = dto.country;
    if (dto.college !== undefined) data.college = dto.college;
    if (dto.university !== undefined) data.university = dto.university;
    if (dto.degree !== undefined) data.degree = dto.degree;
    if (dto.branch !== undefined) data.branch = dto.branch;
    if (dto.yearOfStudy !== undefined) data.yearOfStudy = dto.yearOfStudy;
    if (dto.cgpa !== undefined) data.cgpa = dto.cgpa;
    if (dto.graduationYear !== undefined) data.graduationYear = dto.graduationYear;
    if (dto.linkedinUrl !== undefined) data.linkedinUrl = dto.linkedinUrl;
    if (dto.githubUrl !== undefined) data.githubUrl = dto.githubUrl;
    if (dto.portfolioUrl !== undefined) data.portfolioUrl = dto.portfolioUrl;
    return data;
  }

  private buildUpdateData(dto: UpdateProfileDto): Prisma.ProfileUpdateInput {
    const data: Prisma.ProfileUpdateInput = {};
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.gender !== undefined) data.gender = dto.gender;
    if (dto.dateOfBirth !== undefined) data.dateOfBirth = new Date(dto.dateOfBirth);
    if (dto.bio !== undefined) data.bio = dto.bio;
    if (dto.headline !== undefined) data.headline = dto.headline;
    if (dto.city !== undefined) data.city = dto.city;
    if (dto.state !== undefined) data.state = dto.state;
    if (dto.country !== undefined) data.country = dto.country;
    if (dto.college !== undefined) data.college = dto.college;
    if (dto.university !== undefined) data.university = dto.university;
    if (dto.degree !== undefined) data.degree = dto.degree;
    if (dto.branch !== undefined) data.branch = dto.branch;
    if (dto.yearOfStudy !== undefined) data.yearOfStudy = dto.yearOfStudy;
    if (dto.cgpa !== undefined) data.cgpa = dto.cgpa;
    if (dto.graduationYear !== undefined) data.graduationYear = dto.graduationYear;
    if (dto.linkedinUrl !== undefined) data.linkedinUrl = dto.linkedinUrl;
    if (dto.githubUrl !== undefined) data.githubUrl = dto.githubUrl;
    if (dto.portfolioUrl !== undefined) data.portfolioUrl = dto.portfolioUrl;
    return data;
  }

  private scorePersonal(profile: Profile): number {
    const fields = [profile.headline, profile.bio, profile.phone, profile.city, profile.country];
    return fields.filter(Boolean).length >= 3 ? 20 : 0;
  }

  private scoreEducation(profile: Profile): number {
    const fields = [
      profile.college,
      profile.degree,
      profile.branch,
      profile.graduationYear,
      profile.cgpa,
    ];
    return fields.filter((f) => f !== null && f !== undefined).length >= 3 ? 20 : 0;
  }

  private scoreCareer(pref: { preferredRoles: string[]; preferredWorkMode: string[] }): number {
    return pref.preferredRoles.length >= 1 && pref.preferredWorkMode.length >= 1 ? 20 : 0;
  }
}
