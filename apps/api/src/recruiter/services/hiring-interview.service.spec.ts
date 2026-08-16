import { Test, TestingModule } from '@nestjs/testing';
import { HiringInterviewService } from './hiring-interview.service';
import { AvailabilityCalendarService } from './availability-calendar.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/services/notifications.service';

describe('HiringInterviewService & Conflict Detection', () => {
  let interviewService: HiringInterviewService;
  let availabilityCalendar: AvailabilityCalendarService;

  const mockPrismaService = {
    recruiterProfile: {
      findUnique: jest.fn(),
    },
    hiringInterview: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    interviewParticipant: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    calendarEvent: {
      create: jest.fn(),
    },
  };

  const mockNotificationsService = {
    queueNotification: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HiringInterviewService,
        AvailabilityCalendarService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    interviewService = module.get<HiringInterviewService>(HiringInterviewService);
    availabilityCalendar = module.get<AvailabilityCalendarService>(AvailabilityCalendarService);
  });

  it('should detect schedule conflicts if candidate has overlapping interview', async () => {
    mockPrismaService.hiringInterview.findMany.mockResolvedValue([
      {
        id: 'int-1',
        scheduledStart: new Date('2026-09-01T10:00:00Z'),
        scheduledEnd: new Date('2026-09-01T11:00:00Z'),
      },
    ]);

    const res = await availabilityCalendar.detectConflicts(
      'cand-1',
      ['interviewer-1'],
      new Date('2026-09-01T10:30:00Z'),
      new Date('2026-09-01T11:30:00Z'),
    );

    expect(res.hasConflict).toBe(true);
    expect(res.warnings.length).toBeGreaterThan(0);
  });

  it('should schedule interview and queue notifications', async () => {
    mockPrismaService.recruiterProfile.findUnique.mockResolvedValue({ id: 'rec-1' });
    mockPrismaService.hiringInterview.findMany.mockResolvedValue([]);
    mockPrismaService.hiringInterview.create.mockResolvedValue({
      id: 'int-2',
      title: 'Technical Round 1',
      timezone: 'UTC',
      scheduledStart: new Date('2026-09-02T10:00:00Z'),
      scheduledEnd: new Date('2026-09-02T11:00:00Z'),
    });

    const res = await interviewService.createInterview('user-1', 'org-1', {
      candidateId: 'cand-1',
      title: 'Technical Round 1',
      scheduledStart: '2026-09-02T10:00:00Z',
      scheduledEnd: '2026-09-02T11:00:00Z',
    });

    expect(res.interview.id).toBe('int-2');
    expect(mockNotificationsService.queueNotification).toHaveBeenCalled();
  });
});
