import { Injectable, Logger } from '@nestjs/common';
import type { CareerPreference, NotificationPreference } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import type {
  UpdatePreferencesDto,
  UpdateNotificationPreferenceDto,
} from './dto/update-preferences.dto';

export interface AllPreferences {
  career: CareerPreference | null;
  notifications: NotificationPreference | null;
}

@Injectable()
export class PreferencesService {
  private readonly logger = new Logger(PreferencesService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Get all preferences ───────────────────────────────────────────────────
  async findAll(userId: string): Promise<AllPreferences> {
    const [career, notifications] = await Promise.all([
      this.prisma.careerPreference.findUnique({ where: { userId } }),
      this.prisma.notificationPreference.findUnique({ where: { userId } }),
    ]);
    return { career, notifications };
  }

  // ── Update career preferences ─────────────────────────────────────────────
  async updateCareer(userId: string, dto: UpdatePreferencesDto): Promise<CareerPreference> {
    const data: Parameters<typeof this.prisma.careerPreference.upsert>[0]['create'] = {
      userId,
      preferredRoles: dto.preferredRoles ?? [],
      preferredLocations: dto.preferredLocations ?? [],
      preferredIndustries: dto.preferredIndustries ?? [],
      preferredWorkMode: dto.preferredWorkMode ?? [],
      preferredCompanies: dto.preferredCompanies ?? [],
      ...(dto.minimumStipend !== undefined ? { minimumStipend: dto.minimumStipend } : {}),
      ...(dto.internshipDuration !== undefined
        ? { internshipDuration: dto.internshipDuration }
        : {}),
    };

    const pref = await this.prisma.careerPreference.upsert({
      where: { userId },
      create: data,
      update: {
        ...(dto.preferredRoles !== undefined ? { preferredRoles: dto.preferredRoles } : {}),
        ...(dto.preferredLocations !== undefined
          ? { preferredLocations: dto.preferredLocations }
          : {}),
        ...(dto.preferredIndustries !== undefined
          ? { preferredIndustries: dto.preferredIndustries }
          : {}),
        ...(dto.preferredWorkMode !== undefined
          ? { preferredWorkMode: dto.preferredWorkMode }
          : {}),
        ...(dto.minimumStipend !== undefined ? { minimumStipend: dto.minimumStipend } : {}),
        ...(dto.internshipDuration !== undefined
          ? { internshipDuration: dto.internshipDuration }
          : {}),
        ...(dto.preferredCompanies !== undefined
          ? { preferredCompanies: dto.preferredCompanies }
          : {}),
      },
    });

    this.logger.log({ userId }, 'Career preferences updated');
    return pref;
  }

  // ── Update notification preferences ──────────────────────────────────────
  async updateNotifications(
    userId: string,
    dto: UpdateNotificationPreferenceDto,
  ): Promise<NotificationPreference> {
    const pref = await this.prisma.notificationPreference.upsert({
      where: { userId },
      create: {
        userId,
        emailEnabled: dto.emailEnabled ?? true,
        pushEnabled: dto.pushEnabled ?? true,
        dailyDigest: dto.dailyDigest ?? false,
        weeklyDigest: dto.weeklyDigest ?? true,
        ...(dto.quietHoursStart ? { quietHoursStart: dto.quietHoursStart } : {}),
        ...(dto.quietHoursEnd ? { quietHoursEnd: dto.quietHoursEnd } : {}),
      },
      update: {
        ...(dto.emailEnabled !== undefined ? { emailEnabled: dto.emailEnabled } : {}),
        ...(dto.pushEnabled !== undefined ? { pushEnabled: dto.pushEnabled } : {}),
        ...(dto.dailyDigest !== undefined ? { dailyDigest: dto.dailyDigest } : {}),
        ...(dto.weeklyDigest !== undefined ? { weeklyDigest: dto.weeklyDigest } : {}),
        ...(dto.quietHoursStart !== undefined ? { quietHoursStart: dto.quietHoursStart } : {}),
        ...(dto.quietHoursEnd !== undefined ? { quietHoursEnd: dto.quietHoursEnd } : {}),
      },
    });

    this.logger.log({ userId }, 'Notification preferences updated');
    return pref;
  }
}
