/**
 * Phase 6 — PreferenceValidatorService Unit Tests
 */

import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { PrismaService } from '../../prisma/prisma.service';
import { NotificationChannel } from '../enums/notification.enums';

import { PreferenceValidatorService } from './preference-validator.service';

const mockPrisma = {
  notificationPreference: {
    findUnique: jest.fn(),
  },
};

const buildPref = (overrides: Record<string, unknown> = {}) => ({
  userId: 'user-1',
  emailEnabled: true,
  pushEnabled: true,
  smsEnabled: false,
  quietHoursStart: null,
  quietHoursEnd: null,
  dailyDigest: true,
  weeklyDigest: true,
  ...overrides,
});

describe('PreferenceValidatorService', () => {
  let service: PreferenceValidatorService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [PreferenceValidatorService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<PreferenceValidatorService>(PreferenceValidatorService);
  });

  describe('validateChannel()', () => {
    it('passes for EMAIL when emailEnabled=true', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValueOnce(buildPref());
      const r = await service.validateChannel('user-1', NotificationChannel.EMAIL);
      expect(r.passed).toBe(true);
    });

    it('blocks EMAIL when emailEnabled=false', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValueOnce(
        buildPref({ emailEnabled: false }),
      );
      const r = await service.validateChannel('user-1', NotificationChannel.EMAIL);
      expect(r.passed).toBe(false);
    });

    it('blocks SMS when smsEnabled=false', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValueOnce(buildPref());
      const r = await service.validateChannel('user-1', NotificationChannel.SMS);
      expect(r.passed).toBe(false);
    });

    it('passes when no preferences exist (allows all by default)', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValueOnce(null);
      const r = await service.validateChannel('user-1', NotificationChannel.PUSH);
      expect(r.passed).toBe(true);
    });
  });

  describe('checkQuietHours()', () => {
    it('returns isQuietHours=false when no quiet hours set', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValueOnce(buildPref());
      const r = await service.checkQuietHours('user-1');
      expect(r.isQuietHours).toBe(false);
    });

    it('detects quiet hours when current time is in window', async () => {
      // Force current time to be inside 22:00–08:00 window
      const now = new Date();
      now.setHours(23, 0, 0, 0);
      jest.spyOn(global, 'Date').mockImplementation(() => now as any);

      mockPrisma.notificationPreference.findUnique.mockResolvedValueOnce(
        buildPref({ quietHoursStart: '22:00', quietHoursEnd: '08:00' }),
      );

      const r = await service.checkQuietHours('user-1');
      expect(r.isQuietHours).toBe(true);
      expect(r.resumesAt).toBeDefined();

      jest.restoreAllMocks();
    });

    it('does not trigger quiet hours when outside the window', async () => {
      const now = new Date();
      now.setHours(14, 0, 0, 0);
      jest.spyOn(global, 'Date').mockImplementation(() => now as any);

      mockPrisma.notificationPreference.findUnique.mockResolvedValueOnce(
        buildPref({ quietHoursStart: '22:00', quietHoursEnd: '08:00' }),
      );

      const r = await service.checkQuietHours('user-1');
      expect(r.isQuietHours).toBe(false);

      jest.restoreAllMocks();
    });
  });

  describe('hasAnyChannelEnabled()', () => {
    it('returns passed=true when at least one channel is enabled', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValueOnce(buildPref());
      const r = await service.hasAnyChannelEnabled('user-1');
      expect(r.passed).toBe(true);
    });

    it('returns passed=false when all channels disabled', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValueOnce(
        buildPref({
          emailEnabled: false,
          pushEnabled: false,
          dailyDigest: false,
          weeklyDigest: false,
        }),
      );
      const r = await service.hasAnyChannelEnabled('user-1');
      expect(r.passed).toBe(false);
    });
  });
});
