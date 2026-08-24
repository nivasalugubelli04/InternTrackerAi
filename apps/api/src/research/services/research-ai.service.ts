import { Injectable, Inject, Logger, Optional } from '@nestjs/common';

import { AIProvider, AI_PROVIDER_TOKEN } from '../../ai/providers/ai-provider.interface';
import { RelevanceScoreBreakdown } from '../interfaces/research.interfaces';

@Injectable()
export class ResearchAiService {
  private readonly logger = new Logger(ResearchAiService.name);

  constructor(
    @Optional()
    @Inject(AI_PROVIDER_TOKEN)
    private readonly aiProvider?: AIProvider,
  ) {}

  /**
   * Generates a grounded, concise match explanation for a recommended opportunity.
   */
  async generateMatchExplanation(
    targetRole: string | null,
    jobTitle: string,
    companyName: string,
    relevance: RelevanceScoreBreakdown,
  ): Promise<string> {
    if (!this.aiProvider) {
      return this.generateDeterministicFallback(targetRole, jobTitle, companyName, relevance);
    }

    try {
      const prompt = `You are the InternTracker AI Opportunity Matching Advisor.
Explain in 2 concise sentences why this opportunity was recommended for the user.

USER TARGET: ${targetRole || 'Software Engineering'}
OPPORTUNITY: ${jobTitle} at ${companyName}
MATCHING STRENGTHS: ${relevance.matchingStrengths.join('; ')}
CRITICAL GAPS: ${relevance.criticalGaps.join('; ') || 'None'}
READINESS: ${relevance.readinessLevel}

CRITICAL RULES:
1. Ground statements strictly in the matching strengths provided.
2. DO NOT promise guaranteed selection.
3. Be clear, encouraging, and honest about remaining preparation needs.`;

      const response = await this.aiProvider.generateText(
        prompt,
        'You provide transparent, concise career matching rationales.',
        { temperature: 0.2, maxTokens: 120 },
      );

      return (
        response?.text?.trim() ||
        this.generateDeterministicFallback(targetRole, jobTitle, companyName, relevance)
      );
    } catch (err: any) {
      this.logger.warn(
        `AI Provider unavailable for match explanation: ${err.message}. Using deterministic fallback.`,
      );
      return this.generateDeterministicFallback(targetRole, jobTitle, companyName, relevance);
    }
  }

  /**
   * 100% deterministic template fallback.
   */
  generateDeterministicFallback(
    targetRole: string | null,
    jobTitle: string,
    companyName: string,
    relevance: RelevanceScoreBreakdown,
  ): string {
    const strength =
      relevance.matchingStrengths[0] || `Aligns with your focus on ${targetRole || 'Engineering'}.`;
    const gapNote =
      relevance.criticalGaps.length > 0
        ? ` Consider brushing up on ${relevance.criticalGaps[0]} before submitting.`
        : ' Your verified skill profile strongly covers core listed requirements.';

    return `Strong match for ${jobTitle} at ${companyName}. ${strength}${gapNote}`;
  }
}
