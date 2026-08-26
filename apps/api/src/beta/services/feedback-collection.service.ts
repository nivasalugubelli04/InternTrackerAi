import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { sanitizeHtml } from '../../common/utils/sanitize.util';
import { PrismaService } from '../../prisma/prisma.service';
import { SubmitFeedbackDto, SubmitContextualRatingDto, ReportBugDto } from '../dto/beta.dto';

@Injectable()
export class FeedbackCollectionService {
  private readonly logger = new Logger(FeedbackCollectionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Submits general, feature request, or UX feedback.
   */
  async submitFeedback(userId: string, dto: SubmitFeedbackDto) {
    const cleanMessage = sanitizeHtml(dto.message);
    const cleanTitle = dto.title ? sanitizeHtml(dto.title) : undefined;

    this.logger.log(
      `Recording feedback [${dto.type}] from user ${userId} for category ${dto.category || 'GENERAL'}`,
    );

    return this.prisma.userFeedback.create({
      data: {
        userId,
        type: dto.type,
        status: 'OPEN',
        category: dto.category || 'GENERAL',
        message: cleanTitle ? `${cleanTitle}\n\n${cleanMessage}` : cleanMessage,
        severity: dto.severity || 'MEDIUM',
        resourceId: dto.resourceId || null,
        rating: dto.rating ?? null,
        metadata: dto.metadata || {},
      },
    });
  }

  /**
   * Submits inline contextual rating (e.g. Copilot helpfulness, Opportunity match accuracy).
   */
  async submitContextualRating(userId: string, dto: SubmitContextualRatingDto) {
    const cleanComment = dto.comment ? sanitizeHtml(dto.comment) : null;

    return this.prisma.userFeedback.create({
      data: {
        userId,
        type: dto.feature.includes('COPILOT') ? 'AI_QUALITY' : 'MATCH_QUALITY',
        status: 'OPEN',
        category: dto.feature,
        message: cleanComment,
        rating: dto.rating,
        resourceId: dto.resourceId || null,
        metadata: dto.context || {},
      },
    });
  }

  /**
   * Reports a technical bug with safe metadata.
   */
  async reportBug(userId: string, dto: ReportBugDto) {
    const cleanTitle = sanitizeHtml(dto.title);
    const cleanDescription = sanitizeHtml(dto.description);
    const cleanExpected = dto.expectedBehavior ? sanitizeHtml(dto.expectedBehavior) : '';

    const formattedMessage = `### Problem\n${cleanDescription}\n\n### Expected\n${cleanExpected}`;

    return this.prisma.userFeedback.create({
      data: {
        userId,
        type: 'BUG',
        status: 'OPEN',
        category: dto.affectedFeature || 'PLATFORM',
        severity: dto.severity || 'P2',
        message: `**${cleanTitle}**\n\n${formattedMessage}`,
        metadata: {
          screenshotUrl: dto.screenshotUrl || null,
          route: dto.route || null,
          technicalMetadata: dto.technicalMetadata || {},
        },
      },
    });
  }

  /**
   * Updates feedback lifecycle status (Admin action).
   */
  async updateFeedbackStatus(
    feedbackId: string,
    status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'IGNORED',
  ) {
    const feedback = await this.prisma.userFeedback.findUnique({
      where: { id: feedbackId },
    });
    if (!feedback) throw new NotFoundException('Feedback not found');

    return this.prisma.userFeedback.update({
      where: { id: feedbackId },
      data: { status },
    });
  }

  /**
   * Lists feedback submitted by a specific user.
   */
  async getUserFeedback(userId: string) {
    return this.prisma.userFeedback.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /**
   * Lists all recent feedback across the platform for admin review.
   */
  async getAllFeedback(limit = 100) {
    return this.prisma.userFeedback.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }
}
