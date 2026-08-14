import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MessageStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/** Max messages per participant per thread per day — anti-spam. */
const MAX_MESSAGES_PER_DAY = 30;

@Injectable()
export class MessagingService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Thread ────────────────────────────────────────────────────────────────

  async getThread(threadId: string, userId: string) {
    const thread = await this.prisma.messageThread.findUnique({
      where: { id: threadId },
    });
    if (!thread) throw new NotFoundException('Thread not found');

    // Verify participant
    if (!thread.participantIds.includes(userId)) {
      throw new ForbiddenException('You are not a participant in this thread');
    }

    if (thread.isBlocked) {
      throw new ForbiddenException('This thread has been blocked');
    }

    return thread;
  }

  async listUserThreads(userId: string) {
    return this.prisma.messageThread.findMany({
      where: { participantIds: { has: userId }, isBlocked: false },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { content: true, createdAt: true, status: true },
        },
        contactRequest: {
          select: {
            recruiterOrg: {
              include: { organization: { select: { name: true, logoUrl: true } } },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  // ─── Messages ──────────────────────────────────────────────────────────────

  async listMessages(threadId: string, userId: string) {
    await this.getThread(threadId, userId);

    const messages = await this.prisma.message.findMany({
      where: { threadId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        senderId: true,
        content: true,
        status: true,
        readAt: true,
        createdAt: true,
      },
    });

    // Mark unread messages as read for this user
    await this.prisma.message.updateMany({
      where: {
        threadId,
        status: MessageStatus.SENT,
        senderId: { not: userId },
      },
      data: { status: MessageStatus.READ, readAt: new Date() },
    });

    return messages;
  }

  /**
   * Send a message in an approved thread.
   * Anti-spam: rate-limited to MAX_MESSAGES_PER_DAY per user per thread.
   */
  async sendMessage(threadId: string, senderId: string, content: string) {
    if (!content?.trim()) throw new BadRequestException('Message content is required');
    if (content.length > 5000)
      throw new BadRequestException('Message must not exceed 5000 characters');

    await this.getThread(threadId, senderId);

    // Anti-spam: count messages sent by this user today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayMessageCount = await this.prisma.message.count({
      where: {
        threadId,
        senderId,
        createdAt: { gte: today },
      },
    });

    if (todayMessageCount >= MAX_MESSAGES_PER_DAY) {
      throw new HttpException(
        `You have reached your daily message limit of ${MAX_MESSAGES_PER_DAY} for this thread`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const message = await this.prisma.message.create({
      data: {
        threadId,
        senderId,
        content: content.trim(),
        status: MessageStatus.SENT,
      },
    });

    // Update thread updatedAt
    await this.prisma.messageThread.update({
      where: { id: threadId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  // ─── Block & Report ────────────────────────────────────────────────────────

  async blockThread(threadId: string, userId: string) {
    await this.getThread(threadId, userId);

    return this.prisma.messageThread.update({
      where: { id: threadId },
      data: { isBlocked: true, blockedByUserId: userId },
    });
  }

  async reportMessage(
    reporterId: string,
    targetId: string,
    targetType: 'RECRUITER' | 'MESSAGE' | 'JOB',
    reason: string,
    details?: string,
  ) {
    if (!reason?.trim()) throw new BadRequestException('Report reason is required');

    return this.prisma.recruiterReport.create({
      data: {
        reporterId,
        targetType,
        targetId,
        reason,
        ...(details !== undefined && { details }),
      },
    });
  }

  // ─── Admin ─────────────────────────────────────────────────────────────────

  async listReports(filters: { resolved?: boolean } = {}) {
    const where = filters.resolved !== undefined ? { resolved: filters.resolved } : {};
    return this.prisma.recruiterReport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async resolveReport(reportId: string, adminUserId: string) {
    return this.prisma.recruiterReport.update({
      where: { id: reportId },
      data: { resolved: true, resolvedAt: new Date(), resolvedById: adminUserId },
    });
  }
}
