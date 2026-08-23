import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { IntegrationProviderType, IntegrationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CryptoService } from './crypto.service';
import { IntegrationProvider, ProviderManifest } from '../interfaces/integration-provider.interface';

@Injectable()
export class IntegrationFrameworkService {
  private readonly logger = new Logger(IntegrationFrameworkService.name);
  private readonly providers = new Map<IntegrationProviderType, IntegrationProvider>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: CryptoService,
  ) {}

  /**
   * Register a provider implementation dynamically.
   */
  registerProvider(provider: IntegrationProvider) {
    const manifest = provider.getManifest();
    this.providers.set(manifest.provider, provider);
    this.logger.log(`Registered Integration Provider: ${manifest.name} (${manifest.provider})`);
  }

  /**
   * List all available provider manifests and user's connection status.
   */
  async getProvidersStatus(userId: string) {
    const userIntegrations = await this.prisma.userIntegration.findMany({
      where: { userId },
    });

    const statusMap = new Map(userIntegrations.map((ui) => [ui.provider, ui]));

    const result: Array<{
      manifest: ProviderManifest;
      connection: {
        id?: string;
        status: IntegrationStatus;
        lastSyncedAt?: Date | null;
        errorMessage?: string | null;
        scopes: string[];
      };
    }> = [];

    for (const [providerType, provider] of this.providers.entries()) {
      const manifest = provider.getManifest();
      const existing = statusMap.get(providerType);

      result.push({
        manifest,
        connection: {
          ...(existing?.id ? { id: existing.id } : {}),
          status: existing ? existing.status : IntegrationStatus.AVAILABLE,
          lastSyncedAt: existing?.lastSyncedAt ?? null,
          errorMessage: existing?.errorMessage ?? null,
          scopes: existing?.scopes ?? [],
        },
      });
    }

    return result;
  }

  /**
   * Connect an integration for a user with provided authorization parameters.
   */
  async connectIntegration(
    userId: string,
    providerType: IntegrationProviderType,
    params: { code?: string; redirectUri?: string; customData?: Record<string, any> },
  ) {
    this.logger.log(`Connecting ${providerType} integration for user ${userId}`);
    const provider = this.providers.get(providerType);

    if (!provider) {
      throw new BadRequestException(`Provider ${providerType} is not registered or supported.`);
    }

    // Process authorization with provider
    const authResult = await provider.authorize(userId, params);

    // Encrypt tokens
    const accessTokenEncrypted = this.cryptoService.encrypt(authResult.accessToken);
    const refreshTokenEncrypted = authResult.refreshToken
      ? this.cryptoService.encrypt(authResult.refreshToken)
      : null;

    // Upsert UserIntegration record
    const integration = await this.prisma.userIntegration.upsert({
      where: {
        userId_provider: { userId, provider: providerType },
      },
      create: {
        userId,
        provider: providerType,
        status: IntegrationStatus.CONNECTED,
        scopes: authResult.scopes,
        settingsJson: authResult.profileJson ?? {},
      },
      update: {
        status: IntegrationStatus.CONNECTED,
        scopes: authResult.scopes,
        errorMessage: null,
        settingsJson: authResult.profileJson ?? {},
        updatedAt: new Date(),
      },
    });

    // Upsert IntegrationCredential record (secure 1:1)
    await this.prisma.integrationCredential.upsert({
      where: { integrationId: integration.id },
      create: {
        integrationId: integration.id,
        accessTokenEncrypted,
        refreshTokenEncrypted,
        expiresAt: authResult.expiresAt ?? null,
      },
      update: {
        accessTokenEncrypted,
        refreshTokenEncrypted,
        expiresAt: authResult.expiresAt ?? null,
        updatedAt: new Date(),
      },
    });

    // Audit log
    await this.prisma.integrationEventLog.create({
      data: {
        userId,
        provider: providerType,
        eventType: 'CONNECTED',
        details: { scopes: authResult.scopes, profile: authResult.profileJson },
      },
    });

    return integration;
  }

  /**
   * Disconnect an integration and securely delete stored credentials.
   */
  async disconnectIntegration(userId: string, integrationId: string) {
    this.logger.log(`Disconnecting integration ${integrationId} for user ${userId}`);

    const integration = await this.prisma.userIntegration.findFirst({
      where: { id: integrationId, userId },
    });

    if (!integration) {
      throw new NotFoundException('Integration not found for this user.');
    }

    // Credentials will cascade delete via Prisma relation onDelete: Cascade
    await this.prisma.userIntegration.update({
      where: { id: integrationId },
      data: {
        status: IntegrationStatus.DISCONNECTED,
        errorMessage: null,
      },
    });

    // Delete credentials
    await this.prisma.integrationCredential.deleteMany({
      where: { integrationId },
    });

    // Audit log
    await this.prisma.integrationEventLog.create({
      data: {
        userId,
        provider: integration.provider,
        eventType: 'DISCONNECTED',
      },
    });

    return { success: true, message: `Successfully disconnected ${integration.provider}` };
  }

  /**
   * Internal helper: retrieves and decrypts stored tokens for an active integration.
   */
  async getDecryptedCredentials(integrationId: string) {
    const creds = await this.prisma.integrationCredential.findUnique({
      where: { integrationId },
    });

    if (!creds) {
      throw new NotFoundException('Credentials not found for integration.');
    }

    const accessToken = this.cryptoService.decrypt(creds.accessTokenEncrypted);
    const refreshToken = creds.refreshTokenEncrypted
      ? this.cryptoService.decrypt(creds.refreshTokenEncrypted)
      : undefined;

    return {
      accessToken,
      refreshToken,
      expiresAt: creds.expiresAt,
    };
  }

  /**
   * Get provider instance by type.
   */
  getProvider(providerType: IntegrationProviderType): IntegrationProvider {
    const provider = this.providers.get(providerType);
    if (!provider) {
      throw new NotFoundException(`Provider ${providerType} not found.`);
    }
    return provider;
  }
}
