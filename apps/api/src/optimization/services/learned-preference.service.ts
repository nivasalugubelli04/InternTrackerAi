import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LearnedPreferenceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves all transparent learned preferences for a user.
   */
  async getPreferences(userId: string) {
    const list = await this.prisma.learnedPreference.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    if (list.length === 0) {
      // Seed transparent baseline learned preferences
      const defaults = [
        {
          key: 'preferred_task_duration',
          value: '30-45 minutes (Micro-Sprints)',
          confidence: 'HIGH_CONFIDENCE',
          sourcePattern: 'Higher completion rate observed on shorter tasks',
        },
        {
          key: 'preferred_planning_style',
          value: 'Modular Daily Milestones',
          confidence: 'HIGH_CONFIDENCE',
          sourcePattern: 'Sequential execution milestones reduce schedule postponement',
        },
        {
          key: 'preferred_opportunity_focus',
          value: 'AI Engineering & Full Stack Roles',
          confidence: 'MEDIUM_CONFIDENCE',
          sourcePattern: 'Derived from saved internships and skill alignment graph',
        },
      ];

      const createdList: any[] = [];
      for (const d of defaults) {
        const item = await this.prisma.learnedPreference.create({
          data: {
            userId,
            key: d.key,
            value: d.value,
            confidence: d.confidence as any,
            sourcePattern: d.sourcePattern,
            isEnabled: true,
          },
        });
        createdList.push(item);
      }
      return createdList;
    }

    return list;
  }

  /**
   * Updates an existing learned preference (value or toggle isEnabled).
   */
  async updatePreference(
    userId: string,
    preferenceId: string,
    params: { value?: string; isEnabled?: boolean },
  ) {
    const pref = await this.prisma.learnedPreference.findFirst({
      where: { id: preferenceId, userId },
    });

    if (!pref) {
      throw new NotFoundException('Learned preference not found');
    }

    return this.prisma.learnedPreference.update({
      where: { id: preferenceId },
      data: {
        ...(params.value !== undefined ? { value: params.value } : {}),
        ...(params.isEnabled !== undefined ? { isEnabled: params.isEnabled } : {}),
      },
    });
  }

  /**
   * Deletes a learned preference per privacy / user control requirements.
   */
  async deletePreference(userId: string, preferenceId: string) {
    const pref = await this.prisma.learnedPreference.findFirst({
      where: { id: preferenceId, userId },
    });

    if (!pref) {
      throw new NotFoundException('Learned preference not found');
    }

    return this.prisma.learnedPreference.delete({
      where: { id: preferenceId },
    });
  }
}
