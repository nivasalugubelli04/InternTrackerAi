import { IntegrationProviderType } from '@prisma/client';

export interface ProviderManifest {
  provider: IntegrationProviderType;
  name: string;
  category: 'DEVELOPER' | 'CALENDAR' | 'DOCUMENT' | 'PORTFOLIO' | 'EMAIL';
  dataRequested: string[];
  purpose: string;
  syncFrequency: string;
  whatItWillNotDo: string[];
  permissions: string[];
}

export interface RawExternalItem {
  externalId: string;
  recordType: 'REPOSITORY' | 'CALENDAR_EVENT' | 'DOCUMENT_SUMMARY' | 'PORTFOLIO_LINK' | 'EMAIL_SIGNAL';
  sourceUrl?: string;
  rawJson: Record<string, any>;
  normalizedJson: Record<string, any>;
}

export interface SyncResult {
  itemsScanned: number;
  itemsImported: number;
  itemsPendingReview: number;
  records: RawExternalItem[];
}

export interface IntegrationProvider {
  getManifest(): ProviderManifest;

  authorize(
    userId: string,
    params: { code?: string; redirectUri?: string; customData?: Record<string, any> },
  ): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
    scopes: string[];
    profileJson?: Record<string, any>;
  }>;

  sync(
    userId: string,
    credentials: { accessToken: string; refreshToken?: string },
    options?: Record<string, any>,
  ): Promise<SyncResult>;
}
