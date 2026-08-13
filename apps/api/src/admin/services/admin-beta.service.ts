import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { randomBytes } from 'crypto';

@Injectable()
export class AdminBetaService {
  constructor(private prisma: PrismaService) {}

  async createInvitation(adminId: string, dto: { email?: string; cohort?: string; maxUses?: number; expiresAt?: Date }) {
    const code = randomBytes(8).toString('hex').toUpperCase();
    return this.prisma.betaInvitation.create({
      data: {
        code,
        ...(dto.email ? { email: dto.email } : {}),
        ...(dto.cohort ? { cohort: dto.cohort } : {}),
        maxUses: dto.maxUses || 1,
        ...(dto.expiresAt ? { expiresAt: dto.expiresAt } : {}),
        createdBy: adminId,
      },
    });
  }

  async getInvitations() {
    return this.prisma.betaInvitation.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { betaUsers: true },
        },
      },
    });
  }

  async getBetaUsers() {
    return this.prisma.betaAccess.findMany({
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        invitation: {
          select: { code: true, cohort: true },
        },
      },
      orderBy: { grantedAt: 'desc' },
    });
  }

  async revokeBetaAccess(userId: string) {
    const access = await this.prisma.betaAccess.findUnique({ where: { userId } });
    if (!access) throw new NotFoundException('Beta access not found for this user');

    return this.prisma.betaAccess.update({
      where: { userId },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });
  }
}
