import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ReviewStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ExternalReviewCenterService {
  private readonly logger = new Logger(ExternalReviewCenterService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fetch pending review queue items for a user.
   */
  async getPendingReviews(userId: string) {
    const reviews = await this.prisma.externalDataReview.findMany({
      where: { userId, status: ReviewStatus.PENDING },
      include: {
        record: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return reviews.map((r) => ({
      id: r.id,
      recordId: r.recordId,
      provider: r.record.integrationId,
      recordType: r.record.recordType,
      sourceUrl: r.record.sourceUrl,
      rawJson: r.record.rawJson,
      normalizedJson: r.record.normalizedJson,
      status: r.status,
      matchConfidence: r.matchConfidence,
      suggestedAction: r.suggestedAction,
      targetEntityType: r.targetEntityType,
      targetEntityId: r.targetEntityId,
      createdAt: r.createdAt,
    }));
  }

  /**
   * Fetch review history (all statuses).
   */
  async getReviewHistory(userId: string) {
    return this.prisma.externalDataReview.findMany({
      where: { userId },
      include: { record: true },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });
  }

  /**
   * Approve a staged review record (User Explicit Decision).
   */
  async approveReview(userId: string, reviewId: string, _customPayload?: Record<string, any>) {
    this.logger.log(`User ${userId} approving review item ${reviewId}`);

    const review = await this.prisma.externalDataReview.findFirst({
      where: { id: reviewId, userId },
      include: { record: true },
    });

    if (!review) {
      throw new NotFoundException('Review record not found for this user.');
    }

    if (review.status !== ReviewStatus.PENDING) {
      throw new BadRequestException(`Review item is already in ${review.status} state.`);
    }

    // Update status to APPROVED
    const updated = await this.prisma.externalDataReview.update({
      where: { id: reviewId },
      data: {
        status: ReviewStatus.APPROVED,
        updatedAt: new Date(),
      },
      include: { record: true },
    });

    // Audit log
    await this.prisma.integrationEventLog.create({
      data: {
        userId,
        provider: (review.record as any).provider || 'GITHUB',
        eventType: 'DATA_APPROVED',
        details: { reviewId, recordType: review.record.recordType, action: review.suggestedAction },
      },
    });

    return updated;
  }

  /**
   * Reject a staged review record.
   */
  async rejectReview(userId: string, reviewId: string) {
    this.logger.log(`User ${userId} rejecting review item ${reviewId}`);

    const review = await this.prisma.externalDataReview.findFirst({
      where: { id: reviewId, userId },
    });

    if (!review) {
      throw new NotFoundException('Review record not found.');
    }

    const updated = await this.prisma.externalDataReview.update({
      where: { id: reviewId },
      data: {
        status: ReviewStatus.REJECTED,
        updatedAt: new Date(),
      },
    });

    return updated;
  }

  /**
   * Merge a staged review record into an existing entity.
   */
  async mergeReview(userId: string, reviewId: string, targetEntityId: string) {
    this.logger.log(`User ${userId} merging review item ${reviewId} into entity ${targetEntityId}`);

    const review = await this.prisma.externalDataReview.findFirst({
      where: { id: reviewId, userId },
    });

    if (!review) {
      throw new NotFoundException('Review record not found.');
    }

    const updated = await this.prisma.externalDataReview.update({
      where: { id: reviewId },
      data: {
        status: ReviewStatus.MERGED,
        targetEntityId,
        updatedAt: new Date(),
      },
    });

    return updated;
  }

  /**
   * Ignore a staged review record.
   */
  async ignoreReview(userId: string, reviewId: string) {
    const review = await this.prisma.externalDataReview.findFirst({
      where: { id: reviewId, userId },
    });

    if (!review) {
      throw new NotFoundException('Review record not found.');
    }

    return this.prisma.externalDataReview.update({
      where: { id: reviewId },
      data: {
        status: ReviewStatus.IGNORED,
        updatedAt: new Date(),
      },
    });
  }
}
