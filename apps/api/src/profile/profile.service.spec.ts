import { ConflictException, NotFoundException } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { EngagementTrackerService } from '../engagement/services/engagement-tracker.service';
import { PrismaService } from '../prisma/prisma.service';

import { ProfileService } from './profile.service';

const mockPrismaService = {
  profile: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  userSkill: {
    findMany: jest.fn(),
    count: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    findUnique: jest.fn(),
  },
  resume: {
    findUnique: jest.fn(),
  },
  careerPreference: {
    findUnique: jest.fn(),
  },
  skill: {
    findUnique: jest.fn(),
  },
};

const mockEngagementTracker = {
  trackAction: jest.fn().mockResolvedValue(undefined),
};

describe('ProfileService', () => {
  let service: ProfileService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EngagementTrackerService, useValue: mockEngagementTracker },
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw ConflictException if profile exists', async () => {
      mockPrismaService.profile.findUnique.mockResolvedValueOnce({ id: '1' });
      await expect(service.create('userId', {})).rejects.toThrow(ConflictException);
    });

    it('should create a profile', async () => {
      mockPrismaService.profile.findUnique.mockResolvedValueOnce(null);
      mockPrismaService.profile.create.mockResolvedValueOnce({ id: 'p1', userId: 'userId' });

      const result = await service.create('userId', { headline: 'Test' });
      expect(result).toEqual({ id: 'p1', userId: 'userId' });
      expect(mockPrismaService.profile.create).toHaveBeenCalledWith({
        data: { userId: 'userId', headline: 'Test' },
      });
    });
  });

  describe('findByUserId', () => {
    it('should throw NotFoundException if profile not found', async () => {
      mockPrismaService.profile.findUnique.mockResolvedValueOnce(null);
      await expect(service.findByUserId('userId')).rejects.toThrow(NotFoundException);
    });

    it('should return profile with skills', async () => {
      mockPrismaService.profile.findUnique.mockResolvedValueOnce({ id: 'p1' });
      mockPrismaService.userSkill.findMany.mockResolvedValueOnce([{ skillId: 's1' }]);

      const result = await service.findByUserId('userId');
      expect(result).toEqual({ id: 'p1', userSkills: [{ skillId: 's1' }] });
    });
  });

  describe('getCompletion', () => {
    it('should calculate completion correctly', async () => {
      mockPrismaService.profile.findUnique.mockResolvedValueOnce({
        headline: 'A',
        bio: 'B',
        phone: 'C',
      });
      mockPrismaService.userSkill.count.mockResolvedValueOnce(1);
      mockPrismaService.resume.findUnique.mockResolvedValueOnce({ id: 'r1' });
      mockPrismaService.careerPreference.findUnique.mockResolvedValueOnce({
        preferredRoles: ['A'],
        preferredWorkMode: ['B'],
      });

      const result = await service.getCompletion('userId');
      expect(result.total).toBe(80); // Missing education
      expect(result.sections.personal).toBe(20);
      expect(result.sections.education).toBe(0);
      expect(result.sections.skills).toBe(20);
      expect(result.sections.resume).toBe(20);
      expect(result.sections.careerPreferences).toBe(20);
    });
  });
});
