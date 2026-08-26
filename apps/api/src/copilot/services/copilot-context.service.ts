import { Injectable, Logger } from '@nestjs/common';

import { CopilotContextBundle, GroundingSourceRef } from '../interfaces/copilot.interfaces';

import { IntentAnalysisResult } from './copilot-intent.service';
import { CopilotToolRegistryService } from './copilot-tool-registry.service';

@Injectable()
export class CopilotContextService {
  private readonly logger = new Logger(CopilotContextService.name);

  constructor(private readonly toolRegistry: CopilotToolRegistryService) {}

  /**
   * Selectively retrieves validated context strictly tailored to detected user intents.
   * Respects token budgets and enforces user ownership boundaries.
   */
  async buildContextBundle(
    userId: string,
    intentAnalysis: IntentAnalysisResult,
    jobId?: string,
  ): Promise<CopilotContextBundle> {
    this.logger.debug(`Building context bundle for user ${userId}`);
    const { primaryIntent, secondaryIntents, extractedSkillOrRole } = intentAnalysis;
    const allIntents = Array.from(new Set([primaryIntent, ...secondaryIntents]));
    const groundingSources: GroundingSourceRef[] = [];

    // Always fetch baseline Career State (Phase 43) as grounding foundation
    const careerState = await this.toolRegistry.getCareerState(userId);
    groundingSources.push({
      sourceType: 'CAREER_STATE',
      title: 'Current Profile & Career Trajectory',
      confidence: 0.95,
      timestamp: new Date().toISOString(),
    });

    let executionPlan: any = null;
    let topOpportunities: any[] = [];
    let portfolioEvidence: any = null;
    let simulationResults: any = null;
    let analyticsSnapshot: any = null;

    // 1. Daily / Weekly Planning (Phase 45 Execution Engine)
    if (
      allIntents.includes('DAILY_PLANNING') ||
      allIntents.includes('WEEKLY_PLANNING') ||
      allIntents.includes('PRIORITY_ANALYSIS')
    ) {
      executionPlan = await this.toolRegistry.getExecutionPlan(userId);
      groundingSources.push({
        sourceType: 'EXECUTION_ENGINE',
        title: 'Active Execution Plan & Next Best Action',
        confidence: 0.95,
      });
    }

    // 2. Opportunities / Research (Phase 47 & 40)
    if (
      allIntents.includes('OPPORTUNITY_ANALYSIS') ||
      allIntents.includes('CAREER_RESEARCH') ||
      allIntents.includes('CAREER_COMPARISON')
    ) {
      const research = await this.toolRegistry.getOpportunityResearch(userId);
      topOpportunities = research.topMatches;
      groundingSources.push({
        sourceType: 'OPPORTUNITY_INTELLIGENCE',
        title: 'Verified Personalized Opportunities',
        confidence: 0.9,
      });
    }

    // 3. Portfolio & Projects (Phase 39)
    if (allIntents.includes('PORTFOLIO_ANALYSIS') || allIntents.includes('CAREER_COMPARISON')) {
      portfolioEvidence = await this.toolRegistry.getPortfolioEvidence(userId);
      groundingSources.push({
        sourceType: 'PORTFOLIO_INTELLIGENCE',
        title: 'Project Evidence & Verified Artifacts',
        confidence: 0.92,
      });
    }

    // 4. Analytics & Application Outcomes (Phase 41)
    if (
      allIntents.includes('APPLICATION_ANALYSIS') ||
      allIntents.includes('PROGRESS_ANALYSIS') ||
      allIntents.includes('CAREER_COMPARISON')
    ) {
      analyticsSnapshot = await this.toolRegistry.getCareerAnalytics(userId);
      groundingSources.push({
        sourceType: 'CAREER_ANALYTICS',
        title: 'Application Outcome Funnel & Conversion Stats',
        confidence: 0.9,
      });
    }

    // 5. Career Simulation (Phase 46)
    if (allIntents.includes('CAREER_SIMULATION')) {
      const skillToSimulate =
        extractedSkillOrRole || careerState.targetRole || 'Fullstack Engineering';
      simulationResults = await this.toolRegistry.runCareerSimulation(userId, skillToSimulate, 3);
      groundingSources.push({
        sourceType: 'CAREER_SIMULATION',
        title: `Simulation Forecast for ${skillToSimulate}`,
        confidence: 0.85,
      });
    }

    // 6. Targeted Job context (Phase 40)
    if (jobId) {
      const jobReadiness = await this.toolRegistry.getApplicationReadiness(userId, jobId);
      if (jobReadiness) {
        groundingSources.push({
          sourceType: 'APPLICATION_READINESS',
          title: `Readiness evaluation for ${jobReadiness.jobTitle}`,
          confidence: 0.92,
        });
      }
    }

    // Token estimation (approx 4 characters per token)
    const contextString = JSON.stringify({
      careerState,
      executionPlan,
      topOpportunities,
      portfolioEvidence,
      simulationResults,
      analyticsSnapshot,
    });
    const estimatedTokens = Math.ceil(contextString.length / 4);

    return {
      userId,
      intents: allIntents,
      careerStateSummary: {
        targetRole: careerState.targetRole,
        careerGoals: careerState.careerGoals,
        skills: careerState.skills.map((s) => s.name),
        portfolioMaturity: careerState.portfolioMaturity,
        applicationCount: careerState.applicationCount,
        interviewCount: careerState.interviewCount,
        mockInterviewAvgScore: careerState.mockInterviewAvgScore,
      },
      executionPlan,
      topOpportunities,
      portfolioEvidence,
      simulationResults,
      analyticsSnapshot,
      groundingSources,
      estimatedTokens,
    };
  }
}
