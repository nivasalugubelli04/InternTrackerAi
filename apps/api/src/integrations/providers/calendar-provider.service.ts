import { Injectable, Logger } from '@nestjs/common';
import { IntegrationProviderType } from '@prisma/client';
import {
  IntegrationProvider,
  ProviderManifest,
  SyncResult,
  RawExternalItem,
} from '../interfaces/integration-provider.interface';

@Injectable()
export class CalendarProviderService implements IntegrationProvider {
  private readonly logger = new Logger(CalendarProviderService.name);

  getManifest(): ProviderManifest {
    return {
      provider: IntegrationProviderType.GOOGLE_CALENDAR,
      name: 'Google Calendar Integration',
      category: 'CALENDAR',
      dataRequested: [
        'Career-related calendar events (Interviews, Deadlines, Follow-ups)',
        'Event titles, start times, and company names',
      ],
      purpose:
        'To detect upcoming recruiter interviews, application deadlines, and schedule networking follow-ups.',
      syncFrequency: 'Daily or Manual sync',
      permissions: ['https://www.googleapis.com/auth/calendar.events.readonly'],
      whatItWillNotDo: [
        'Modify or delete your calendar events',
        'Read non-career personal events',
        'Share calendar information with third parties',
      ],
    };
  }

  async authorize(
    userId: string,
    params: { code?: string; redirectUri?: string; customData?: Record<string, any> },
  ) {
    this.logger.log(`Authorizing Google Calendar provider for user ${userId}`);

    const token = params.code || params.customData?.['token'] || 'mock_calendar_token';

    return {
      accessToken: token,
      refreshToken: 'mock_calendar_refresh_token',
      expiresAt: new Date(Date.now() + 3600 * 1000),
      scopes: ['https://www.googleapis.com/auth/calendar.events.readonly'],
      profileJson: {
        calendarId: 'primary',
        connectedAt: new Date().toISOString(),
      },
    };
  }

  async sync(
    userId: string,
    _credentials: { accessToken: string; refreshToken?: string },
    _options?: { fullSync?: boolean },
  ): Promise<SyncResult> {
    this.logger.log(`Syncing Calendar provider data for user ${userId}`);

    const records: RawExternalItem[] = [
      {
        externalId: 'cal-evt-201',
        recordType: 'CALENDAR_EVENT',
        sourceUrl: 'https://calendar.google.com/event?id=201',
        rawJson: {
          id: '201',
          summary: 'Technical Interview — Stripe (Backend Role)',
          description: 'System design and coding interview with Senior Engineer.',
          start: { dateTime: new Date(Date.now() + 86400000 * 2).toISOString() },
          location: 'Google Meet',
        },
        normalizedJson: {
          title: 'Technical Interview — Stripe (Backend Role)',
          eventType: 'INTERVIEW',
          company: 'Stripe',
          role: 'Backend Engineer',
          scheduledAt: new Date(Date.now() + 86400000 * 2).toISOString(),
          context: 'System design and coding interview with Senior Engineer.',
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
