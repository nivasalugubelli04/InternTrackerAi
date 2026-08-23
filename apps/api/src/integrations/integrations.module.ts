import { Module, OnModuleInit } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';

import { CryptoService } from './services/crypto.service';
import { IntegrationFrameworkService } from './services/integration-framework.service';
import { DataNormalizationService } from './services/data-normalization.service';
import { DuplicateDetectionService } from './services/duplicate-detection.service';
import { ExternalReviewCenterService } from './services/external-review-center.service';
import { CareerDataSyncService } from './services/career-data-sync.service';
import { IntegrationSyncSchedulerService } from './services/integration-sync-scheduler.service';

import { GitHubProviderService } from './providers/github-provider.service';
import { CalendarProviderService } from './providers/calendar-provider.service';
import { DocumentImportService } from './providers/document-import.service';
import { PortfolioLinkService } from './providers/portfolio-link.service';
import { EmailSignalService } from './providers/email-signal.service';

import { IntegrationsController } from './controllers/integrations.controller';

@Module({
  imports: [PrismaModule, AiModule],
  controllers: [IntegrationsController],
  providers: [
    CryptoService,
    IntegrationFrameworkService,
    DataNormalizationService,
    DuplicateDetectionService,
    ExternalReviewCenterService,
    CareerDataSyncService,
    IntegrationSyncSchedulerService,
    GitHubProviderService,
    CalendarProviderService,
    DocumentImportService,
    PortfolioLinkService,
    EmailSignalService,
  ],
  exports: [
    CryptoService,
    IntegrationFrameworkService,
    ExternalReviewCenterService,
    CareerDataSyncService,
    IntegrationSyncSchedulerService,
  ],
})
export class IntegrationsModule implements OnModuleInit {
  constructor(
    private readonly frameworkService: IntegrationFrameworkService,
    private readonly githubProvider: GitHubProviderService,
    private readonly calendarProvider: CalendarProviderService,
    private readonly documentProvider: DocumentImportService,
    private readonly portfolioProvider: PortfolioLinkService,
    private readonly emailProvider: EmailSignalService,
  ) {}

  onModuleInit() {
    // Register all 5 initial providers dynamically into the framework
    this.frameworkService.registerProvider(this.githubProvider);
    this.frameworkService.registerProvider(this.calendarProvider);
    this.frameworkService.registerProvider(this.documentProvider);
    this.frameworkService.registerProvider(this.portfolioProvider);
    this.frameworkService.registerProvider(this.emailProvider);
  }
}
