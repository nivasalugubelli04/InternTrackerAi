import { Module } from '@nestjs/common';

import { AiModule } from '../ai/ai.module';
import { CareerCenterModule } from '../career-center/career-center.module';
import { PortfolioModule } from '../portfolio/portfolio.module';
import { PrismaModule } from '../prisma/prisma.module';

import { CareerIntelligenceController } from './controllers/career-intelligence.controller';
import { CareerIntelligenceService } from './services/career-intelligence.service';
import { CareerSnapshotService } from './services/career-snapshot.service';

@Module({
  imports: [PrismaModule, AiModule, PortfolioModule, CareerCenterModule],
  controllers: [CareerIntelligenceController],
  providers: [CareerIntelligenceService, CareerSnapshotService],
  exports: [CareerIntelligenceService, CareerSnapshotService],
})
export class CareerIntelligenceModule {}
