import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface SetAvailabilityDto {
  availableDays?: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  startTime?: string; // "09:00"
  endTime?: string; // "17:00"
  timezone?: string;
  bufferMinutes?: number;
  workingHoursOnly?: boolean;
}

@Injectable()
export class AvailabilityCalendarService {
  constructor(private readonly prisma: PrismaService) {}

  async setInterviewerAvailability(
    userId: string,
    recruiterOrgId: string,
    dto: SetAvailabilityDto,
  ) {
    return this.prisma.interviewerAvailability.upsert({
      where: { userId_recruiterOrgId: { userId, recruiterOrgId } },
      create: {
        userId,
        recruiterOrgId,
        availableDays: dto.availableDays || [1, 2, 3, 4, 5],
        startTime: dto.startTime || '09:00',
        endTime: dto.endTime || '17:00',
        timezone: dto.timezone || 'UTC',
        bufferMinutes: dto.bufferMinutes ?? 15,
        workingHoursOnly: dto.workingHoursOnly ?? true,
      },
      update: {
        ...(dto.availableDays && { availableDays: dto.availableDays }),
        ...(dto.startTime && { startTime: dto.startTime }),
        ...(dto.endTime && { endTime: dto.endTime }),
        ...(dto.timezone && { timezone: dto.timezone }),
        ...(dto.bufferMinutes !== undefined && { bufferMinutes: dto.bufferMinutes }),
        ...(dto.workingHoursOnly !== undefined && { workingHoursOnly: dto.workingHoursOnly }),
      },
    });
  }

  async getInterviewerAvailability(userId: string, recruiterOrgId: string) {
    const availability = await this.prisma.interviewerAvailability.findUnique({
      where: { userId_recruiterOrgId: { userId, recruiterOrgId } },
    });

    if (!availability) {
      return {
        userId,
        recruiterOrgId,
        availableDays: [1, 2, 3, 4, 5],
        startTime: '09:00',
        endTime: '17:00',
        timezone: 'UTC',
        bufferMinutes: 15,
        workingHoursOnly: true,
      };
    }

    return availability;
  }

  /**
   * Conflict Detection Engine
   * Checks overlapping interviews for candidate and interviewer list.
   */
  async detectConflicts(
    candidateId: string,
    interviewerUserIds: string[],
    scheduledStart: Date,
    scheduledEnd: Date,
    excludeInterviewId?: string,
  ): Promise<{ hasConflict: boolean; warnings: string[] }> {
    const warnings: string[] = [];

    if (scheduledStart >= scheduledEnd) {
      throw new BadRequestException('Scheduled end time must be after start time');
    }

    // 1. Check Candidate existing interviews overlap
    const whereCandidate: any = {
      candidateId,
      status: { notIn: ['CANCELLED', 'DECLINED'] },
      scheduledStart: { lt: scheduledEnd },
      scheduledEnd: { gt: scheduledStart },
    };
    if (excludeInterviewId) {
      whereCandidate.id = { not: excludeInterviewId };
    }

    const candidateOverlaps = await this.prisma.hiringInterview.findMany({
      where: whereCandidate,
    });

    if (candidateOverlaps.length > 0 && candidateOverlaps[0]) {
      warnings.push(
        `Candidate already has an interview scheduled between ${candidateOverlaps[0].scheduledStart.toISOString()} and ${candidateOverlaps[0].scheduledEnd.toISOString()}`,
      );
    }

    // 2. Check Interviewers existing interviews overlap
    for (const interviewerId of interviewerUserIds) {
      const interviewerWhere: any = {
        userId: interviewerId,
        interview: {
          status: { notIn: ['CANCELLED', 'DECLINED'] },
          scheduledStart: { lt: scheduledEnd },
          scheduledEnd: { gt: scheduledStart },
        },
      };

      if (excludeInterviewId) {
        interviewerWhere.interview.id = { not: excludeInterviewId };
      }

      const interviewerOverlaps = await this.prisma.interviewParticipant.findMany({
        where: interviewerWhere,
        include: { interview: true },
      });

      if (interviewerOverlaps.length > 0 && interviewerOverlaps[0]) {
        const title = (interviewerOverlaps[0] as any).interview?.title || 'Another Interview';
        warnings.push(`Interviewer ${interviewerId} has a schedule conflict with interview "${title}"`);
      }
    }

    return {
      hasConflict: warnings.length > 0,
      warnings,
    };
  }

  /**
   * Provider-Neutral CalendarEvent Abstraction
   */
  async createCalendarEvent(data: {
    interviewId?: string;
    recruiterOrgId: string;
    userId: string;
    provider?: string;
    title: string;
    start: Date;
    end: Date;
    meetingUrl?: string;
  }) {
    return this.prisma.calendarEvent.create({
      data: {
        interviewId: data.interviewId ?? null,
        recruiterOrgId: data.recruiterOrgId,
        userId: data.userId,
        provider: data.provider || 'INTERNAL',
        title: data.title,
        start: data.start,
        end: data.end,
        meetingUrl: data.meetingUrl ?? null,
        status: 'CONFIRMED',
      },
    });
  }

  async listCalendarEvents(userId: string, recruiterOrgId: string) {
    return this.prisma.calendarEvent.findMany({
      where: { userId, recruiterOrgId },
      orderBy: { start: 'asc' },
    });
  }
}
