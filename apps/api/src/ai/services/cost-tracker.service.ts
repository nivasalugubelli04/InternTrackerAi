import { Injectable, Logger } from '@nestjs/common';

export interface TokenCost {
  inputCostPerMillion: number;
  outputCostPerMillion: number;
}

@Injectable()
export class CostTrackerService {
  private readonly logger = new Logger(CostTrackerService.name);

  private readonly pricing: Record<string, TokenCost> = {
    'gpt-4o-mini': { inputCostPerMillion: 0.15, outputCostPerMillion: 0.6 },
    'gpt-4o': { inputCostPerMillion: 2.5, outputCostPerMillion: 10.0 },
    'gemini-1.5-flash': { inputCostPerMillion: 0.075, outputCostPerMillion: 0.3 },
    'gemini-1.5-pro': { inputCostPerMillion: 1.25, outputCostPerMillion: 5.0 },
  };

  /**
   * Calculates the estimated cost of an LLM call in USD.
   */
  calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const matchedModel = Object.keys(this.pricing).find((key) => model.toLowerCase().includes(key));
    const price = matchedModel ? this.pricing[matchedModel] : this.pricing['gemini-1.5-flash'];

    if (!price) return 0;

    const inputCost = (inputTokens / 1_000_000) * price.inputCostPerMillion;
    const outputCost = (outputTokens / 1_000_000) * price.outputCostPerMillion;
    const totalCost = inputCost + outputCost;

    this.logger.debug(
      {
        model,
        inputTokens,
        outputTokens,
        totalCost: `$${totalCost.toFixed(6)}`,
      },
      'Cost computed',
    );

    return totalCost;
  }
}
