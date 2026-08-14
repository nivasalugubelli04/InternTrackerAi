import { Injectable, Logger } from '@nestjs/common';
import { Counter, Histogram } from 'prom-client';

export interface TokenCost {
  inputCostPerMillion: number;
  outputCostPerMillion: number;
}

@Injectable()
export class CostTrackerService {
  private readonly logger = new Logger(CostTrackerService.name);
  private sessionTotalCost = 0;

  private aiCostTotal: Counter<string>;
  private aiTokensTotal: Counter<string>;
  private aiLatency: Histogram<string>;

  constructor() {
    this.aiCostTotal = new Counter({
      name: 'ai_cost_usd_total',
      help: 'Total estimated AI cost in USD',
      labelNames: ['model', 'feature'],
    });

    this.aiTokensTotal = new Counter({
      name: 'ai_tokens_total',
      help: 'Total tokens used by AI',
      labelNames: ['model', 'type'],
    });

    this.aiLatency = new Histogram({
      name: 'ai_request_duration_seconds',
      help: 'Latency of AI provider requests',
      labelNames: ['model', 'feature'],
      buckets: [0.5, 1, 2, 5, 10, 20, 30, 60],
    });
  }

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

  recordMetrics(
    model: string,
    feature: string,
    inputTokens: number,
    outputTokens: number,
    latencyMs: number,
  ): number {
    const cost = this.calculateCost(model, inputTokens, outputTokens);
    this.sessionTotalCost += cost;
    this.aiCostTotal.labels(model, feature).inc(cost);
    this.aiTokensTotal.labels(model, 'input').inc(inputTokens);
    this.aiTokensTotal.labels(model, 'output').inc(outputTokens);
    this.aiLatency.labels(model, feature).observe(latencyMs / 1000);
    return cost;
  }

  getTotalCost(): number {
    return this.sessionTotalCost;
  }
}
