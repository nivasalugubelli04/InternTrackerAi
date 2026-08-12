import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';

import { PreferencesService } from './preferences.service';

const mockPrismaService = {
  careerPreference: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  notificationPreference: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
};

describe('PreferencesService', () => {
  let service: PreferencesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PreferencesService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<PreferencesService>(PreferencesService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return career and notifications', async () => {
      mockPrismaService.careerPreference.findUnique.mockResolvedValueOnce({ id: 'c1' });
      mockPrismaService.notificationPreference.findUnique.mockResolvedValueOnce({ id: 'n1' });

      const result = await service.findAll('userId');
      expect(result).toEqual({ career: { id: 'c1' }, notifications: { id: 'n1' } });
    });
  });

  describe('updateCareer', () => {
    it('should upsert career preference', async () => {
      mockPrismaService.careerPreference.upsert.mockResolvedValueOnce({ id: 'c1' });
      const result = await service.updateCareer('userId', { preferredRoles: ['Dev'] });
      expect(result).toEqual({ id: 'c1' });
      expect(mockPrismaService.careerPreference.upsert).toHaveBeenCalled();
    });
  });

  describe('updateNotifications', () => {
    it('should upsert notification preference', async () => {
      mockPrismaService.notificationPreference.upsert.mockResolvedValueOnce({ id: 'n1' });
      const result = await service.updateNotifications('userId', { emailEnabled: false });
      expect(result).toEqual({ id: 'n1' });
      expect(mockPrismaService.notificationPreference.upsert).toHaveBeenCalled();
    });
  });
});
