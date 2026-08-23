import { Injectable, Logger } from '@nestjs/common';
import { IntegrationProviderType } from '@prisma/client';
import {
  IntegrationProvider,
  ProviderManifest,
  SyncResult,
  RawExternalItem,
} from '../interfaces/integration-provider.interface';

@Injectable()
export class EmailSignalService implements IntegrationProvider {
  private readonly logger = new Logger(EmailSignalService.name);

  getManifest(): ProviderManifest {
    return {
      provider: IntegrationProviderType.EMAIL_FEED,
      name: 'Career Email Signal Feed',
      category: 'EMAIL',
      dataRequested: [
        'Application confirmation headers',
        'Interview invitation subjects & timestamps',
        'Recruiter communication signals',
      ],
      purpose:
        'To detect upcoming interviews and application status updates from authorized email notifications without reading personal emails.',
      syncFrequency: 'Manual or Scheduled background sync',
      permissions: ['read:career_email_signals'],
      whatItWillNotDo: [
        'Read or store personal non-career email body text',
        'Send emails or replies automatically on your behalf',
        'Access un-authorized email folders',
      ],
    };
  }

  async authorize(
    userId: string,
    _params: { code?: string; redirectUri?: string; customData?: Record<string, any> },
  ) {
    this.logger.log(`Authorizing Email Signal provider for user ${userId}`);

    return {
      accessToken: 'email_signal_internal_token',
      scopes: ['read:career_email_signals'],
      profileJson: {
        filterRules: ['subject:interview', 'subject:application', 'from:recruiter'],
        connectedAt: new Date().toISOString(),
      },
    };
  }

  async sync(
    userId: string,
    _credentials: { accessToken: string; refreshToken?: string },
    _options?: Record<string, any>,
  ): Promise<SyncResult> {
    this.logger.log(`Syncing Email Signal provider data for user ${userId}`);

    const records: RawExternalItem[] = [
      {
        externalId: `msg-${Date.now()}`,
        recordType: 'EMAIL_SIGNAL',
        rawJson: {
          sender: 'careers@google.com',
          subject: 'Google Software Engineering Internship — Interview Scheduled',
          receivedAt: new Date().toISOString(),
        },
        normalizedJson: {
          title: 'Google Software Engineering Internship — Interview Scheduled',
          signalType: 'INTERVIEW_INVITATION',
          company: 'Google',
          role: 'Software Engineering Intern',
          detectedStatus: 'INTERVIEW',
          confidence: 'HIGH',
        },
      },
    ];

    return {
      itemsScanned: records.length,
      itemsImported: records.length,
      itemsPendingReview: records.length,
      records,
    };
  }
}
