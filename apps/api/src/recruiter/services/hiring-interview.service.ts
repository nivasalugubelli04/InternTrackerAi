import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  HiringInterviewLocationType,
  HiringInterviewStatus,
  ParticipantRole,
  ParticipantStatus,
  RecruiterInterviewType,
} from '@prisma/client';
import { NotificationChannel, NotificationType } from '../../notifications/enums/notification.enums';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AvailabilityCalendarService } from './availability-calendar.service';

export interface CreateInterviewDto {
  candidateId: string;
  jobId?: string;
  type?: RecruiterInterviewType;
  title: string;
  description?: string;
  scheduledStart: string; // ISO String
  scheduledEnd: string; // ISO String
  timezone?: string;
  locationType?: HiringInterviewLocationType;
  meetingUrl?: string;
  providerName?: string;
  physicalLocation?: string;
  instructions?: string;
  interviewerUserIds?: string[]; // Panel interviewers
}

@Injectable()
export class HiringInterviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availabilityCalendar: AvailabilityCalendarService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createInterview(userId: string, recruiterOrgId: string, dto: CreateInterviewDto) {
    const profile = await this.prisma.recruiterProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Recruiter profile not found');

    const start = new Date(dto.scheduledStart);
    const end = new Date(dto.scheduledEnd);
    const interviewers = dto.interviewerUserIds || [userId];

    // Conflict detection check
    const conflictCheck = await this.availabilityCalendar.detectConflicts(
      dto.candidateId,
      interviewers,
      start,
      end,
    );

    const interview = await this.prisma.hiringInterview.create({
      data: {
        candidateId: dto.candidateId,
        jobId: dto.jobId ?? null,
        recruiterOrgId,
        createdBy: profile.id,
        type: dto.type ?? RecruiterInterviewType.TECHNICAL,
        title: dto.title,
        description: dto.description ?? null,
        scheduledStart: start,
        scheduledEnd: end,
        timezone: dto.timezone || 'UTC',
        locationType: dto.locationType ?? HiringInterviewLocationType.ONLINE,
        meetingUrl: dto.meetingUrl ?? null,
        providerName: dto.providerName ?? null,
        physicalLocation: dto.physicalLocation ?? null,
        instructions: dto.instructions ?? null,
        status: HiringInterviewStatus.SCHEDULED,
        participants: {
          create: interviewers.map((id, idx) => ({
            userId: id,
            role: idx === 0 ? ParticipantRole.PRIMARY : ParticipantRole.PANEL,
            status: ParticipantStatus.INVITED,
          })),
        },
        events: {
          create: {
            eventType: 'SCHEDULED',
            actorId: userId,
            details: { conflictWarnings: conflictCheck.warnings },
          },
        },
      },
      include: { participants: true, candidate: true },
    });

    // Create Calendar Event abstraction for candidate
    await this.availabilityCalendar.createCalendarEvent({
      interviewId: interview.id,
      recruiterOrgId,
      userId: dto.candidateId,
      title: `Interview: ${interview.title}`,
      start,
      end,
      ...(interview.meetingUrl && { meetingUrl: interview.meetingUrl }),
    });

    // Queue Notifications via Phase 6 Notification Engine (Instant confirmation + 24h & 1h reminders)
    await this.notificationsService.queueNotification({
      userId: dto.candidateId,
      type: NotificationType.INSTANT_ALERT,
      title: `Interview Scheduled: ${interview.title}`,
      message: `You have an interview scheduled for ${start.toLocaleString()} (${interview.timezone}).`,
      channel: NotificationChannel.EMAIL,
    });

    const hours24Before = new Date(start.getTime() - 24 * 60 * 60 * 1000);
    if (hours24Before > new Date()) {
      await this.notificationsService.queueNotification({
        userId: dto.candidateId,
        type: NotificationType.INSTANT_ALERT,
        title: `Reminder: Interview in 24 Hours`,
        message: `Your interview "${interview.title}" starts in 24 hours.`,
        channel: NotificationChannel.EMAIL,
        scheduledFor: hours24Before,
      });
    }

