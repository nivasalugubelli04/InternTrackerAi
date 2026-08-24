import { Injectable, Logger } from '@nestjs/common';

import { ScenarioResultDto, SimulationComparisonResult } from '../interfaces/simulation.interfaces';

@Injectable()
export class ScenarioComparisonService {
  private readonly logger = new Logger(ScenarioComparisonService.name);

  /**
   * Performs multi-scenario side-by-side comparative analysis.
   * Identifies the optimal balanced strategy with explicit rationale, trade-offs, and confidence.
   */
  compareScenarios(
    simulationId: string,
    scenarios: ScenarioResultDto[],
  ): SimulationComparisonResult {
    this.logger.log(`Comparing ${scenarios.length} scenarios for simulation ${simulationId}`);

    const matrixItems = scenarios.map((s) => {
      const dimScores: any = {};
      for (const [dim, scoreObj] of Object.entries(s.impactAssessment.dimensions)) {
        dimScores[dim] = {
          score: scoreObj.score,
          direction: scoreObj.direction,
        };
      }

      return {
        key: s.scenarioKey,
        title: s.title,
        isRecommended: false,
        confidenceLevel: s.confidenceLevel,
        overallScore: s.impactAssessment.overallImpactScore,
        utilizationPercentage: s.impactAssessment.dimensions.EXECUTION_LOAD?.score || 100,
        dimensionScores: dimScores,
        topBenefit: s.impactAssessment.benefits[0] || 'Steady baseline progression.',
        topTradeOff: s.impactAssessment.tradeOffs[0] || 'Standard balanced distribution.',
        topRisk:
          s.impactAssessment.risks[0]?.description || 'Maintain consistent weekly execution.',
      };
    });

    // Determine Best Balanced Strategy
    // Filter to realistic scenarios, then find the highest score with sustainable workload (<= 115%)
    const realisticScenarios = scenarios.filter((s) => s.isRealistic);
    const candidateList = realisticScenarios.length > 0 ? realisticScenarios : scenarios;

    // Prefer scenarios with high overall score, balanced portfolio/skills, and moderate load
    let bestScenario = candidateList[0];
    let bestScore = -1;

    for (const candidate of candidateList) {
      const load = candidate.impactAssessment.dimensions.EXECUTION_LOAD?.score || 100;
      const penalty = load > 120 ? 25 : load > 105 ? 10 : 0;
      const compositeScore = candidate.impactAssessment.overallImpactScore - penalty;

      if (compositeScore > bestScore) {
        bestScore = compositeScore;
        bestScenario = candidate;
      }
    }

    const bestOptionKey = bestScenario?.scenarioKey || (scenarios[0]?.scenarioKey ?? 'SCENARIO_C');

    // Mark recommendation flag on matrix
    for (const item of matrixItems) {
      if (item.key === bestOptionKey) {
        item.isRecommended = true;
      }
    }

    const recReason = bestScenario
      ? `"${bestScenario.title}" delivers the highest composite career momentum (+${bestScenario.impactAssessment.overallImpactScore} score) while maintaining sustainable weekly execution capacity without severe burnout risks.`
      : 'Select the strategy that best aligns with your immediate career priorities and weekly availability.';

    return {
      simulationId,
      bestOptionKey,
      recommendationReason: recReason,
      comparisonMatrix: {
        scenarios: matrixItems,
      },
    };
  }
}
