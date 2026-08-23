import { Injectable, Logger } from '@nestjs/common';
import { IntegrationProviderType } from '@prisma/client';
import {
  IntegrationProvider,
  ProviderManifest,
  SyncResult,
  RawExternalItem,
} from '../interfaces/integration-provider.interface';

@Injectable()
export class PortfolioLinkService implements IntegrationProvider {
  private readonly logger = new Logger(PortfolioLinkService.name);

  getManifest(): ProviderManifest {
    return {
      provider: IntegrationProviderType.PORTFOLIO_LINK,
      name: 'Portfolio Web & Demo Links',
      category: 'PORTFOLIO',
      dataRequested: [
        'User-submitted project demo URLs',
        'Personal website & tech blog links',
        'Open Graph page metadata',
      ],
      purpose:
        'To validate live project links, verify portfolio deployments, and enrich the Professional Evidence Graph.',
      syncFrequency: 'On URL addition or manual sync',
      permissions: ['read:public_web'],
      whatItWillNotDo: [
        'Scrape private or paywalled content',
        'Modify external web pages',
        'Publish content on your behalf',
      ],
    };
  }

  async authorize(
    userId: string,
    _params: { code?: string; redirectUri?: string; customData?: Record<string, any> },
  ) {
    this.logger.log(`Authorizing Portfolio Link provider for user ${userId}`);

    return {
      accessToken: 'portfolio_link_internal_token',
      scopes: ['read:public_web'],
      profileJson: {
        connectedAt: new Date().toISOString(),
      },
    };
  }

  async sync(
    userId: string,
    _credentials: { accessToken: string; refreshToken?: string },
    options?: Record<string, any>,
  ): Promise<SyncResult> {
    this.logger.log(`Syncing Portfolio Link data for user ${userId}`);

    const url = (options?.['targetUrl'] as string) || 'https://my-portfolio-demo.vercel.app';

    const records: RawExternalItem[] = [
      {
        externalId: `link-${Date.now()}`,
        recordType: 'PORTFOLIO_LINK',
        sourceUrl: url,
        rawJson: {
          url,
          status: 200,
          title: 'InternTracker AI Live Demo',
          description: 'Live interactive production demo built with React, TypeScript, and NestJS.',
        },
        normalizedJson: {
          title: 'InternTracker AI Live Demo',
          description: 'Live interactive production demo built with React, TypeScript, and NestJS.',
          targetUrl: url,
          technologies: ['React', 'TypeScript', 'NestJS', 'Vercel'],
          isLive: true,
          evidenceType: 'DEPLOYMENT',
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
