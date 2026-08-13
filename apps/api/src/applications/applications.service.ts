import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ApplicationStatus, Prisma } from '@prisma/client';

import { NotificationsService } from '../notifications/services/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { EngagementTrackerService } from '../engagement/services/engagement-tracker.service';

import { ChangeApplicationStatusDto } from './dto/change-status.dto';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly engagementTracker: EngagementTrackerService,
  ) {}

  async create(userId: string, dto: CreateApplicationDto) {
    // Prevent duplicate application for same user + job
    const existing = await this.prisma.application.findUnique({
      where: { userId_jobId: { userId, jobId: dto.jobId } },
    });
    if (existing) {
      throw new ConflictException('You have already tracked an application for this job.');
    }

    // Get job to take snapshots
    const job = await this.prisma.jobPosting.findUnique({
      where: { id: dto.jobId },
      include: { company: true },
    });

    if (!job) {
      throw new NotFoundException('Job posting not found');
    }

    const application = await this.prisma.application.create({
      data: {
        userId,
        jobId: dto.jobId,
        status: dto.status ?? ApplicationStatus.APPLIED,
        appliedAt: dto.status === ApplicationStatus.APPLIED ? new Date() : null,
        applicationUrl: dto.applicationUrl ?? job.applicationUrl ?? null,
        notes: dto.notes ?? null,
        salaryExpectation: dto.salaryExpectation ?? null,
        source: dto.source ?? null,
        nextAction: dto.nextAction ?? null,
        nextActionDate: dto.nextActionDate ? new Date(dto.nextActionDate) : null,
        companyNameSnapshot: job.company.name,
        jobTitleSnapshot: job.title,
        locationSnapshot: job.location,
        events: {
          create: {
            toStatus: (dto.status ?? ApplicationStatus.APPLIED) as ApplicationStatus,
            note: 'Application created',
          },
        },
      },
    });

    // Handle reminders
    if (application.nextActionDate) {
      await this.scheduleReminder(
        userId,
        application.id,
        application.nextActionDate,
        application.nextAction ?? undefined,
      );
    }

    // Phase 16: Track engagement event
    await this.engagementTracker.trackAction(userId, 'APPLICATION_CREATED');

    return application;
  }

  async findAll(userId: string, query: { status?: string; cursor?: string; limit?: number }) {
    const take = Math.min(query.limit || 20, 50);
    const where: Prisma.ApplicationWhereInput = { userId };

    if (query.status) {
      where.status = query.status as ApplicationStatus;
    }

    const queryOpts: any = {
      where,
      take: take + 1, // +1 to check if there is a next page
      orderBy: { updatedAt: 'desc' },
      include: {
        job: { select: { company: { select: { logoUrl: true } } } }, // Fetch logo
      },
    };
    if (query.cursor) queryOpts.cursor = { id: query.cursor };

    const applications = await this.prisma.application.findMany(queryOpts);

    let nextCursor: string | null = null;
    if (applications.length > take) {
      const nextItem = applications.pop();
      nextCursor = nextItem?.id ?? null;
    }

    return { data: applications, nextCursor };
  }

  async findOne(userId: string, id: string) {
    const application = await this.prisma.application.findUnique({
      where: { id },
      include: {
        job: { include: { company: true } },
      },
    });

    if (!application || application.userId !== userId) {
      throw new NotFoundException('Application not found');
    }

    return application;
  }

  async getTimeline(userId: string, id: string) {
    await this.findOne(userId, id); // Ensure exists and belongs to user

    return this.prisma.applicationEvent.findMany({
      where: { applicationId: id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(userId: string, id: string, dto: UpdateApplicationDto) {
    await this.findOne(userId, id); // Auth check

    const data: any = {};
    if (dto.notes !== undefined) data.notes = dto.notes ?? null;
    if (dto.salaryExpectation !== undefined) data.salaryExpectation = dto.salaryExpectation ?? null;
    if (dto.source !== undefined) data.source = dto.source ?? null;
    if (dto.applicationUrl !== undefined) data.applicationUrl = dto.applicationUrl ?? null;
    if (dto.nextAction !== undefined) data.nextAction = dto.nextAction ?? null;
    if (dto.nextActionDate !== undefined)
      data.nextActionDate = dto.nextActionDate ? new Date(dto.nextActionDate) : null;

    const application = await this.prisma.application.update({
      where: { id },
      data,
    });

    // Reschedule reminder if date changed
    if (dto.nextActionDate) {
      await this.scheduleReminder(
        userId,
        application.id,
        new Date(dto.nextActionDate),
        application.nextAction ?? undefined,
      );
    }

    return application;
  }

  async changeStatus(userId: string, id: string, dto: ChangeApplicationStatusDto) {
    const application = await this.findOne(userId, id); // Auth check

    // Optionally add strict transition logic here
    if (application.status === dto.status) {
      return application; // No change
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.application.update({
        where: { id },
        data: {
          status: dto.status,
          appliedAt:
            dto.status === ApplicationStatus.APPLIED && !application.appliedAt
              ? new Date()
              : application.appliedAt,
          closedAt: [
            ApplicationStatus.REJECTED,
            ApplicationStatus.WITHDRAWN,
            ApplicationStatus.OFFER,
          ].includes(dto.status as any)
            ? new Date()
            : application.closedAt,
        },
      });

      await tx.applicationEvent.create({
        data: {
          applicationId: id,
          fromStatus: application.status,
          toStatus: dto.status,
          note: dto.note || `Status changed to ${dto.status}`,
        },
      });

      return updated;
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id); // Auth check

    await this.prisma.application.delete({
      where: { id },
    });
  }

  async getStats(userId: string) {
    const stats = await this.prisma.application.groupBy({
      by: ['status'],
      where: { userId },
      _count: true,
    });

    const summary = {
      totalApplications: 0,
      applied: 0,
      assessments: 0,
      interviews: 0,
      offers: 0,
      rejected: 0,
      withdrawn: 0,
      saved: 0,
      discovered: 0,
    };

    for (const stat of stats) {
      summary.totalApplications += stat._count;
      if (stat.status === ApplicationStatus.APPLIED) summary.applied = stat._count;
      else if (stat.status === ApplicationStatus.ASSESSMENT) summary.assessments = stat._count;
      else if (stat.status === ApplicationStatus.INTERVIEW) summary.interviews = stat._count;
      else if (stat.status === ApplicationStatus.OFFER) summary.offers = stat._count;
      else if (stat.status === ApplicationStatus.REJECTED) summary.rejected = stat._count;
      else if (stat.status === ApplicationStatus.WITHDRAWN) summary.withdrawn = stat._count;
      else if (stat.status === ApplicationStatus.SAVED) summary.saved = stat._count;
      else if (stat.status === ApplicationStatus.DISCOVERED) summary.discovered = stat._count;
    }

    // Derived metrics
    const activeApplications = summary.applied + summary.assessments + summary.interviews;
    const interviewRate =
      activeApplications > 0 ? (summary.interviews / activeApplications) * 100 : 0;
    const successRate =
      summary.totalApplications > 0 ? (summary.offers / summary.totalApplications) * 100 : 0;

    return {
      ...summary,
      interviewRate,
      successRate,
    };
  }

  private async scheduleReminder(
    userId: string,
    applicationId: string,
    date: Date,
    action?: string,
  ) {
    // Push reminder logic to the NotificationService
    // Only schedule if date is in the future
    if (date > new Date()) {
      try {
        await this.notificationsService.queueNotification({
          userId,
          type: 'SYSTEM' as any,
          title: 'Application Action Required',
          message: `Reminder: ${action || 'Follow up on your application'}`,
          channel: 'PUSH' as any, // Defaults or user prefs
          scheduledFor: date,
        });
      } catch (e) {
        // Log silently, don't fail application creation
        console.error(`Failed to schedule reminder for ${applicationId}`, e);
      }
    }
  }
}
