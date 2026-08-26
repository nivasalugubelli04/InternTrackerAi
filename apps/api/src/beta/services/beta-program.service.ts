import { Injectable, Logger, BadRequestException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { InviteBetaUserDto, UpdateBetaOnboardingDto } from '../dto/beta.dto';

@Injectable()
export class BetaProgramService {
  private readonly logger = new Logger(BetaProgramService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new beta invitation code.
   */
  async createInvitation(adminUserId: string, dto: InviteBetaUserDto) {
    const code = `BETA-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    this.logger.log(
      `Created beta invitation ${code} for cohort ${dto.cohort || 'EARLY_ACCESS_2026'}`,
    );

    return this.prisma.betaInvitation.create({
      data: {
        code,
        email: dto.email || null,
        cohort: dto.cohort || 'EARLY_ACCESS_2026',
        maxUses: dto.maxUses || 1,
        createdBy: adminUserId,
      },
    });
  }

  /**
   * Redeems a beta invitation for a user.
   */
  async redeemInvitation(userId: string, code: string) {
    const invitation = await this.prisma.betaInvitation.findUnique({
      where: { code },
    });

    if (!invitation || !invitation.isActive) {
      throw new BadRequestException('Invalid or expired beta invitation code');
    }

    if (invitation.usedCount >= invitation.maxUses) {
      throw new BadRequestException('Beta invitation code has reached maximum uses');
    }

    await this.prisma.$transaction([
      this.prisma.betaInvitation.update({
        where: { id: invitation.id },
        data: { usedCount: { increment: 1 } },
      }),
      this.prisma.betaAccess.upsert({
        where: { userId },
        create: {
          userId,
          invitationId: invitation.id,
          cohort: invitation.cohort || 'DEFAULT_COHORT',
        },
        update: {
          isRevoked: false,
          cohort: invitation.cohort || 'DEFAULT_COHORT',
        },
      }),
      this.prisma.betaOnboardingState.upsert({
        where: { userId },
        create: { userId, isWelcomed: false },
        update: { lastInteractedAt: new Date() },
      }),
    ]);

    return { success: true, cohort: invitation.cohort };
  }

  /**
   * Retrieves or initializes beta onboarding state for a user.
   */
  async getOnboardingState(userId: string) {
    return this.prisma.betaOnboardingState.upsert({
      where: { userId },
      create: {
        userId,
        isWelcomed: false,
        hasExploredFeatures: false,
        feedbackDismissed: false,
      },
      update: {},
    });
  }

  /**
   * Updates user beta onboarding progression.
   */
  async updateOnboardingState(userId: string, dto: UpdateBetaOnboardingDto) {
    return this.prisma.betaOnboardingState.upsert({
      where: { userId },
      create: {
        userId,
        isWelcomed: dto.isWelcomed ?? false,
        hasExploredFeatures: dto.hasExploredFeatures ?? false,
        feedbackDismissed: dto.feedbackDismissed ?? false,
        completedSteps: dto.completedSteps || [],
      },
      update: {
        ...(dto.isWelcomed !== undefined ? { isWelcomed: dto.isWelcomed } : {}),
        ...(dto.hasExploredFeatures !== undefined
          ? { hasExploredFeatures: dto.hasExploredFeatures }
          : {}),
        ...(dto.feedbackDismissed !== undefined
          ? { feedbackDismissed: dto.feedbackDismissed }
          : {}),
        ...(dto.completedSteps ? { completedSteps: dto.completedSteps } : {}),
        lastInteractedAt: new Date(),
      },
    });
  }

  /**
   * Lists all beta users for admin management.
   */
  async getBetaUsers(limit = 100) {
    return this.prisma.betaAccess.findMany({
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            createdAt: true,
          },
        },
      },
      orderBy: { grantedAt: 'desc' },
    });
  }
}
