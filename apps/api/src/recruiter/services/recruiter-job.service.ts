import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JobPostingStatus, RecruiterOrgVerificationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RecruiterOrgService } from './recruiter-org.service';

type RecruiterJobStatus = 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'CLOSED' | 'ARCHIVED';

export interface CreateRecruiterJobDto {
  title: string;
  description: string;
  responsibilities?: string[];
  requirements?: string[];
  requiredSkills?: string[];
  preferredSkills?: string[];
  location?: string;
  workMode?: string;
  duration?: string;
  stipend?: number;
  deadline?: Date;
  employmentType?: string;
  applicationUrl: string;
  department?: string;
  experienceLevel?: string;
}

@Injectable()
export class RecruiterJobService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly recruiterOrgService: RecruiterOrgService,
  ) {}

  // ─── Create Job (as DRAFT) ─────────────────────────────────────────────────

  async createJob(
    userId: string,
    recruiterOrgId: string,
    dto: CreateRecruiterJobDto,
  ) {
    // Validate required fields
    if (!dto.title?.trim()) throw new BadRequestException('Job title is required');
    if (!dto.description?.trim()) throw new BadRequestException('Job description is required');
    if (!dto.applicationUrl?.trim()) throw new BadRequestException('Application URL is required');

    const recruiterProfile = await this.prisma.recruiterProfile.findUnique({
      where: { userId },
    });
    if (!recruiterProfile) throw new NotFoundException('Recruiter profile not found');

    // Resolve company from the recruiter org's linked Organization
    const recruiterOrg = await this.prisma.recruiterOrganization.findUnique({
      where: { id: recruiterOrgId },
      include: { organization: true },
    });
    if (!recruiterOrg) throw new NotFoundException('Recruiter organization not found');

    // We need a Company record linked to this org — try to find/create by org name
    let company = await this.prisma.company.findFirst({
      where: { name: recruiterOrg.organization.name },
    });

    if (!company) {
      // Create a stub company record linked to the recruiter org
      company = await this.prisma.company.create({
        data: {
          name: recruiterOrg.organization.name,
          slug: `recruiter-${recruiterOrg.organizationId.slice(0, 8)}`,
          website: recruiterOrg.companyWebsite ?? recruiterOrg.organization.website,
          isActive: true,
        },
      });
    }

    // Generate a deterministic hash for deduplication
    const hashBase = `${recruiterOrgId}-${dto.title}-${dto.location ?? ''}-${Date.now()}`;
    const { createHash } = await import('crypto');
    const hash = createHash('sha256').update(hashBase).digest('hex');

    return this.prisma.jobPosting.create({
      data: {
        companyId: company.id,
        title: dto.title,
        description: dto.description,
        responsibilities: dto.responsibilities ?? [],
        requirements: dto.requirements ?? [],
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.workMode !== undefined && { workMode: dto.workMode as any }),
        ...(dto.stipend !== undefined && { stipend: dto.stipend }),
        ...(dto.deadline !== undefined && { deadline: dto.deadline }),
        ...(dto.employmentType !== undefined && { employmentType: dto.employmentType }),
        applicationUrl: dto.applicationUrl,
        ...(dto.department !== undefined && { department: dto.department }),
        ...(dto.experienceLevel !== undefined && { experienceLevel: dto.experienceLevel }),
        ...(dto.duration !== undefined && { duration: dto.duration }),
        status: JobPostingStatus.ACTIVE,
        source: 'CUSTOM' as any,
        hash,
        // Phase 22 ownership fields
        recruiterProfileId: recruiterProfile.id,
        recruiterOrgId,
        recruiterStatus: 'DRAFT',
      },
    });
  }

  // ─── List Recruiter's Jobs ─────────────────────────────────────────────────

  async listMyJobs(userId: string, recruiterOrgId: string) {
    const recruiterProfile = await this.prisma.recruiterProfile.findUnique({
      where: { userId },
    });
    if (!recruiterProfile) throw new NotFoundException('Recruiter profile not found');

    return this.prisma.jobPosting.findMany({
      where: { recruiterOrgId, recruiterProfileId: recruiterProfile.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listOrgJobs(recruiterOrgId: string) {
    return this.prisma.jobPosting.findMany({
      where: { recruiterOrgId },
      orderBy: { createdAt: 'desc' },
      include: {
        company: { select: { name: true, logoUrl: true } },
        applications: { select: { id: true } },
      },
    });
  }

  // ─── Get Single Job ────────────────────────────────────────────────────────

  async getJob(jobId: string, recruiterOrgId: string) {
    const job = await this.prisma.jobPosting.findFirst({
      where: { id: jobId, recruiterOrgId },
      include: {
        company: true,
        applications: { select: { id: true, status: true } },
      },
    });
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  // ─── Update Job ────────────────────────────────────────────────────────────

  async updateJob(
    jobId: string,
    recruiterOrgId: string,
    data: Partial<CreateRecruiterJobDto>,
  ) {
    const job = await this.prisma.jobPosting.findFirst({
      where: { id: jobId, recruiterOrgId },
    });
    if (!job) throw new NotFoundException('Job not found');

    // Only DRAFT and PAUSED jobs can be edited
    if (!['DRAFT', 'PAUSED'].includes(job.recruiterStatus ?? '')) {
      throw new ForbiddenException('Only DRAFT or PAUSED jobs can be edited');
    }

    return this.prisma.jobPosting.update({
      where: { id: jobId },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.responsibilities !== undefined && { responsibilities: data.responsibilities }),
        ...(data.requirements !== undefined && { requirements: data.requirements }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.workMode !== undefined && { workMode: data.workMode as any }),
        ...(data.stipend !== undefined && { stipend: data.stipend }),
        ...(data.deadline !== undefined && { deadline: data.deadline }),
        ...(data.employmentType !== undefined && { employmentType: data.employmentType }),
        ...(data.applicationUrl !== undefined && { applicationUrl: data.applicationUrl }),
        ...(data.department !== undefined && { department: data.department }),
        ...(data.experienceLevel !== undefined && { experienceLevel: data.experienceLevel }),
        ...(data.duration !== undefined && { duration: data.duration }),
      },
    });
  }

  // ─── Status Transitions ────────────────────────────────────────────────────

  private async transitionStatus(
    userId: string,
    jobId: string,
    recruiterOrgId: string,
    newStatus: RecruiterJobStatus,
    allowedCurrentStatuses: RecruiterJobStatus[],
  ) {
    const recruiterOrg = await this.prisma.recruiterOrganization.findUnique({
      where: { id: recruiterOrgId },
    });
    if (!recruiterOrg) throw new NotFoundException('Recruiter organization not found');

    if (newStatus === 'PUBLISHED') {
      if (recruiterOrg.verificationStatus !== RecruiterOrgVerificationStatus.VERIFIED) {
        throw new ForbiddenException({
          code: 'ORG_NOT_VERIFIED',
          message: 'Organization must be verified to publish jobs',
        });
      }
    }

    const job = await this.prisma.jobPosting.findFirst({
      where: { id: jobId, recruiterOrgId },
    });
    if (!job) throw new NotFoundException('Job not found');

    if (!allowedCurrentStatuses.includes(job.recruiterStatus as RecruiterJobStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${job.recruiterStatus} to ${newStatus}`,
      );
    }

    // Log audit event
    await this.recruiterOrgService.logAudit(
      userId,
      `JOB_${newStatus}`,
      'JobPosting',
      jobId,
      recruiterOrgId,
    );

    return this.prisma.jobPosting.update({
      where: { id: jobId },
      data: {
        recruiterStatus: newStatus,
        status: newStatus === 'PUBLISHED' ? JobPostingStatus.ACTIVE : JobPostingStatus.CLOSED,
      },
    });
  }

  async publishJob(userId: string, jobId: string, recruiterOrgId: string) {
    return this.transitionStatus(userId, jobId, recruiterOrgId, 'PUBLISHED', ['DRAFT', 'PAUSED']);
  }

  async pauseJob(userId: string, jobId: string, recruiterOrgId: string) {
    return this.transitionStatus(userId, jobId, recruiterOrgId, 'PAUSED', ['PUBLISHED']);
  }

  async closeJob(userId: string, jobId: string, recruiterOrgId: string) {
    return this.transitionStatus(userId, jobId, recruiterOrgId, 'CLOSED', [
      'PUBLISHED',
      'PAUSED',
    ]);
  }

  async archiveJob(userId: string, jobId: string, recruiterOrgId: string) {
    return this.transitionStatus(userId, jobId, recruiterOrgId, 'ARCHIVED', ['CLOSED']);
  }

  // ─── Applications for Recruiter-Owned Job ─────────────────────────────────

  async getJobApplications(jobId: string, recruiterOrgId: string) {
    // Verify job ownership
    const job = await this.prisma.jobPosting.findFirst({
      where: { id: jobId, recruiterOrgId },
    });
    if (!job) throw new NotFoundException('Job not found');

    return this.prisma.application.findMany({
      where: { jobId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profile: {
              select: {
                headline: true,
                city: true,
                country: true,
              },
            },
            discoverabilitySettings: {
              select: { discoverabilityLevel: true, profileVisible: true },
            },
          },
        },
      },
      orderBy: { appliedAt: 'desc' },
    });
  }
}
