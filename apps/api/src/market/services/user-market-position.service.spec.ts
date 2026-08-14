import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { JobPostingStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { UserMarketPositionService } from './user-market-position.service';

describe('UserMarketPositionService', () => {
  let service: UserMarketPositionService;

  const mockUser = {
    id: 'u-1',
    email: 'student@example.com',
    profile: {
      skills: ['React', 'TypeScript'],
    },
    careerPreference: {
      targetRoles: ['Frontend Development'],
    },
  };

  const mockUserSkills = [
    { skill: { id: 's1', name: 'React' } },
    { skill: { id: 's2', name: 'TypeScript' } },
  ];

  const mockJobs = [
    {
      id: 'j1',
      title: 'Frontend React Developer',
      location: 'Bengaluru',
      requirements: ['React', 'TypeScript', 'TailwindCSS'],
      company: { id: 'c1', name: 'Tech Corp' },
      status: JobPostingStatus.ACTIVE,
    },
    {
      id: 'j2',
      title: 'Full Stack Engineer',
      location: 'Remote',
      requirements: ['React', 'Node.js', 'PostgreSQL', 'Docker'],
      company: { id: 'c2', name: 'Dev Studio' },
      status: JobPostingStatus.ACTIVE,
    },
    {
      id: 'j3',
      title: 'Backend Engineer',
      location: 'Hyderabad',
      requirements: ['Node.js', 'PostgreSQL', 'AWS', 'Docker'],
      company: { id: 'c2', name: 'Dev Studio' },
      status: JobPostingStatus.ACTIVE,
    },
  ];

  const mockPrisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue(mockUser),
    },
    userSkill: {
      findMany: jest.fn().mockResolvedValue(mockUserSkills),
    },
    jobPosting: {
      findMany: jest.fn().mockResolvedValue(mockJobs),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [UserMarketPositionService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<UserMarketPositionService>(UserMarketPositionService);
  });

  it('should compare user skills against market demand and prioritize gaps', async () => {
    const position = await service.getUserMarketPosition('u-1');

    expect(position.userId).toBe('u-1');
    expect(position.overallMarketReadinessScore).toBeGreaterThan(0);
    expect(position.strongMarketAlignedSkills).toContain('React');
    expect(position.strongMarketAlignedSkills).toContain('TypeScript');

    // Node.js / Docker / PostgreSQL should be identified as gaps
    const gapSkills = position.prioritizedSkillGaps.map((g) => g.skill);
    expect(gapSkills.length).toBeGreaterThan(0);
    expect(position.recommendedRoles.length).toBeGreaterThan(0);
    expect(position.recommendedCompaniesToTrack.length).toBeGreaterThan(0);
  });
});
