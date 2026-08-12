import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import type { Profile, UserSkill } from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

import { AddSkillDto } from './dto/add-skill.dto';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import type { ProfileCompletion, ProfileWithSkills } from './profile.service';
import { ProfileService } from './profile.service';

@ApiTags('Profile')
@ApiBearerAuth()
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  // ── GET /profile ──────────────────────────────────────────────────────────
  @Get()
  @ApiOperation({ summary: 'Get own profile (with skills)' })
  @ApiResponse({ status: 200, description: 'Profile retrieved' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  getProfile(@CurrentUser() user: JwtPayload): Promise<ProfileWithSkills> {
    return this.profileService.findByUserId(user.sub);
  }

  // ── POST /profile ─────────────────────────────────────────────────────────
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create profile (first time only)' })
  @ApiResponse({ status: 201, description: 'Profile created' })
  @ApiResponse({ status: 409, description: 'Profile already exists' })
  createProfile(@CurrentUser() user: JwtPayload, @Body() dto: CreateProfileDto): Promise<Profile> {
    return this.profileService.create(user.sub, dto);
  }

  // ── PATCH /profile ────────────────────────────────────────────────────────
  @Patch()
  @ApiOperation({ summary: 'Update profile fields (partial update)' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  updateProfile(@CurrentUser() user: JwtPayload, @Body() dto: UpdateProfileDto): Promise<Profile> {
    return this.profileService.update(user.sub, dto);
  }

  // ── GET /profile/completion ───────────────────────────────────────────────
  @Get('completion')
  @ApiOperation({ summary: 'Get profile completion percentage' })
  @ApiResponse({ status: 200, description: 'Completion data returned' })
  getCompletion(@CurrentUser() user: JwtPayload): Promise<ProfileCompletion> {
    return this.profileService.getCompletion(user.sub);
  }

  // ── POST /profile/skills ──────────────────────────────────────────────────
  @Post('skills')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a skill to profile (upserts proficiency)' })
  @ApiResponse({ status: 201, description: 'Skill added' })
  addSkill(@CurrentUser() user: JwtPayload, @Body() dto: AddSkillDto): Promise<UserSkill> {
    return this.profileService.addSkill(user.sub, dto);
  }

  // ── DELETE /profile/skills/:skillId ──────────────────────────────────────
  @Delete('skills/:skillId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a skill from profile' })
  @ApiResponse({ status: 204, description: 'Skill removed' })
  @ApiResponse({ status: 404, description: 'Skill not associated with profile' })
  async removeSkill(
    @CurrentUser() user: JwtPayload,
    @Param('skillId') skillId: string,
  ): Promise<void> {
    await this.profileService.removeSkill(user.sub, skillId);
  }

  // ── POST /profile/complete-onboarding ────────────────────────────────────
  @Post('complete-onboarding')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark onboarding as complete' })
  completeOnboarding(@CurrentUser() user: JwtPayload): Promise<Profile> {
    return this.profileService.completeOnboarding(user.sub);
  }
}
