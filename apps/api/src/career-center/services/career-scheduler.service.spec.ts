import { Test, TestingModule } from '@nestjs/testing';

import { AiService } from '../../ai/services/ai.service';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';

import { CareerEventsService } from './career-events.service';
import { CareerSchedulerService } from './career-scheduler.service';
import { CommandCenterService } from './command-center.service';

describe('CareerSchedulerService', () => {
  let service: CareerSchedulerService;

  const mockPrisma = {
    jobPosting: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    assessmentAssignment: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    hiringInterview: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    application: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    userGoal: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    user: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  const mockEvents = {
    publish: jest.fn().mockResolvedValue({}),
  };

  const mockCommandCenter = {
    getCommandCenterData: jest.fn(),
  };

  const mockNotifications = {
    queueNotification: jest.fn(),
  };

  const mockAi = {
    aiProvider: {},
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CareerSchedulerService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CareerEventsService, useValue: mockEvents },
        { provide: CommandCenterService, useValue: mockCommandCenter },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: AiService, useValue: mockAi },
      ],
    }).compile();

    service = module.get<CareerSchedulerService>(CareerSchedulerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should check deadlines without throwing errors', async () => {
    await expect(service.checkDeadlines()).resolves.not.toThrow();
  });
});
