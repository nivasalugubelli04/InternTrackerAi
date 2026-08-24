import { Module } from '@nestjs/common';

import { CareerIntelligenceModule } from '../career-intelligence/career-intelligence.module';
import { PrismaModule } from '../prisma/prisma.module';

import { ResearchController } from './controllers/research.controller';
import { CareerRelevanceService } from './services/career-relevance.service';
import { CompanyIntelligenceService } from './services/company-intelligence.service';
import { OpportunityFreshnessService } from './services/opportunity-freshness.service';
import { OpportunityNormalizationService } from './services/opportunity-normalization.service';
import { ResearchAiService } from './services/research-ai.service';
import { ResearchSourceRegistryService } from './services/research-source-registry.service';
import { ResearchService } from './services/research.service';
import { TechnologySignalService } from './services/technology-signal.service';
import { WatchlistService } from './services/watchlist.service';

@Module({
  imports: [PrismaModule, CareerIntelligenceModule],
  controllers: [ResearchController],
  providers: [
    ResearchSourceRegistryService,
    OpportunityNormalizationService,
    OpportunityFreshnessService,
    CareerRelevanceService,
    CompanyIntelligenceService,
    TechnologySignalService,
    WatchlistService,
    ResearchAiService,
    ResearchService,
  ],
  exports: [
    ResearchService,
    ResearchSourceRegistryService,
    OpportunityNormalizationService,
    OpportunityFreshnessService,
    CareerRelevanceService,
    CompanyIntelligenceService,
    TechnologySignalService,
    WatchlistService,
    ResearchAiService,
  ],
})
export class ResearchModule {}
