import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { AiService } from '../../ai/services/ai.service';
import { FrequencyLimiterService } from '../../notifications/services/frequency-limiter.service';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { PreferenceValidatorService } from '../../notifications/services/preference-validator.service';
import { PrismaService } from '../../prisma/prisma.service';

import { ActionOrchestrationService } from './action-orchestration.service';
import { EventProcessingService } from './event-processing.service';

describe('EventProcessingService', () => {
  let service: EventProcessingService;

  const mockPrisma = {
    careerEvent: {
      create: jest
        .fn()
        .mockImplementation((args) => Promise.resolve({ id: 'event-123', ...args.data })),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    agentActivity: {
      create: jest.fn().mockResolvedValue({}),
    },
    automationPreference: {
      findUnique: jest.fn().mockResolvedValue({
        proactiveAssistanceEnabled: true,
        automationIntensity: 'PROACTIVE',
        opportunityAlerts: true,
        interviewReminders: true,
        followUpReminders: true,
        learningReminders: true,
        careerInsights: true,
        companyAlerts: true,
        dailyDigest: true,
      }),
      create: jest.fn().mockResolvedValue({}),
    },
    eventProcessingLog: {
      upsert: jest.fn().mockResolvedValue({}),
    },
    careerAction: {
      create: jest
        .fn()
        .mockImplementation((args) => Promise.resolve({ id: 'action-123', ...args.data })),
    },
    jobPosting: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
  };

  const mockNotifications = {
    queueNotification: jest.fn().mockResolvedValue({}),
  };

  const mockPreferenceValidator = {
    checkQuietHours: jest.fn().mockResolvedValue({ isQuietHours: false }),
  };

  const mockFrequencyLimiter = {
    checkLimit: jest.fn().mockResolvedValue({ passed: true }),
  };

  const mockAi = {
    aiProvider: {
      generateStructuredOutput: jest.fn(),
    },
  };

  const mockConfig = {
    get: jest.fn().mockReturnValue({ enabled: false }),
  };

  const mockActionOrch = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventProcessingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: PreferenceValidatorService, useValue: mockPreferenceValidator },
        { provide: FrequencyLimiterService, useValue: mockFrequencyLimiter },
        { provide: AiService, useValue: mockAi },
        { provide: ActionOrchestrationService, useValue: mockActionOrch },
      ],
    }).compile();

    service = module.get<EventProcessingService>(EventProcessingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should process a valid event and generate action and notifications', async () => {
    const payload = {
      userId: 'user-123',
      eventType: 'FOLLOW_UP_DUE',
      source: 'Deadline Watcher',
      entityType: 'Application',
      entityId: 'app-123',
    };

    const result = await service.processEvent(payload);
    expect(result.success).toBe(true);
    expect(result.status).toBe('PROCESSED');
    expect(mockPrisma.careerEvent.create).toHaveBeenCalled();
    expect(mockPrisma.careerAction.create).toHaveBeenCalled();
    expect(mockNotifications.queueNotification).toHaveBeenCalled();
  });
});
