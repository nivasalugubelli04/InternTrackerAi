import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { SaveMemoryDto } from '../dto/copilot.dto';

@Injectable()
export class CopilotMemoryService {
  private readonly logger = new Logger(CopilotMemoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves user-approved long term memory items.
   */
  async getUserMemories(userId: string) {
    return this.prisma.copilotMemory.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Stores or updates an approved long-term career preference memory.
   */
  async saveMemory(userId: string, dto: SaveMemoryDto) {
    this.logger.log(`Saving approved Copilot memory for user ${userId}: ${dto.key}`);
    return this.prisma.copilotMemory.upsert({
      where: {
        userId_key: {
          userId,
          key: dto.key,
        },
      },
      create: {
        userId,
        key: dto.key,
        value: dto.value,
        reason: dto.reason || 'User specified in conversation',
        memoryType: dto.memoryType || 'CAREER_PREFERENCE',
      },
      update: {
        value: dto.value,
        reason: dto.reason || 'User updated in conversation',
        memoryType: dto.memoryType || 'CAREER_PREFERENCE',
      },
    });
  }

  /**
   * Deletes a long-term memory item.
   */
  async deleteMemory(userId: string, memoryId: string) {
    const memory = await this.prisma.copilotMemory.findFirst({
      where: { id: memoryId, userId },
    });
    if (!memory) {
      throw new NotFoundException('Memory item not found or unauthorized');
    }
    await this.prisma.copilotMemory.delete({
      where: { id: memoryId },
    });
    return { success: true, message: 'Memory item deleted' };
  }

  /**
   * Resolves conversational follow-up references (e.g. "the Google one", "that project").
   */
  async resolveRecentTurnContext(conversationId?: string): Promise<string | null> {
    if (!conversationId) return null;

    const recentMessages = await this.prisma.copilotMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: 4,
    });

    if (recentMessages.length === 0) return null;

    // Return chronological snippet
    return recentMessages
      .reverse()
      .map((m) => `${m.role}: ${m.content.substring(0, 160)}`)
      .join('\n');
  }
}
