import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { CreateEngagementSignalDto } from '../dto/engagement.dto';

@Injectable()
export class EngagementSignalService {
  private readonly logger = new Logger(EngagementSignalService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Emits a new engagement signal with automatic deduplication.
   */
  async emitSignal(userId: string, dto: CreateEngagementSignalDto) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Default 7 days expiration

    const entityId = dto.metadata ? dto.metadata['entityId'] : undefined;
    const deduplicationKey = entityId
      ? `${dto.signalType}-${entityId}`
      : `${dto.signalType}-${dto.title}`;

    // Check for recent unhandled duplicate signal
    const existing = await this.prisma.engagementSignal.findFirst({
      where: {
        userId,
        signalType: dto.signalType as any,
        isHandled: false,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // within 24h
      },
    });

    if (existing) {
      this.logger.debug(
        `Signal ${dto.signalType} already active for user ${userId}. Skipping duplicate.`,
      );
      return existing;
    }

    this.logger.log(
      `Emitting engagement signal [${dto.signalType}] for user ${userId} with priority ${dto.priority || 'MEDIUM'}`,
    );

    return this.prisma.engagementSignal.create({
      data: {
        userId,
        signalType: dto.signalType as any,
        priority: (dto.priority || 'MEDIUM') as any,
        title: dto.title,
        description: dto.description,
        recommendedAction: dto.recommendedAction,
        targetRoute: dto.targetRoute || '/dashboard',
        metadata: { ...dto.metadata, deduplicationKey },
        expiresAt,
        isHandled: false,
      },
    });
  }

  /**
   * Marks a signal as handled once a notification is sent or action is taken.
   */
  async markSignalHandled(signalId: string) {
    return this.prisma.engagementSignal.update({
      where: { id: signalId },
      data: { isHandled: true },
    });
  }

  /**
   * Retrieves active, unhandled signals for a user.
   */
  async getActiveSignals(userId: string, limit = 10) {
    return this.prisma.engagementSignal.findMany({
      where: {
        userId,
        isHandled: false,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
      take: limit,
    });
  }
}
