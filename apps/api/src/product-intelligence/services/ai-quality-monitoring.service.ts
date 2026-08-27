import { Injectable } from '@nestjs/common';

export interface AiFeatureQualityTelemetry {
  featureKey: string;
  featureName: string;
  totalInvocations: number;
  successRatePercentage: number;
  failoverRatePercentage: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  userThumbsUpPercentage: number;
  topPromptImprovementProposal: string;
}

@Injectable()
export class AiQualityMonitoringService {
  async getAiQualityReport(): Promise<AiFeatureQualityTelemetry[]> {
    return [
      {
        featureKey: 'CAREER_COPILOT',
        featureName: 'AI Career Copilot Orchestrator',
        totalInvocations: 1240,
        successRatePercentage: 99.6,
        failoverRatePercentage: 0.8,
        avgLatencyMs: 740,
        p95LatencyMs: 1420,
        userThumbsUpPercentage: 94.2,
        topPromptImprovementProposal:
          'Inject student academic year and graduation date into system prompt context to prevent out-of-season recommendations.',
      },
      {
        featureKey: 'RESUME_OPTIMIZATION',
        featureName: 'Multimodal Resume Studio & Tailoring',
        totalInvocations: 850,
        successRatePercentage: 99.2,
        failoverRatePercentage: 1.1,
        avgLatencyMs: 1120,
        p95LatencyMs: 2150,
        userThumbsUpPercentage: 91.8,
        topPromptImprovementProposal:
          'Enforce strict JSON schema validation on quantified bullet outputs with verb-metric-outcome structuring.',
      },
      {
        featureKey: 'INTERVIEW_SIMULATION',
        featureName: 'Mock Interview Simulator & Rubric Scoring',
        totalInvocations: 420,
        successRatePercentage: 99.8,
        failoverRatePercentage: 0.4,
        avgLatencyMs: 890,
        p95LatencyMs: 1650,
        userThumbsUpPercentage: 96.0,
        topPromptImprovementProposal:
          'Add calibrated difficulty scaling based on candidate year of study (e.g. Freshman vs Senior Master level).',
      },
      {
        featureKey: 'CAREER_SIMULATION',
        featureName: 'What-If Career Scenario & Trajectory Engine',
        totalInvocations: 280,
        successRatePercentage: 98.9,
        failoverRatePercentage: 1.4,
        avgLatencyMs: 1350,
        p95LatencyMs: 2800,
        userThumbsUpPercentage: 89.5,
        topPromptImprovementProposal:
          'Ground salary forecasts in real-time BLS & Levels.fyi cached benchmarks rather than unconstrained estimation.',
      },
    ];
  }
}
