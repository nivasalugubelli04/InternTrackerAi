import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { RecordConsentDto, UpdatePrivacyPreferencesDto, ConsentType } from '../dto/privacy.dto';

export interface UserDataExportPayload {
  exportMetadata: {
    userId: string;
    generatedAt: Date;
    schemaVersion: string;
    dataCategoriesIncluded: string[];
  };
  account: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    createdAt: Date;
  };
  profile: any;
  careerPreferences: any;
  applications: any[];
  trackedCompanies: any[];
  savedJobs: any[];
  portfolioProjects: any[];
  skills: any[];
  consents: any[];
}

@Injectable()
export class PrivacyControlService {
  private readonly logger = new Logger(PrivacyControlService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get user's comprehensive privacy overview.
   */
  async getPrivacyOverview(userId: string) {
    const [consents, activeExport, activeDeletion, discoverability] = await Promise.all([
      this.prisma.userConsent.findMany({
        where: { userId },
        orderBy: { grantedAt: 'desc' },
      }),
      this.prisma.dataExportRequest.findFirst({
        where: { userId, status: { in: ['PENDING', 'PROCESSING', 'COMPLETED'] } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.accountDeletionRequest.findFirst({
        where: { userId, status: { in: ['REQUESTED', 'CONFIRMED'] } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.recruiterDiscoverabilitySettings.findUnique({
        where: { userId },
      }),
    ]);

    const preferences = {
      optionalAnalytics: consents.some(
        (c) => c.consentType === 'OPTIONAL_ANALYTICS' && c.isGranted,
      ),
      productUpdates: consents.some((c) => c.consentType === 'PRODUCT_UPDATES' && c.isGranted),
      aiDataProcessing: consents.some((c) => c.consentType === 'AI_DATA_PROCESSING' && c.isGranted),
    };

    return {
      consents,
      preferences,
      activeExport,
      activeDeletion,
      discoverability,
      dataRetentionPolicy: {
        activeAccount: 'Retained during active subscription & service usage',
        deletedAccountGracePeriod: '14-day recovery window before cascade purge',
        financialAndBillingRecords: '7 years (regulatory & tax compliance)',
        auditLogs: '1 year append-only operational telemetry',
      },
    };
  }

  /**
   * Record or update user consent for a specific policy.
   */
  async recordConsent(
    userId: string,
    dto: RecordConsentDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.prisma.userConsent.create({
      data: {
        userId,
        consentType: dto.consentType,
        version: dto.version,
        isGranted: dto.isGranted,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        grantedAt: new Date(),
        revokedAt: dto.isGranted ? null : new Date(),
      },
    });
  }

  /**
   * Update granular privacy preferences.
   */
  async updatePrivacyPreferences(
    userId: string,
    dto: UpdatePrivacyPreferencesDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const operations = [];

    if (dto.optionalAnalytics !== undefined) {
      operations.push(
        this.recordConsent(
          userId,
          {
            consentType: ConsentType.OPTIONAL_ANALYTICS,
            version: '2026-08',
            isGranted: dto.optionalAnalytics,
          },
          ipAddress,
          userAgent,
        ),
      );
    }

    if (dto.productUpdates !== undefined) {
      operations.push(
        this.recordConsent(
          userId,
          {
            consentType: ConsentType.PRODUCT_UPDATES,
            version: '2026-08',
            isGranted: dto.productUpdates,
          },
          ipAddress,
          userAgent,
        ),
      );
    }

    if (dto.aiDataProcessing !== undefined) {
      operations.push(
        this.recordConsent(
          userId,
          {
            consentType: ConsentType.AI_DATA_PROCESSING,
            version: '2026-08',
            isGranted: dto.aiDataProcessing,
          },
          ipAddress,
          userAgent,
        ),
      );
    }

    await Promise.all(operations);
    return this.getPrivacyOverview(userId);
  }

  /**
   * Initiates a personal data export archive for the user.
   */
  async requestDataExport(userId: string) {
    const existing = await this.prisma.dataExportRequest.findFirst({
      where: { userId, status: 'PENDING' },
    });

    if (existing) {
      return existing;
    }

    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7-day download expiry

    const exportRecord = await this.prisma.dataExportRequest.create({
      data: {
        userId,
        status: 'COMPLETED',
        downloadUrl: `/api/v1/privacy/export/download/${userId}`,
        expiresAt,
        completedAt: new Date(),
      },
    });

    this.logger.log(`Data export archive generated for user ${userId}`);
    return exportRecord;
  }

  /**
   * Compiles the full user data archive (sanitized of sensitive secrets/hashes).
   */
  async getExportData(userId: string): Promise<UserDataExportPayload> {
    const [user, profile, preferences, applications, trackedCompanies, savedJobs, consents] =
      await Promise.all([
        this.prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            createdAt: true,
          },
        }),
        this.prisma.profile.findUnique({ where: { userId } }),
        this.prisma.careerPreference.findUnique({ where: { userId } }),
        this.prisma.application.findMany({ where: { userId } }),
        this.prisma.trackedCompany.findMany({ where: { userId } }),
        this.prisma.savedJob.findMany({ where: { userId } }),
        this.prisma.userConsent.findMany({ where: { userId } }),
      ]);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      exportMetadata: {
        userId,
        generatedAt: new Date(),
        schemaVersion: '1.0.0',
        dataCategoriesIncluded: [
          'account',
          'profile',
          'careerPreferences',
          'applications',
          'trackedCompanies',
          'savedJobs',
          'consents',
        ],
      },
      account: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt,
      },
      profile,
      careerPreferences: preferences,
      applications,
      trackedCompanies,
      savedJobs,
      portfolioProjects: [],
      skills: [],
      consents,
    };
  }

  /**
   * Stage account deletion with 14-day recovery window.
   */
  async requestAccountDeletion(userId: string, reason?: string) {
    const scheduledFor = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14); // 14 days

    const existing = await this.prisma.accountDeletionRequest.findFirst({
      where: { userId, status: { in: ['REQUESTED', 'CONFIRMED'] } },
    });

    if (existing) {
      return existing;
    }

    const deletion = await this.prisma.accountDeletionRequest.create({
      data: {
        userId,
        reason: reason || null,
        status: 'REQUESTED',
        scheduledFor,
      },
    });

    this.logger.log(
      `Account deletion requested for user ${userId}, scheduled for ${scheduledFor.toISOString()}`,
    );
    return deletion;
  }

  /**
   * Confirm account deletion immediately.
   */
  async confirmAccountDeletion(userId: string) {
    const request = await this.prisma.accountDeletionRequest.findFirst({
      where: { userId, status: 'REQUESTED' },
    });

    if (!request) {
      throw new BadRequestException('No pending deletion request found.');
    }

    return this.prisma.accountDeletionRequest.update({
      where: { id: request.id },
      data: {
        status: 'CONFIRMED',
        confirmedAt: new Date(),
      },
    });
  }

  /**
   * Cancel scheduled account deletion.
   */
  async cancelAccountDeletion(userId: string) {
    const request = await this.prisma.accountDeletionRequest.findFirst({
      where: { userId, status: { in: ['REQUESTED', 'CONFIRMED'] } },
    });

    if (!request) {
      throw new BadRequestException('No active deletion request found.');
    }

    return this.prisma.accountDeletionRequest.update({
      where: { id: request.id },
      data: {
        status: 'CANCELLED',
      },
    });
  }
}
