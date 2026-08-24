import { Module } from '@nestjs/common';

import { AiModule } from '../ai/ai.module';
import { CareerIntelligenceModule } from '../career-intelligence/career-intelligence.module';
import { PrismaModule } from '../prisma/prisma.module';

import { SimulationController } from './controllers/simulation.controller';
import { BaselineSnapshotService } from './services/baseline-snapshot.service';
import { DeterministicImpactService } from './services/deterministic-impact.service';
import { OpportunityForecastingService } from './services/opportunity-forecasting.service';
import { RealismConstraintService } from './services/realism-constraint.service';
import { ScenarioBuilderService } from './services/scenario-builder.service';
import { ScenarioComparisonService } from './services/scenario-comparison.service';
import { SimulationAiService } from './services/simulation-ai.service';
import { SimulationExecutionBridgeService } from './services/simulation-execution-bridge.service';
import { SimulationService } from './services/simulation.service';

@Module({
  imports: [PrismaModule, AiModule, CareerIntelligenceModule],
  controllers: [SimulationController],
  providers: [
    BaselineSnapshotService,
    RealismConstraintService,
    ScenarioBuilderService,
    DeterministicImpactService,
    OpportunityForecastingService,
    ScenarioComparisonService,
    SimulationAiService,
    SimulationExecutionBridgeService,
    SimulationService,
  ],
  exports: [
    SimulationService,
    BaselineSnapshotService,
    RealismConstraintService,
    OpportunityForecastingService,
    ScenarioComparisonService,
  ],
})
export class SimulationModule {}
