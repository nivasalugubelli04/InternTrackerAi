import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page = 1, limit = 50, filters?: { search?: string; status?: boolean }) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters?.search) {
      where.OR = [
        { email: { contains: filters.search, mode: 'insensitive' } },
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters?.status !== undefined) {
      where.isActive = filters.status;
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          isEmailVerified: true,
          lastLoginAt: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        careerPreference: true,
        _count: {
          select: {
            trackedCompanies: true,
            applications: true,
            savedJobs: true,
            aiConversations: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Never return passwordHash or token secrets
    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }

  async updateStatus(id: string, isActive: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        isActive,
        lockedUntil: isActive ? null : new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 10),
      },
      select: {
        id: true,
        isActive: true,
        email: true,
      },
    });
  }

  async resetLoginAttempts(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { loginAttempts: 0, lockedUntil: null },
    });
  }
}