    const hour1Before = new Date(start.getTime() - 1 * 60 * 60 * 1000);
    if (hour1Before > new Date()) {
      await this.notificationsService.queueNotification({
        userId: dto.candidateId,
        type: NotificationType.INSTANT_ALERT,
        title: `Reminder: Interview in 1 Hour`,
        message: `Your interview "${interview.title}" starts in 1 hour. Link: ${interview.meetingUrl || 'See platform'}`,
        channel: NotificationChannel.PUSH,
        scheduledFor: hour1Before,
      });
    }

    return { interview, conflictWarnings: conflictCheck.warnings };
  }

  async listInterviews(recruiterOrgId: string) {
    return this.prisma.hiringInterview.findMany({
      where: { recruiterOrgId },
      include: {
        candidate: { select: { id: true, firstName: true, lastName: true, email: true } },
        job: { select: { id: true, title: true } },
        participants: { select: { id: true, userId: true, role: true, status: true } },
        feedbackList: { select: { id: true, rating: true, recommendation: true } },
      },
      orderBy: { scheduledStart: 'asc' },
    });
  }

  async getInterview(id: string, recruiterOrgId?: string) {
    const interview = await this.prisma.hiringInterview.findFirst({
      where: { id, ...(recruiterOrgId ? { recruiterOrgId } : {}) },
      include: {
        candidate: { select: { id: true, firstName: true, lastName: true, email: true } },
        job: true,
        participants: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } },
        events: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!interview) throw new NotFoundException('Interview not found');
    return interview;
  }

  async rescheduleInterview(
    id: string,
    recruiterOrgId: string,
    userId: string,
    newStartStr: string,
    newEndStr: string,
    reason?: string,
  ) {
    const interview = await this.getInterview(id, recruiterOrgId);
    const newStart = new Date(newStartStr);
    const newEnd = new Date(newEndStr);

    const participantIds = interview.participants.map((p) => p.userId);
    const conflictCheck = await this.availabilityCalendar.detectConflicts(
      interview.candidateId,
      participantIds,
      newStart,
      newEnd,
      id,
    );

    const updated = await this.prisma.hiringInterview.update({
      where: { id },
      data: {
        scheduledStart: newStart,
        scheduledEnd: newEnd,
        status: HiringInterviewStatus.SCHEDULED,
        rescheduleReason: reason ?? null,
        rescheduleRequestedBy: 'RECRUITER',
        events: {
          create: {
            eventType: 'RESCHEDULED',
            actorId: userId,
            details: { newStart, newEnd, reason },
          },
        },
      },
    });

    // Notify candidate of update
    await this.notificationsService.queueNotification({
      userId: interview.candidateId,
      type: NotificationType.INSTANT_ALERT,
      title: `Interview Rescheduled: ${interview.title}`,
      message: `Your interview has been rescheduled to ${newStart.toLocaleString()} (${interview.timezone}).`,
      channel: NotificationChannel.EMAIL,
    });

    return { interview: updated, conflictWarnings: conflictCheck.warnings };
  }

  async cancelInterview(id: string, recruiterOrgId: string, userId: string, reason?: string) {
    const interview = await this.getInterview(id, recruiterOrgId);

    const updated = await this.prisma.hiringInterview.update({
      where: { id },
      data: {
        status: HiringInterviewStatus.CANCELLED,
        events: {
          create: {
            eventType: 'CANCELLED',
            actorId: userId,
            details: { reason },
          },
        },
      },
    });

    await this.notificationsService.queueNotification({
      userId: interview.candidateId,
      type: NotificationType.INSTANT_ALERT,
      title: `Interview Cancelled: ${interview.title}`,
      message: `Your interview "${interview.title}" has been cancelled. Reason: ${reason || 'No reason specified'}`,
      channel: NotificationChannel.EMAIL,
    });

    return updated;
  }
}
