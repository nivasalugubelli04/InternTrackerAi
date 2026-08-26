import { Module } from '@nestjs/common';

import { AiModule } from '../ai/ai.module';
import { PrismaModule } from '../prisma/prisma.module';

import { OptimizationController } from './controllers/optimization.controller';
import { EffectivenessMeasurementService } from './services/effectiveness-measurement.service';
import { LearnedPreferenceService } from './services/learned-preference.service';
import { OptimizationInsightService } from './services/optimization-insight.service';
import { OptimizationService } from './services/optimization.service';
import { PatternAnalysisService } from './services/pattern-analysis.service';
import { SignalCollectorService } from './services/signal-collector.service';
import { StrategyExperimentService } from './services/strategy-experiment.service';
import { StrategyProposalService } from './services/strategy-proposal.service';

@Module({
  imports: [PrismaModule, AiModule],
  controllers: [OptimizationController],
  providers: [
    SignalCollectorService,
    PatternAnalysisService,
    EffectivenessMeasurementService,
    OptimizationInsightService,
    StrategyProposalService,
    StrategyExperimentService,
    LearnedPreferenceService,
    OptimizationService,
  ],
  exports: [
    SignalCollectorService,
    PatternAnalysisService,
    EffectivenessMeasurementService,
    OptimizationInsightService,
    StrategyProposalService,
    StrategyExperimentService,
    LearnedPreferenceService,
    OptimizationService,
  ],
})
export class OptimizationModule {}
