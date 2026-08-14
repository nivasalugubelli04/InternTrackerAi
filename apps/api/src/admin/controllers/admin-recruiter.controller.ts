import { Controller, Get, Param, Patch, Post, Query, Request } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminAuditService } from '../services/admin-audit.service';
import { ForbiddenException } from '@nestjs/common';

/**
 * Admin controller for recruiter moderation.
 * All endpoints are ADMIN/SUPER_ADMIN only (enforced by global JwtAuthGuard + role check).
 */
@Controller('api/v1/admin')
export class AdminRecruiterController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  private assertAdmin(req: any) {
    if (![UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(req.user.role)) {
      throw new ForbiddenException('Admin access required');
    }
  }

  // ─── Recruiter Organizations ───────────────────────────────────────────────

  @Get('recruiter-organizations')
  async listRecruiterOrgs(@Request() req: any, @Query() query: any) {
    this.assertAdmin(req);
    return this.prisma.recruiterOrganization.findMany({
      where: query.verificationStatus ? { verificationStatus: query.verificationStatus } : {},
      include: { organization: { select: { name: true, type: true, website: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  @Post('recruiter-organizations/:id/verify')
  async verifyRecruiterOrg(@Request() req: any, @Param('id') id: string) {
    this.assertAdmin(req);

    const org = await this.prisma.recruiterOrganization.findUnique({ where: { id } });
    if (!org) throw new ForbiddenException('Recruiter organization not found');

    const updated = await this.prisma.recruiterOrganization.update({
      where: { id },
      data: {
        verificationStatus: 'VERIFIED',
        verifiedAt: new Date(),
        verifiedByAdminId: req.user.id,
      },
      include: { organization: { select: { name: true } } },
    });

    await this.audit.logAction(req.user.id, 'RECRUITER_ORG_VERIFIED', 'RecruiterOrganization', id);
    return updated;
  }

  @Post('recruiter-organizations/:id/reject')
  async rejectRecruiterOrg(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    this.assertAdmin(req);

    const updated = await this.prisma.recruiterOrganization.update({
      where: { id },
      data: { verificationStatus: 'REJECTED' },
    });

    await this.audit.logAction(req.user.id, 'RECRUITER_ORG_REJECTED', 'RecruiterOrganization', id);
    return updated;
  }

  @Post('recruiter-organizations/:id/suspend')
  async suspendRecruiterOrg(@Request() req: any, @Param('id') id: string) {
    this.assertAdmin(req);

    const updated = await this.prisma.recruiterOrganization.update({
      where: { id },
      data: { verificationStatus: 'SUSPENDED' },
    });

    await this.audit.logAction(req.user.id, 'RECRUITER_ORG_SUSPENDED', 'RecruiterOrganization', id);
    return updated;
  }

  @Post('recruiter-organizations/:id/set-under-review')
  async setUnderReview(@Request() req: any, @Param('id') id: string) {
    this.assertAdmin(req);
    const updated = await this.prisma.recruiterOrganization.update({
      where: { id },
      data: { verificationStatus: 'UNDER_REVIEW' },
    });
    await this.audit.logAction(req.user.id, 'RECRUITER_ORG_UNDER_REVIEW', 'RecruiterOrganization', id);
    return updated;
  }

  // ─── Recruiter Profiles ────────────────────────────────────────────────────

  @Get('recruiters')
  async listRecruiters(@Request() req: any, @Query() query: any) {
    this.assertAdmin(req);
    return this.prisma.recruiterProfile.findMany({
      where: query.recruiterOrgId ? { recruiterOrgId: query.recruiterOrgId } : {},
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        recruiterOrg: { include: { organization: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  @Patch('recruiters/:id/status')
  async updateRecruiterStatus(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    this.assertAdmin(req);

    const profile = await this.prisma.recruiterProfile.findUnique({ where: { id } });
    if (!profile) throw new ForbiddenException('Recruiter profile not found');

    const updated = await this.prisma.recruiterProfile.update({
      where: { id },
      data: { isSuspended: !profile.isSuspended },
    });

    await this.audit.logAction(req.user.id, 'RECRUITER_STATUS_CHANGED', 'RecruiterProfile', id, {
      isSuspended: updated.isSuspended,
    });
    return updated;
  }

  // ─── Reports ───────────────────────────────────────────────────────────────

  @Get('recruiter-reports')
  async listReports(@Request() req: any, @Query() query: any) {
    this.assertAdmin(req);
    const where: any = {};
    if (query.resolved !== undefined) {
      where.resolved = query.resolved === 'true';
    }

    return this.prisma.recruiterReport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  @Post('recruiter-reports/:id/resolve')
  async resolveReport(@Request() req: any, @Param('id') id: string) {
    this.assertAdmin(req);

    const updated = await this.prisma.recruiterReport.update({
      where: { id },
      data: { resolved: true, resolvedAt: new Date(), resolvedById: req.user.id },
    });

    await this.audit.logAction(req.user.id, 'RECRUITER_REPORT_RESOLVED', 'RecruiterReport', id);
    return updated;
  }

  // ─── Audit Events ──────────────────────────────────────────────────────────

  @Get('recruiter-audit')
  async getRecruiterAuditEvents(@Request() req: any, @Query() query: any) {
    this.assertAdmin(req);
    return this.prisma.recruiterAuditEvent.findMany({
      where: query.orgId ? { recruiterOrgId: query.orgId } : {},
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }
}
