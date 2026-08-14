import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { TrendDirection } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { TrendDetectionService } from './trend-detection.service';

describe('TrendDetectionService', () => {
  let service: TrendDetectionService;

  const mockPrisma = {
    trendMetric: {
      create: jest.fn().mockResolvedValue({ id: 'tm-1' }),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [TrendDetectionService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<TrendDetectionService>(TrendDetectionService);
  });

  describe('evaluateTrend', () => {
    it('should return INSUFFICIENT_DATA when sample size is below minimum threshold (<5)', () => {
      const result = service.evaluateTrend('SKILL', 'Rust', 2, 1, 30);
      expect(result.direction).toBe(TrendDirection.INSUFFICIENT_DATA);
      expect(result.hasSufficientData).toBe(false);
      expect(result.confidence).toBeLessThan(0.4);
    });

    it('should classify trend as RISING when growth rate is >= +15%', () => {
      const result = service.evaluateTrend('SKILL', 'Python', 20, 10, 30);
      expect(result.direction).toBe(TrendDirection.RISING);
      expect(result.growthRate).toBe(100.0);
      expect(result.hasSufficientData).toBe(true);
      expect(result.confidence).toBe(1.0);
    });

    it('should classify trend as DECLINING when growth rate is <= -15%', () => {
      const result = service.evaluateTrend('SKILL', 'PHP', 5, 10, 30);
      expect(result.direction).toBe(TrendDirection.DECLINING);
      expect(result.growthRate).toBe(-50.0);
      expect(result.hasSufficientData).toBe(true);
    });

    it('should classify trend as STABLE when growth rate is between -15% and +15%', () => {
      const result = service.evaluateTrend('ROLE', 'Backend Development', 11, 10, 30);
      expect(result.direction).toBe(TrendDirection.STABLE);
      expect(result.growthRate).toBe(10.0);
      expect(result.hasSufficientData).toBe(true);
    });
  });
});
