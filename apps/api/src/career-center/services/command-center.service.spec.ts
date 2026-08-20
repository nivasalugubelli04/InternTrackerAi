import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { AiService } from '../../ai/services/ai.service';
import { PrismaService } from '../../prisma/prisma.service';

import { ActionOrchestrationService } from './action-orchestration.service';
import { CareerStrategyService } from './career-strategy.service';
import { CommandCenterService } from './command-center.service';

describe('CommandCenterService', () => {
  let service: CommandCenterService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    userGoal: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
    },
    matchScore: {
      findUnique: jest.fn(),
    },
  };

  const mockActionOrchestrationService = {
    getPrioritizedActions: jest.fn().mockResolvedValue([]),
  };

  const mockCareerStrategyService = {
    getCareerStrategy: jest
      .fn()
      .mockResolvedValue({ overallScore: 78, targetRole: 'Software Engineer' }),
    getHiringForecast: jest
      .fn()
      .mockResolvedValue({ forecastText: 'Stable hiring forecast', confidence: 'HIGH' }),
  };

  const mockAiService = {
    aiProvider: {
      generateText: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommandCenterService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ActionOrchestrationService, useValue: mockActionOrchestrationService },
        { provide: CareerStrategyService, useValue: mockCareerStrategyService },
        { provide: AiService, useValue: mockAiService },
      ],
    }).compile();

    service = module.get<CommandCenterService>(CommandCenterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCommandCenterData', () => {
    it('should aggregate career command data successfully', async () => {
      const mockUser = {
        id: 'user-123',
        profile: { headline: 'Developer', bio: 'Bio here' },
        resume: { fileUrl: 'http://resume.pdf' },
        applications: [],
        candidateHiringInterviews: [],
        mockInterviews: [],
        learningEnrollments: [],
        userGoals: [],
        recommendations: [],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getCommandCenterData('user-123');
      expect(result).toBeDefined();
      expect(result.greeting).toBeDefined();
      expect(result.careerHealth.profile).toBe(95);
      expect(result.overallReadiness).toBe(78);
      expect(result.targetRole).toBe('Software Engineer');
    });

    it('should throw NotFoundException if user is not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      await expect(service.getCommandCenterData('user-invalid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('Goals CRUD', () => {
    it('should create goal', async () => {
      const mockGoal = {
        id: 'goal-1',
        title: 'Apply to 5 jobs',
        type: 'APPLICATION',
        targetValue: 5,
      };
      mockPrismaService.userGoal.create.mockResolvedValue(mockGoal);

      const result = await service.createUserGoal('user-1', {
        type: 'APPLICATION',
        title: 'Apply to 5 jobs',
        targetValue: 5,
        deadline: new Date().toISOString(),
      });
      expect(result.id).toBe('goal-1');
      expect(result.targetValue).toBe(5);
    });

    it('should adjust goal', async () => {
      const mockGoal = {
        id: 'goal-1',
        title: 'Apply to 5 jobs',
        type: 'APPLICATION',
        targetValue: 5,
        currentValue: 1,
      };
      mockPrismaService.userGoal.findFirst.mockResolvedValue(mockGoal);
      mockPrismaService.userGoal.update.mockResolvedValue({ ...mockGoal, currentValue: 2 });

      const result = await service.adjustUserGoal('user-1', 'goal-1', { currentValue: 2 });
      expect(result.currentValue).toBe(2);
    });
  });

  describe('getWeeklyReview', () => {
    it('should aggregate weekly activity and return fallback AI text when provider fails', async () => {
      const mockUser = {
        id: 'user-1',
        applications: [],
        mockInterviews: [],
        learningEnrollments: [],
      };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockAiService.aiProvider.generateText.mockRejectedValue(new Error('API quota reached'));

      const result = await service.getWeeklyReview('user-1');
      expect(result.applications).toBe(0);
      expect(result.aiExplanation).toContain('WEEKLY SUMMARY');
      expect(result.isFallback).toBe(true);
    });
  });
});
