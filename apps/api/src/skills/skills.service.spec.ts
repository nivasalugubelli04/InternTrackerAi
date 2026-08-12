import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';

import { SkillsService } from './skills.service';

const mockPrismaService = {
  skill: {
    findMany: jest.fn(),
  },
};

describe('SkillsService', () => {
  let service: SkillsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SkillsService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<SkillsService>(SkillsService);
    jest.clearAllMocks();
  });

  it('should return all skills when no params provided', async () => {
    mockPrismaService.skill.findMany.mockResolvedValueOnce([{ id: '1', name: 'React' }]);
    const result = await service.findAll({});
    expect(result).toEqual([{ id: '1', name: 'React' }]);
    expect(mockPrismaService.skill.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      take: 50,
    });
  });

  it('should build query for search and category', async () => {
    mockPrismaService.skill.findMany.mockResolvedValueOnce([]);
    await service.findAll({ search: 'react', category: 'FRONTEND' });
    expect(mockPrismaService.skill.findMany).toHaveBeenCalledWith({
      where: {
        isActive: true,
        name: { contains: 'react', mode: 'insensitive' },
        category: 'FRONTEND',
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      take: 50,
    });
  });
});
