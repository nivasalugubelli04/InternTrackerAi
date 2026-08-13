import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FeedbackType } from '@prisma/client';

@Injectable()
export class FeedbackService {
  constructor(private prisma: PrismaService) {}

  async submitFeedback(
    userId: string,
    dto: { type: FeedbackType; resourceId?: string; rating?: number; message?: string; category?: string }
  ) {
    if (dto.type === FeedbackType.MATCH_QUALITY && !dto.resourceId) {
      throw new BadRequestException('resourceId (Job ID) is required for match quality feedback');
    }
    if (dto.type === FeedbackType.AI_QUALITY && !dto.resourceId) {
      throw new BadRequestException('resourceId (AI Message ID) is required for AI quality feedback');
    }

    return this.prisma.userFeedback.create({
      data: {
        userId,
        type: dto.type,
        ...(dto.resourceId ? { resourceId: dto.resourceId } : {}),
        ...(dto.rating ? { rating: dto.rating } : {}),
        ...(dto.message ? { message: dto.message } : {}),
        ...(dto.category ? { category: dto.category } : {}),
      },
    });
  }

  async getAdminFeedbacks() {
    return this.prisma.userFeedback.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { email: true, firstName: true, lastName: true },
        },
      },
    });
  }
}
