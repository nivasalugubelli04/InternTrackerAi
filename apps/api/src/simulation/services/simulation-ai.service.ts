import { Injectable, Inject, Logger, Optional } from '@nestjs/common';

import { AIProvider, AI_PROVIDER_TOKEN } from '../../ai/providers/ai-provider.interface';
import {
  BaselineCareerSnapshot,
  ConstraintValidationResult,
  ImpactAssessment,
  ScenarioType,
  SimulationVariables,
  TimeAllocation,
} from '../interfaces/simulation.interfaces';

@Injectable()
export class SimulationAiService {
  private readonly logger = new Logger(SimulationAiService.name);

  constructor(
    @Optional()
    @Inject(AI_PROVIDER_TOKEN)
    private readonly aiProvider?: AIProvider,
  ) {}

  /**
   * Generates an explainable narrative for a simulation scenario.
   * Grounded strictly on deterministic signals — falls back gracefully on error.
   */
  async generateScenarioNarrative(
    baseline: BaselineCareerSnapshot,
    title: string,
    scenarioType: ScenarioType,
    _variables: SimulationVariables,
    timeAllocation: TimeAllocation,
    impact: ImpactAssessment,
    constraints: ConstraintValidationResult,
  ): Promise<string> {
    if (!this.aiProvider) {
      return this.generateDeterministicFallback(title, scenarioType, impact, constraints);
    }

    try {
      const prompt = `You are the InternTracker AI Career Simulation Advisor.
Generate a concise, insightful 3-paragraph executive summary for this what-if scenario.

CRITICAL RULES:
1. NEVER promise guaranteed employment, selections, or exact probabilities.
2. Clearly distinguish potential benefits, strategic trade-offs, and workload risks.
3. Be candid, realistic, and constructive.

USER BASELINE:
- Target Role: ${baseline.targetRole || 'Software Engineer'}
- Skills Cataloged: ${baseline.skills.length}
- Projects in Portfolio: ${baseline.projects.length} (Deployed: ${baseline.projects.filter((p) => p.isDeployed).length})
- Active Applications: ${baseline.activeApplicationCount}
- Configured Capacity: ${constraints.maxWeeklyHoursAvailable}h/week

SCENARIO:
- Title: ${title} (${scenarioType})
- Time Allocation: Learning ${timeAllocation.learningPercent}%, Projects ${timeAllocation.projectsPercent}%, Apps ${timeAllocation.applicationsPercent}%, Interviews ${timeAllocation.interviewPrepPercent}%, Networking ${timeAllocation.networkingPercent}%
- Weekly Hours Demanded: ${constraints.totalWeeklyHoursRequired}h (${constraints.utilizationPercentage}% capacity)
- Key Benefits: ${impact.benefits.join('; ')}
- Key Trade-offs: ${impact.tradeOffs.join('; ')}
- Primary Risk: ${impact.risks[0]?.description || 'None'}

Provide:
1. Executive Strategy Summary
2. Key Trade-offs & High-Leverage Actions
3. Risk Mitigation & Next Step Recommendation`;

      const response = await this.aiProvider.generateText(
        prompt,
        'You are an expert career strategist and simulation analyst.',
        {
          temperature: 0.3,
          maxTokens: 500,
        },
      );

      return (
        response?.text?.trim() ||
        this.generateDeterministicFallback(title, scenarioType, impact, constraints)
      );
    } catch (err: any) {
      this.logger.warn(
        `AI Provider unavailable for scenario narrative: ${err.message}. Using deterministic fallback.`,
      );
      return this.generateDeterministicFallback(title, scenarioType, impact, constraints);
    }
  }

  /**
   * 100% deterministic template fallback when AI provider is offline.
   */
  generateDeterministicFallback(
    title: string,
    scenarioType: ScenarioType,
    impact: ImpactAssessment,
    constraints: ConstraintValidationResult,
  ): string {
    const benefitText =
      impact.benefits.length > 0
        ? impact.benefits.join(' ')
        : 'Provides steady, structured weekly progress.';
    const tradeOffText =
      impact.tradeOffs.length > 0
        ? impact.tradeOffs.join(' ')
        : 'Balanced allocation requires consistent focus.';
    const workloadNote = constraints.isRealistic
      ? `This scenario demands ${constraints.totalWeeklyHoursRequired}h/week (${constraints.utilizationPercentage}% of your available capacity), which fits comfortably within your schedule.`
      : `⚠️ Caution: This scenario requires ${constraints.totalWeeklyHoursRequired}h/week (${constraints.utilizationPercentage}% of capacity). Consider scaling back weekly targets to prevent execution fatigue.`;

    return (
      `### Strategy Overview: ${title}\n` +
      `This ${scenarioType.replace(/_/g, ' ')} strategy focuses your energy on high-impact milestones. ${benefitText}\n\n` +
      `### Trade-offs & Workload:\n` +
      `${tradeOffText} ${workloadNote}\n\n` +
      `### Recommendation:\n` +
      `If you choose to adopt this path, convert it into an active Phase 45 Career Sprint to automatically distribute daily action items into your morning queue.`
    );
  }
}
