import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { OrganizationRole } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMembers(orgId: string) {
    return this.prisma.organizationMember.findMany({
      where: { organizationId: orgId },
      include: { user: { select: { id: true, email: true } } },
    });
  }

  async inviteMember(orgId: string, email: string, role: OrganizationRole, inviterId: string) {
    // 1. Check if already a member
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user) {
      const existingMember = await this.prisma.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId: orgId, userId: user.id } },
      });
      if (existingMember) throw new ConflictException('User is already a member');
    }

    // 2. Check if invitation already pending
    const existingInvite = await this.prisma.organizationInvitation.findUnique({
      where: { organizationId_email: { organizationId: orgId, email } },
    });
    if (existingInvite && existingInvite.status === 'PENDING') {
      throw new ConflictException('Invitation already pending for this email');
    }

    // 3. Create invitation
    const token =
      Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    const invite = await this.prisma.organizationInvitation.upsert({
      where: { organizationId_email: { organizationId: orgId, email } },
      create: {
        organizationId: orgId,
        email,
        role,
        invitedById: inviterId,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
      update: {
        status: 'PENDING',
        token,
        invitedById: inviterId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // In a real flow, we would trigger an email via NotificationService here
    return invite;
  }

  async acceptInvitation(userId: string, token: string) {
    const invite = await this.prisma.organizationInvitation.findUnique({ where: { token } });
    if (!invite || invite.status !== 'PENDING' || invite.expiresAt < new Date()) {
      throw new NotFoundException('Invalid or expired invitation');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.email !== invite.email) {
      throw new ConflictException('This invitation belongs to a different email address');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.organizationInvitation.update({
        where: { id: invite.id },
        data: { status: 'ACCEPTED' },
      });

      return tx.organizationMember.create({
        data: {
          organizationId: invite.organizationId,
          userId,
          role: invite.role,
          invitedById: invite.invitedById,
        },
      });
    });
  }

  async removeMember(orgId: string, userId: string) {
    return this.prisma.organizationMember.delete({
      where: { organizationId_userId: { organizationId: orgId, userId } },
    });
  }
}
