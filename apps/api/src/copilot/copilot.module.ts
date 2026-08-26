import { Module } from '@nestjs/common';

import { AiModule } from '../ai/ai.module';
import { CareerIntelligenceModule } from '../career-intelligence/career-intelligence.module';
import { ExecutionModule } from '../execution/execution.module';
import { NetworkingModule } from '../networking/networking.module';
import { OutcomesModule } from '../outcomes/outcomes.module';
import { PortfolioModule } from '../portfolio/portfolio.module';
import { PreparationModule } from '../preparation/preparation.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ResearchModule } from '../research/research.module';
import { SimulationModule } from '../simulation/simulation.module';

import { CopilotController } from './controllers/copilot.controller';
import { CopilotActionProposalService } from './services/copilot-action-proposal.service';
import { CopilotContextService } from './services/copilot-context.service';
import { CopilotIntentService } from './services/copilot-intent.service';
import { CopilotMemoryService } from './services/copilot-memory.service';
import { CopilotOrchestratorService } from './services/copilot-orchestrator.service';
import { CopilotToolRegistryService } from './services/copilot-tool-registry.service';
import { CopilotService } from './services/copilot.service';

@Module({
  imports: [
    PrismaModule,
    CareerIntelligenceModule,
    ExecutionModule,
    SimulationModule,
    ResearchModule,
    PortfolioModule,
    OutcomesModule,
    PreparationModule,
    NetworkingModule,
    AiModule,
  ],
  controllers: [CopilotController],
  providers: [
    CopilotService,
    CopilotIntentService,
    CopilotContextService,
    CopilotMemoryService,
    CopilotToolRegistryService,
    CopilotOrchestratorService,
    CopilotActionProposalService,
  ],
  exports: [
    CopilotService,
    CopilotIntentService,
    CopilotContextService,
    CopilotMemoryService,
    CopilotToolRegistryService,
    CopilotOrchestratorService,
    CopilotActionProposalService,
  ],
})
export class CopilotModule {}
