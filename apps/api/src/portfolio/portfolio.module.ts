import { Module } from '@nestjs/common';

import { AiModule } from '../ai/ai.module';
import { CareerCenterModule } from '../career-center/career-center.module';
import { PrismaModule } from '../prisma/prisma.module';

import { PortfolioController } from './portfolio.controller';
import { PortfolioService } from './portfolio.service';
import { EvidenceGraphService } from './services/evidence-graph.service';
import { PortfolioIntelligenceService } from './services/portfolio-intelligence.service';
import { ProjectAnalysisService } from './services/project-analysis.service';

@Module({
  imports: [PrismaModule, AiModule, CareerCenterModule],
  controllers: [PortfolioController],
  providers: [
    PortfolioService,
    EvidenceGraphService,
    ProjectAnalysisService,
    PortfolioIntelligenceService,
  ],
  exports: [
    PortfolioService,
    EvidenceGraphService,
    ProjectAnalysisService,
    PortfolioIntelligenceService,
  ],
})
export class PortfolioModule {}
