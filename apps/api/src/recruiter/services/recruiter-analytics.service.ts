import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RecruiterAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Dashboard KPIs for a recruiter organization. */
  async getDashboardKpis(recruiterOrgId: string) {
    const [
      activeJobs,
      totalApplications,
      shortlistedCount,
      contactRequestsSent,
      contactRequestsApproved,
      pipelines,
    ] = await Promise.all([
      // Active published jobs
      this.prisma.jobPosting.count({
        where: { recruiterOrgId, recruiterStatus: 'PUBLISHED' },
      }),
      // Total applications on recruiter-owned jobs
      this.prisma.application.count({
        where: { job: { recruiterOrgId } },
      }),
      // Total shortlisted candidates
      this.prisma.shortlistCandidate.count({
        where: { shortlist: { recruiterOrgId } },
      }),
      // Contact requests sent
      this.prisma.contactRequest.count({
        where: { recruiterOrgId },
      }),
      // Approved contact requests
      this.prisma.contactRequest.count({
        where: { recruiterOrgId, status: 'APPROVED' },
      }),
      // Pipelines
      this.prisma.recruiterPipeline.count({ where: { recruiterOrgId } }),
    ]);

    return {
      activeJobs,
      totalApplications,
      shortlistedCount,
      contactRequestsSent,
      contactRequestsApproved,
      contactApprovalRate:
        contactRequestsSent > 0
          ? Math.round((contactRequestsApproved / contactRequestsSent) * 100)
          : 0,
      pipelines,
    };
  }

  /** Hiring funnel across all jobs for the recruiter org. */
  async getHiringFunnel(recruiterOrgId: string) {
    // Pipeline stage distribution
    const stageCounts = await this.prisma.recruitmentPipelineEntry.groupBy({
      by: ['stage'],
      where: {
        pipeline: { recruiterOrgId },
      },
      _count: { id: true },
    });

    const funnel: Record<string, number> = {};
    for (const item of stageCounts) {
      funnel[item.stage] = item._count.id;
    }

    // Application-to-shortlist conversion
    const applications = await this.prisma.application.count({
      where: { job: { recruiterOrgId } },
    });
    const shortlisted = await this.prisma.shortlistCandidate.count({
      where: { shortlist: { recruiterOrgId } },
    });

    return {
      stageFunnel: funnel,
      totalApplications: applications,
      shortlisted,
      applicationToShortlistRate:
        applications > 0 ? Math.round((shortlisted / applications) * 100) : 0,
    };
  }

  /** Per-job analytics for a specific recruiter job. */
  async getJobAnalytics(jobId: string, recruiterOrgId: string) {
    // Verify job belongs to org
    const job = await this.prisma.jobPosting.findFirst({
      where: { id: jobId, recruiterOrgId },
    });
    if (!job) return null;

    const [applications, shortlisted, contactRequests] = await Promise.all([
      this.prisma.application.count({ where: { jobId } }),
      this.prisma.shortlistCandidate.count({
        where: { shortlist: { recruiterOrgId }, stage: { not: 'WITHDRAWN' } },
      }),
      this.prisma.contactRequest.count({ where: { recruiterOrgId, jobId } }),
    ]);

    // Application status breakdown
    const statusBreakdown = await this.prisma.application.groupBy({
      by: ['status'],
      where: { jobId },
      _count: { id: true },
    });

    const byStatus: Record<string, number> = {};
    for (const item of statusBreakdown) {
      byStatus[item.status] = item._count.id;
    }

    return {
      job: { id: job.id, title: job.title, recruiterStatus: job.recruiterStatus },
      applications,
      shortlisted,
      contactRequests,
      applicationsByStatus: byStatus,
    };
  }

  /** Recent recruiter activity from audit log (last 50 events). */
  async getRecentActivity(recruiterOrgId: string) {
    return this.prisma.recruiterAuditEvent.findMany({
      where: { recruiterOrgId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        action: true,
        resourceType: true,
        resourceId: true,
        createdAt: true,
        user: { select: { firstName: true, lastName: true } },
      },
    });
  }

  /** Time-to-shortlist metric for the org (average hours from application to shortlist). */
  async getTimeToShortlist(recruiterOrgId: string) {
    // Get shortlisted candidates and their related applications
    const shortlisted = await this.prisma.shortlistCandidate.findMany({
      where: { shortlist: { recruiterOrgId } },
      select: { candidateId: true, addedAt: true, shortlist: { select: { recruiterOrgId: true } } },
      take: 100,
    });

    if (shortlisted.length === 0) return { averageHours: null, sampleSize: 0 };

    // Find corresponding applications
    const times: number[] = [];
    for (const sc of shortlisted) {
      const application = await this.prisma.application.findFirst({
        where: { userId: sc.candidateId, job: { recruiterOrgId } },
        select: { appliedAt: true },
      });
      if (application?.appliedAt) {
        const hours =
          (sc.addedAt.getTime() - application.appliedAt.getTime()) / (1000 * 60 * 60);
        if (hours >= 0) times.push(hours);
      }
    }

    const averageHours =
      times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null;

    return { averageHours, sampleSize: times.length };
  }
}
