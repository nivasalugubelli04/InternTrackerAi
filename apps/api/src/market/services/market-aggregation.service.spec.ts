import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

import { MarketAggregationService } from './market-aggregation.service';

describe('MarketAggregationService', () => {
  let service: MarketAggregationService;

  const mockJobs = [
    {
      id: 'job-1',
      title: 'Frontend React Intern',
      location: 'Bengaluru, Karnataka',
      workMode: 'REMOTE',
      stipend: 25000,
      duration: '6 months',
      requirements: ['React', 'TypeScript', 'CSS'],
      company: { id: 'c1', name: 'Tech Corp', industry: 'Technology' },
    },
    {
      id: 'job-2',
      title: 'Backend Node.js Developer',
      location: 'Hyderabad, Telangana',
      workMode: 'ONSITE',
      stipend: 30000,
      duration: '3 months',
      requirements: ['Node.js', 'PostgreSQL', 'TypeScript'],
      company: { id: 'c2', name: 'Fintech Solutions', industry: 'Fintech' },
    },
    {
      id: 'job-3',
      title: 'Full Stack Web Developer',
      location: 'Remote',
      workMode: 'REMOTE',
      stipend: 35000,
      duration: '6 months',
      requirements: ['React', 'Node.js', 'Python'],
      company: { id: 'c1', name: 'Tech Corp', industry: 'Technology' },
    },
    {
      id: 'job-4',
      title: 'Data Science Intern',
      location: 'Bengaluru',
      workMode: 'HYBRID',
      stipend: 40000,
      duration: '3 months',
      requirements: ['Python', 'SQL', 'Pandas'],
      company: { id: 'c3', name: 'Data Labs', industry: 'Analytics' },
    },
    {
      id: 'job-5',
      title: 'Software Engineer Intern',
      location: 'Pune',
      workMode: 'ONSITE',
      stipend: 20000,
      duration: '6 months',
      requirements: ['Java', 'SQL'],
      company: { id: 'c2', name: 'Fintech Solutions', industry: 'Fintech' },
    },
  ];

  const mockPrisma = {
    jobPosting: {
      findMany: jest.fn().mockResolvedValue(mockJobs),
      count: jest.fn().mockResolvedValue(3),
    },
    company: {
      count: jest.fn().mockResolvedValue(3),
    },
  };

  const mockRedisClient = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
  };

  const mockRedis = {
    getClient: jest.fn().mockReturnValue(mockRedisClient),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketAggregationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<MarketAggregationService>(MarketAggregationService);
  });

  it('should compute market overview metrics correctly', async () => {
    const overview = await service.getMarketOverview(true);

    expect(overview.totalActiveInternships).toBe(5);
    expect(overview.activelyHiringCompaniesCount).toBe(3);
    expect(overview.topRoles.length).toBeGreaterThan(0);
    expect(overview.topSkills.length).toBeGreaterThan(0);
    expect(overview.stipendDistribution.hasSufficientData).toBe(true);
    expect(overview.stipendDistribution.median).toBe(30000);
    expect(overview.stipendDistribution.min).toBe(20000);
    expect(overview.stipendDistribution.max).toBe(40000);
    expect(overview.averageDurationMonths).toBeCloseTo(4.8, 0.5);
    expect(mockRedisClient.set).toHaveBeenCalled();
  });

  it('should return cached overview when available in Redis', async () => {
    const cachedData = {
      totalActiveInternships: 10,
      newInternshipsThisWeek: 2,
      newInternshipsThisMonth: 8,
      activelyHiringCompaniesCount: 5,
      topRoles: [],
      topSkills: [],
      topLocations: [],
      topIndustries: [],
      averageDurationMonths: 6,
      stipendDistribution: {
        min: 15000,
        max: 50000,
        median: 30000,
        average: 32000,
        currency: 'INR',
        hasSufficientData: true,
        sampleCount: 10,
      },
      dataFreshness: {
        lastCalculatedAt: new Date().toISOString(),
        sampleSize: 10,
        hasSufficientData: true,
      },
    };

    mockRedisClient.get.mockResolvedValueOnce(JSON.stringify(cachedData));

    const result = await service.getMarketOverview(false);
    expect(result.totalActiveInternships).toBe(10);
    expect(mockPrisma.jobPosting.findMany).not.toHaveBeenCalled();
  });
});
