import { Test, TestingModule } from '@nestjs/testing';

import { AI_PROVIDER_TOKEN } from '../../ai/providers/ai-provider.interface';
import { PrismaService } from '../../prisma/prisma.service';

import { CareerAnalyticsService } from './career-analytics.service';

describe('CareerAnalyticsService', () => {
  let service: CareerAnalyticsService;
  let prisma: any;

  const mockPrisma = {
    application: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    opportunityRequirement: {
      findMany: jest.fn(),
    },
    applicationEvidenceMatch: {
      findMany: jest.fn(),
    },
    mockInterview: {
      findMany: jest.fn(),
    },
    careerAction: {
      count: jest.fn(),
    },
    opportunityProjectSelection: {
      findMany: jest.fn(),
    },
  };

  const mockAiProvider = {
    generateStructuredOutput: jest.fn(),
    generateText: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CareerAnalyticsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AI_PROVIDER_TOKEN, useValue: mockAiProvider },
      ],
    }).compile();

    service = module.get<CareerAnalyticsService>(CareerAnalyticsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getFunnelAnalytics', () => {
    it('should compute funnel counts and conversions with correct sample size', async () => {
      const mockApps = [
        { id: 'app-1', status: 'SAVED', createdAt: new Date() },
        { id: 'app-2', status: 'APPLIED', createdAt: new Date() },
        { id: 'app-3', status: 'INTERVIEW', createdAt: new Date() },
        { id: 'app-4', status: 'OFFER', createdAt: new Date() },
      ];

      prisma.application.findMany.mockResolvedValue(mockApps);

      const result = await service.getFunnelAnalytics('user-123', {
        start: new Date(),
        end: new Date(),
      });

      expect(result.counts.discovered).toBe(4);
      expect(result.counts.saved).toBe(4);
      expect(result.counts.submitted).toBe(3);
      expect(result.counts.interview).toBe(2);
      expect(result.counts.offer).toBe(1);
    });

    it('should return null conversion rates when sample size is below threshold', async () => {
      prisma.application.findMany.mockResolvedValue([
        { id: 'app-1', status: 'SAVED', createdAt: new Date() },
      ]);

      const result = await service.getFunnelAnalytics('user-123', {
        start: new Date(),
        end: new Date(),
      });
      expect(result.conversions.savedToApplied).toBeNull();
    });
  });

  describe('detectBottlenecks', () => {
    it('should flag APPLICATION bottleneck when many opportunities saved but few submitted', async () => {
      const mockApps = [
        { id: '1', status: 'SAVED' },
        { id: '2', status: 'SAVED' },
        { id: '3', status: 'SAVED' },
        { id: '4', status: 'SAVED' },
        { id: '5', status: 'SAVED' },
        { id: '6', status: 'SAVED' },
        { id: '7', status: 'SAVED' },
        { id: '8', status: 'SAVED' },
        { id: '9', status: 'SAVED' },
      ];
      prisma.application.findMany.mockResolvedValue(mockApps);
      prisma.careerAction.count.mockResolvedValue(0);
      prisma.mockInterview.findMany.mockResolvedValue([]);

      const result = await service.detectBottlenecks('user-123', {
        start: new Date(),
        end: new Date(),
      });
      expect(result.stage).toBe('APPLICATION');
    });
  });
});
