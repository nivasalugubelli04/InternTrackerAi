import { Test, TestingModule } from '@nestjs/testing';

import { AiService } from '../../ai/services/ai.service';
import { TrendDetectionService } from '../../market/services/trend-detection.service';
import { UserMarketPositionService } from '../../market/services/user-market-position.service';
import { PrismaService } from '../../prisma/prisma.service';

import { CareerStrategyService } from './career-strategy.service';

describe('CareerStrategyService', () => {
  let service: CareerStrategyService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue({ id: 'user-123', email: 'test@example.com' }),
    },
    userSkill: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    application: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    mockInterview: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    careerGoal: {
      findFirst: jest.fn().mockResolvedValue({ targetRole: 'Software Engineer Intern' }),
    },
    careerPreference: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
    jobPosting: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    careerReadiness: {
      upsert: jest.fn().mockResolvedValue({}),
    },
    role: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  const mockUserMarketPosition = {
    getUserMarketPosition: jest.fn().mockResolvedValue({}),
  };

  const mockTrendDetection = {
    getLatestTrends: jest.fn().mockResolvedValue({}),
  };

  const mockAiService = {
    aiProvider: {
      generateText: jest.fn().mockResolvedValue({ text: 'AI simulated response', model: 'gemini' }),
    },
    aiConfig: {
      provider: 'gemini',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CareerStrategyService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: UserMarketPositionService, useValue: mockUserMarketPosition },
        { provide: TrendDetectionService, useValue: mockTrendDetection },
        { provide: AiService, useValue: mockAiService },
      ],
    }).compile();

    service = module.get<CareerStrategyService>(CareerStrategyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCareerStrategy', () => {
    it('should generate a career strategy with strategic score', async () => {
      mockPrisma.jobPosting.findMany.mockResolvedValueOnce([
        { title: 'Software Engineer Intern', requirements: ['python', 'sql'] },
      ]);
      mockPrisma.userSkill.findMany.mockResolvedValueOnce([{ skill: { name: 'python' } }]);

      const result = await service.getCareerStrategy('user-123');
      expect(result).toBeDefined();
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.targetRole).toBe('Software Engineer Intern');
      expect(result.priorityMatrix).toBeDefined();
    });
  });

  describe('getHiringForecast', () => {
    it('should calculate forecast statistics', async () => {
      mockPrisma.jobPosting.findMany.mockResolvedValueOnce([
        { createdAt: new Date() },
        { createdAt: new Date() },
        { createdAt: new Date() },
        { createdAt: new Date() },
        { createdAt: new Date() },
      ]);

      const result = await service.getHiringForecast('user-123');
      expect(result).toBeDefined();
      expect(result.hasSufficientData).toBe(true);
      expect(result.confidence).toBe('LOW');
    });

    it('should handle small datasets safely', async () => {
      mockPrisma.jobPosting.findMany.mockResolvedValueOnce([{ createdAt: new Date() }]);

      const result = await service.getHiringForecast('user-123');
      expect(result).toBeDefined();
      expect(result.hasSufficientData).toBe(false);
      expect(result.forecastText).toContain('Not enough data');
    });
  });
});
