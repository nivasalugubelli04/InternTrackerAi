import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { IntegrationProviderType, IntegrationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { IntegrationFrameworkService } from './integration-framework.service';
import { DataNormalizationService } from './data-normalization.service';
import { DuplicateDetectionService } from './duplicate-detection.service';

@Injectable()
export class IntegrationSyncSchedulerService {
  private readonly logger = new Logger(IntegrationSyncSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly frameworkService: IntegrationFrameworkService,
    private readonly normalizationService: DataNormalizationService,
    private readonly duplicateDetector: DuplicateDetectionService,
  ) {}

  /**
   * Execute sync for a user's specific active integration.
   */
  async triggerSync(userId: string, providerType: IntegrationProviderType, syncType = 'MANUAL') {
    this.logger.log(`Starting ${syncType} sync for user ${userId}, provider ${providerType}`);

    const integration = await this.prisma.userIntegration.findUnique({
      where: { userId_provider: { userId, provider: providerType } },
    });

    if (!integration) {
      throw new NotFoundException(`No connected integration found for provider ${providerType}.`);
    }

    if (integration.status === IntegrationStatus.DISCONNECTED) {
      throw new BadRequestException(`Integration ${providerType} is currently disconnected.`);
    }

    // Set status to SYNCING
    await this.prisma.userIntegration.update({
      where: { id: integration.id },
      data: { status: IntegrationStatus.SYNCING },
    });

    // Create IntegrationSync log
    const syncLog = await this.prisma.integrationSync.create({
      data: {
        integrationId: integration.id,
        syncType,
        status: 'RUNNING',
      },
    });

    try {
      // Get decrypted credentials
      const creds = await this.frameworkService.getDecryptedCredentials(integration.id);

      // Get provider implementation
      const provider = this.frameworkService.getProvider(providerType);

      // Execute provider sync
      const credsPayload: { accessToken: string; refreshToken?: string } = {
        accessToken: creds.accessToken,
      };
      if (creds.refreshToken) {
        credsPayload.refreshToken = creds.refreshToken;
      }

      const syncResult = await provider.sync(userId, credsPayload);

      let itemsPendingReview = 0;

      // Process fetched records
      for (const item of syncResult.records) {
        // Normalize
        const normalized = this.normalizationService.normalize(item.recordType, item.rawJson);

        // Check duplicates
        const dupCheck = await this.duplicateDetector.evaluate(userId, item.recordType, normalized);

        // Upsert ExternalDataRecord
        const record = await this.prisma.externalDataRecord.upsert({
          where: {
            id: item.externalId.length === 36 ? item.externalId : undefined,
          } as any,
          create: {
            userId,
            integrationId: integration.id,
            recordType: item.recordType,
            externalId: item.externalId,
            sourceUrl: item.sourceUrl ?? null,
            rawJson: item.rawJson,
            normalizedJson: normalized,
          },
          update: {
            rawJson: item.rawJson,
            normalizedJson: normalized,
            fetchedAt: new Date(),
          },
        });

        // Upsert ExternalDataReview staged queue item
        await this.prisma.externalDataReview.upsert({
          where: { recordId: record.id },
          create: {
            userId,
            recordId: record.id,
            status: 'PENDING',
            matchConfidence: dupCheck.matchConfidence,
            suggestedAction: dupCheck.suggestedAction,
            targetEntityType: dupCheck.targetEntityType ?? null,
            targetEntityId: dupCheck.targetEntityId ?? null,
            reviewNotes: dupCheck.matchReason ?? null,
          },
          update: {
            matchConfidence: dupCheck.matchConfidence,
            suggestedAction: dupCheck.suggestedAction,
            targetEntityType: dupCheck.targetEntityType ?? null,
            targetEntityId: dupCheck.targetEntityId ?? null,
            reviewNotes: dupCheck.matchReason ?? null,
            updatedAt: new Date(),
          },
        });

        itemsPendingReview++;
      }

      // Update UserIntegration & IntegrationSync logs
      await this.prisma.userIntegration.update({
        where: { id: integration.id },
        data: {
          status: IntegrationStatus.CONNECTED,
          lastSyncedAt: new Date(),
          errorMessage: null,
        },
      });

      await this.prisma.integrationSync.update({
        where: { id: syncLog.id },
        data: {
          status: 'SUCCESS',
          itemsScanned: syncResult.itemsScanned,
          itemsImported: syncResult.itemsImported,
          itemsPendingReview,
          completedAt: new Date(),
        },
      });

      // Audit log
      await this.prisma.integrationEventLog.create({
        data: {
          userId,
          provider: providerType,
          eventType: 'SYNC_COMPLETED',
          details: { syncType, itemsScanned: syncResult.itemsScanned, itemsPendingReview },
        },
      });

      return {
        success: true,
        itemsScanned: syncResult.itemsScanned,
        itemsPendingReview,
        message: `Sync completed successfully for ${providerType}. ${itemsPendingReview} items ready in Review Center.`,
      };
    } catch (err: any) {
      this.logger.error(`Sync failed for ${providerType} (user ${userId}): ${err.message}`, err.stack);

      await this.prisma.userIntegration.update({
        where: { id: integration.id },
        data: {
          status: IntegrationStatus.SYNC_FAILED,
          errorMessage: err.message,
        },
      });

      await this.prisma.integrationSync.update({
        where: { id: syncLog.id },
        data: {
          status: 'FAILED',
          errorMessage: err.message,
          completedAt: new Date(),
        },
      });

      throw err;
    }
  }
}
