/**
 * Phase 6 — FrequencyLimiterService Unit Tests
 */

import { ConfigService } from '@nestjs/config';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { NotificationChannel } from '../enums/notification.enums';

import { FrequencyLimiterService } from './frequency-limiter.service';

const mockRedisGet = jest.fn();
const mockRedisExists = jest.fn();
const mockPipeline = {
  incr: jest.fn().mockReturnThis(),
  expire: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue([]),
};

const mockRedis = {
  getClient: jest.fn().mockReturnValue({
    get: mockRedisGet,
    exists: mockRedisExists,
    pipeline: jest.fn().mockReturnValue(mockPipeline),
  }),
};

const mockPrisma = {
  notificationPreference: {
    findUnique: jest.fn(),
  },
};

const mockConfig = {
  get: jest.fn().mockReturnValue({ maxPerDay: 10, maxInstantPerDay: 5 }),
};

describe('FrequencyLimiterService', () => {
  let service: FrequencyLimiterService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FrequencyLimiterService,
        { provide: RedisService, useValue: mockRedis },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<FrequencyLimiterService>(FrequencyLimiterService);
  });

  describe('checkLimit()', () => {
    it('passes when user has no preferences (uses defaults)', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValueOnce(null);
      mockRedisGet.mockResolvedValue(null); // 0 notifications sent today

      const result = await service.checkLimit('user-1', true);
      expect(result.passed).toBe(true);
    });

    it('blocks when total daily limit is exceeded', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValueOnce({
        maxNotificationsPerDay: 5,
        maxInstantAlertsPerDay: 3,
      });
      // total counter = 5 (at limit)
      mockRedisGet
        .mockResolvedValueOnce('5') // total key
        .mockResolvedValueOnce('2'); // instant key

      const result = await service.checkLimit('user-1', true);
      expect(result.passed).toBe(false);
      expect(result.reason).toMatch(/Daily notification limit/);
    });

    it('blocks when instant alert limit is exceeded', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValueOnce({
        maxNotificationsPerDay: 10,
        maxInstantAlertsPerDay: 3,
      });
      mockRedisGet
        .mockResolvedValueOnce('4') // total = 4, below max
        .mockResolvedValueOnce('3'); // instant = 3, at limit

      const result = await service.checkLimit('user-1', true);
      expect(result.passed).toBe(false);
      expect(result.reason).toMatch(/instant alert limit/);
    });

    it('allows unlimited when maxNotificationsPerDay is 0', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValueOnce({
        maxNotificationsPerDay: 0,
        maxInstantAlertsPerDay: 0,
      });
      mockRedisGet.mockResolvedValue('999');

      const result = await service.checkLimit('user-1', true);
      expect(result.passed).toBe(true);
    });
  });

  describe('increment()', () => {
    it('increments total, instant, and channel counters', async () => {
      await service.increment('user-1', NotificationChannel.EMAIL, true);
      // pipeline.incr should have been called 3 times (total, instant, channel)
      expect(mockPipeline.incr).toHaveBeenCalledTimes(3);
      expect(mockPipeline.expire).toHaveBeenCalledTimes(3);
      expect(mockPipeline.exec).toHaveBeenCalledTimes(3);
    });
  });
});
