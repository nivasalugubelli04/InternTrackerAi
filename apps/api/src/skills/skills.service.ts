import { Injectable } from '@nestjs/common';
import type { Skill } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

export interface SkillsQuery {
  search?: string;
  category?: string;
  limit?: number;
}

@Injectable()
export class SkillsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Search the global skills catalog.
   * Supports full-text search on name and optional category filter.
   */
  async findAll(query: SkillsQuery): Promise<Skill[]> {
    const { search, category, limit = 50 } = query;

    return this.prisma.skill.findMany({
      where: {
        isActive: true,
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
        ...(category ? { category: category as Skill['category'] } : {}),
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      take: Math.min(limit, 100),
    });
  }

  async findById(id: string): Promise<Skill | null> {
    return this.prisma.skill.findUnique({ where: { id } });
  }
}
