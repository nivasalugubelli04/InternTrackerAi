/**
 * Phase 6 — NotificationDecisionService Unit Tests
 */

import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { DeliveryDecision, NotificationChannel } from '../enums/notification.enums';
import type { RecommendationContext } from '../interfaces/notification-decision.interface';

import { FrequencyLimiterService } from './frequency-limiter.service';
import { NotificationDecisionService } from './notification-decision.service';
import { PreferenceValidatorService } from './preference-validator.service';
import { PriorityCalculatorService } from './priority-calculator.service';

const mockConfig = {
  get: jest.fn((key: string) => {
    const cfg: Record<string, unknown> = {
      notifications: {
        thresholds: {
          instantPushEmail: 90,
          pushOnly: 80,
          emailOnly: 70,
          digestOnly: 50,
        },
        maxRetries: 3,
        retryBaseDelayMs: 5000,
        frequencyLimits: { maxPerDay: 10, maxInstantPerDay: 5 },
      },
    };
    return cfg[key];
  }),
};

const mockRedisClient = {
  exists: jest.fn().mockResolvedValue(0),
  set: jest.fn().mockResolvedValue('OK'),
};

const mockRedis = {
  getClient: jest.fn().mockReturnValue(mockRedisClient),
};

const mockPrisma = {
  recommendation: {
    findFirst: jest.fn().mockResolvedValue({ isDismissed: false }),
  },
};

const mockPreferenceValidator = {
  hasAnyChannelEnabled: jest.fn().mockResolvedValue({ passed: true }),
  checkQuietHours: jest.fn().mockResolvedValue({ isQuietHours: false }),
  validateChannel: jest.fn().mockResolvedValue({ passed: true }),
};

const mockFrequencyLimiter = {
  checkLimit: jest.fn().mockResolvedValue({ passed: true }),
};

const mockPriorityCalc = {
  calculate: jest.fn().mockReturnValue('HIGH'),
};

const baseContext = (): RecommendationContext => ({
  userId: 'user-uuid-1',
  jobId: 'job-uuid-1',
  matchScore: 95,
  isCompanyTracked: true,
  companyTrackingPriority: 'HIGH',
  recommendationId: 'rec-uuid-1',
});

describe('NotificationDecisionService', () => {
  let service: NotificationDecisionService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationDecisionService,
        { provide: ConfigService, useValue: mockConfig },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: PriorityCalculatorService, useValue: mockPriorityCalc },
        { provide: PreferenceValidatorService, useValue: mockPreferenceValidator },
        { provide: FrequencyLimiterService, useValue: mockFrequencyLimiter },
      ],
    }).compile();

    service = module.get<NotificationDecisionService>(NotificationDecisionService);
  });

  describe('evaluate()', () => {
    it('returns INSTANT with PUSH + EMAIL when score ≥ 90', async () => {
      const plan = await service.evaluate(baseContext());
      expect(plan.decision).toBe(DeliveryDecision.INSTANT);
      expect(plan.channels).toContain(NotificationChannel.PUSH);
      expect(plan.channels).toContain(NotificationChannel.EMAIL);
    });

    it('returns INSTANT with PUSH only when score is 80-89', async () => {
      const plan = await service.evaluate({ ...baseContext(), matchScore: 85 });
      expect(plan.decision).toBe(DeliveryDecision.INSTANT);
      expect(plan.channels).toEqual([NotificationChannel.PUSH]);
    });

    it('returns INSTANT with EMAIL only when score is 70-79', async () => {
      const plan = await service.evaluate({ ...baseContext(), matchScore: 74 });
      expect(plan.decision).toBe(DeliveryDecision.INSTANT);
      expect(plan.channels).toEqual([NotificationChannel.EMAIL]);
    });

    it('returns DAILY_DIGEST when score is 50-69', async () => {
      const plan = await service.evaluate({ ...baseContext(), matchScore: 55 });
      expect(plan.decision).toBe(DeliveryDecision.DAILY_DIGEST);
      expect(plan.channels).toHaveLength(0);
    });

    it('returns SKIP when score < 50', async () => {
      const plan = await service.evaluate({ ...baseContext(), matchScore: 40 });
      expect(plan.decision).toBe(DeliveryDecision.SKIP);
    });

    it('returns SKIP when all channels are disabled', async () => {
      mockPreferenceValidator.hasAnyChannelEnabled.mockResolvedValueOnce({
        passed: false,
        reason: 'All channels disabled',
      });
      const plan = await service.evaluate(baseContext());
      expect(plan.decision).toBe(DeliveryDecision.SKIP);
    });

    it('returns SKIP when recommendation is dismissed', async () => {
      mockPrisma.recommendation.findFirst.mockResolvedValueOnce({ isDismissed: true });
      const plan = await service.evaluate(baseContext());
      expect(plan.decision).toBe(DeliveryDecision.SKIP);
    });

    it('returns SKIP for duplicate (already notified)', async () => {
      mockRedisClient.exists.mockResolvedValueOnce(1);
      const plan = await service.evaluate(baseContext());
      expect(plan.decision).toBe(DeliveryDecision.SKIP);
    });

    it('downgrades to DAILY_DIGEST when frequency limit reached', async () => {
      mockFrequencyLimiter.checkLimit.mockResolvedValueOnce({
        passed: false,
        reason: 'Limit reached',
      });
      const plan = await service.evaluate(baseContext());
      expect(plan.decision).toBe(DeliveryDecision.DAILY_DIGEST);
    });

    it('sets scheduledFor when inside quiet hours', async () => {
      const resumesAt = new Date(Date.now() + 3600 * 1000);
      mockPreferenceValidator.checkQuietHours.mockResolvedValueOnce({
        isQuietHours: true,
        resumesAt,
      });
      const plan = await service.evaluate(baseContext());
      expect(plan.scheduledFor).toEqual(resumesAt);
    });
  });
});
