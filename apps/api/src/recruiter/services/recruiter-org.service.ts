import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OrganizationType,
  RecruiterOrgVerificationStatus,
  RecruiterRole,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

export interface CreateRecruiterOrgDto {
  /** Must match an existing Organization.id (Phase 17) */
  organizationId: string;
  companyWebsite?: string;
  linkedinUrl?: string;
  taxId?: string;
}

export interface CreateRecruiterProfileDto {
  userId: string;
  recruiterOrgId: string;
  recruiterRole?: RecruiterRole;
  jobTitle?: string;
  department?: string;
}

@Injectable()
export class RecruiterOrgService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Organization ─────────────────────────────────────────────────────────

  /**
   * Creates a RecruiterOrganization record linked to an existing Phase 17
   * Organization. One Organization → one RecruiterOrganization.
   */
  async createRecruiterOrg(dto: CreateRecruiterOrgDto) {
    const org = await this.prisma.organization.findUnique({
      where: { id: dto.organizationId },
    });
    if (!org) throw new NotFoundException('Organization not found');

    const existing = await this.prisma.recruiterOrganization.findUnique({
      where: { organizationId: dto.organizationId },
    });
    if (existing)
      throw new ConflictException('A recruiter organization already exists for this organization');

    // Extend type to include COMPANY_RECRUITER
    if (!([OrganizationType.ENTERPRISE, OrganizationType.OTHER] as string[]).includes(org.type)) {
      // Allow all types — the admin will verify appropriateness
    }

    return this.prisma.recruiterOrganization.create({
      data: {
        organizationId: dto.organizationId,
        companyWebsite: dto.companyWebsite ?? null,
        linkedinUrl: dto.linkedinUrl ?? null,
        taxId: dto.taxId ?? null,
        verificationStatus: RecruiterOrgVerificationStatus.PENDING,
      },
      include: { organization: true },
    });
  }

  async getRecruiterOrg(id: string) {
    const org = await this.prisma.recruiterOrganization.findUnique({
      where: { id },
      include: { organization: true },
    });
    if (!org) throw new NotFoundException('Recruiter organization not found');
    return org;
  }

  async getRecruiterOrgByOrganizationId(organizationId: string) {
    const org = await this.prisma.recruiterOrganization.findUnique({
      where: { organizationId },
      include: { organization: true },
    });
    if (!org) throw new NotFoundException('Recruiter organization not found');
    return org;
  }

  // ─── Profile ───────────────────────────────────────────────────────────────

  async createRecruiterProfile(dto: CreateRecruiterProfileDto) {
    const existing = await this.prisma.recruiterProfile.findUnique({
      where: { userId: dto.userId },
    });
    if (existing) throw new ConflictException('Recruiter profile already exists for this user');

    const recruiterOrg = await this.prisma.recruiterOrganization.findUnique({
      where: { id: dto.recruiterOrgId },
    });
    if (!recruiterOrg) throw new NotFoundException('Recruiter organization not found');

    return this.prisma.recruiterProfile.create({
      data: {
        userId: dto.userId,
        recruiterOrgId: dto.recruiterOrgId,
        recruiterRole: RecruiterRole.RECRUITER,
        jobTitle: dto.jobTitle ?? null,
        department: dto.department ?? null,
        isVerified: false,
        isSuspended: false,
      },
      include: { recruiterOrg: { include: { organization: true } } },
    });
  }

  async getMyRecruiterProfile(userId: string) {
    const profile = await this.prisma.recruiterProfile.findUnique({
      where: { userId },
      include: { recruiterOrg: { include: { organization: true } } },
    });
    if (!profile) throw new NotFoundException('Recruiter profile not found');
    return profile;
  }

  async updateMyRecruiterProfile(
    userId: string,
    data: Partial<{ jobTitle: string; department: string }>,
  ) {
    const profile = await this.prisma.recruiterProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Recruiter profile not found');
    return this.prisma.recruiterProfile.update({
      where: { userId },
      data,
      include: { recruiterOrg: { include: { organization: true } } },
    });
  }

  // ─── Audit ─────────────────────────────────────────────────────────────────

  async logAudit(
    recruiterUserId: string,
    action: string,
    resourceType: string,
    resourceId?: string,
    recruiterOrgId?: string,
    metadata?: Record<string, unknown>,
  ) {
    return this.prisma.recruiterAuditEvent.create({
      data: {
        userId: recruiterUserId,
        action,
        resourceType,
        ...(resourceId !== undefined && { resourceId }),
        ...(recruiterOrgId !== undefined && { recruiterOrgId }),
        ...(metadata !== undefined && { metadata: metadata as any }),
      },
    });
  }

  // ─── RBAC helpers ──────────────────────────────────────────────────────────

  /** Returns true if the recruiter has at least one of the required roles. */
  hasRole(profile: { recruiterRole: RecruiterRole }, ...roles: RecruiterRole[]): boolean {
    return roles.includes(profile.recruiterRole);
  }

  assertAdminRole(profile: { recruiterRole: RecruiterRole }) {
    if (
      !this.hasRole(
        profile,
        RecruiterRole.RECRUITER_ADMIN,
        RecruiterRole.COMPANY_ADMIN,
      )
    ) {
      throw new ForbiddenException({
        code: 'INSUFFICIENT_RECRUITER_ROLE',
        message: 'RECRUITER_ADMIN or COMPANY_ADMIN role required',
      });
    }
  }

  assertNotSuspended(profile: { isSuspended: boolean }) {
    if (profile.isSuspended) {
      throw new ForbiddenException({
        code: 'RECRUITER_SUSPENDED',
        message: 'Your recruiter account has been suspended',
      });
    }
  }

  // ─── Org member management ─────────────────────────────────────────────────

  async listOrgMembers(recruiterOrgId: string) {
    return this.prisma.recruiterProfile.findMany({
      where: { recruiterOrgId },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    });
  }

  async updateMemberRole(
    adminProfile: { recruiterRole: RecruiterRole; recruiterOrgId: string },
    targetUserId: string,
    newRole: RecruiterRole,
  ) {
    this.assertAdminRole(adminProfile);

    const target = await this.prisma.recruiterProfile.findFirst({
      where: { userId: targetUserId, recruiterOrgId: adminProfile.recruiterOrgId },
    });
    if (!target) throw new NotFoundException('Member not found in your organization');

    return this.prisma.recruiterProfile.update({
      where: { id: target.id },
      data: { recruiterRole: newRole },
    });
  }
}
