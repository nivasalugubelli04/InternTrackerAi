import { Injectable } from '@nestjs/common';

import { FeatureHealthClassification } from '../dto/product-intelligence.dto';

export interface FeatureAdoptionMetrics {
  featureKey: string;
  featureName: string;
  category: string;
  discoveryPercentage: number;
  trialPercentage: number;
  repeatUsagePercentage: number;
  averageWeeklyActionsPerUser: number;
  healthClassification: FeatureHealthClassification;
  rootCauseAnalysis: string;
}

@Injectable()
export class FeatureAdoptionService {
  async getFeatureAdoptionMatrix(): Promise<FeatureAdoptionMetrics[]> {
    return [
      {
        featureKey: 'OPPORTUNITY_DISCOVERY',
        featureName: 'Opportunity Discovery & Match Engine',
        category: 'Core Job Search',
        discoveryPercentage: 94.0,
        trialPercentage: 86.5,
        repeatUsagePercentage: 74.2,
        averageWeeklyActionsPerUser: 12.8,
        healthClassification: FeatureHealthClassification.HIGH_VALUE,
        rootCauseAnalysis:
          'High user interest in real-time verified internships with match scoring.',
      },
      {
        featureKey: 'APPLICATION_LIFECYCLE',
        featureName: 'Application Pipeline & Kanban Tracker',
        category: 'Organization',
        discoveryPercentage: 91.0,
        trialPercentage: 78.0,
        repeatUsagePercentage: 69.5,
        averageWeeklyActionsPerUser: 8.4,
        healthClassification: FeatureHealthClassification.HIGH_VALUE,
        rootCauseAnalysis:
          'Core daily utility for candidates managing active internship pipelines.',
      },
      {
        featureKey: 'AI_COPILOT',
        featureName: 'Personal AI Career Copilot',
        category: 'AI Guidance',
        discoveryPercentage: 82.0,
        trialPercentage: 71.0,
        repeatUsagePercentage: 58.4,
        averageWeeklyActionsPerUser: 5.2,
        healthClassification: FeatureHealthClassification.GROWING,
        rootCauseAnalysis:
          'Growing adoption driven by multimodal resume tailoring and interview prep.',
      },
      {
        featureKey: 'INTERVIEW_INTELLIGENCE',
        featureName: 'AI Mock Interview Simulator',
        category: 'Interview Preparation',
        discoveryPercentage: 68.0,
        trialPercentage: 45.0,
        repeatUsagePercentage: 38.0,
        averageWeeklyActionsPerUser: 2.6,
        healthClassification: FeatureHealthClassification.GROWING,
        rootCauseAnalysis:
          'Spikes when users reach interview stage; high satisfaction per session.',
      },
      {
        featureKey: 'SKILL_INTELLIGENCE',
        featureName: 'Skill Graph & Gap Analysis',
        category: 'Learning',
        discoveryPercentage: 74.0,
        trialPercentage: 52.0,
        repeatUsagePercentage: 31.0,
        averageWeeklyActionsPerUser: 1.8,
        healthClassification: FeatureHealthClassification.UNDERDISCOVERED,
        rootCauseAnalysis:
          'Candidates need earlier nudge during onboarding to review their skill gap radar.',
      },
      {
        featureKey: 'PORTFOLIO_INTELLIGENCE',
        featureName: 'AI Portfolio & Proof-of-Work Intelligence',
        category: 'Personal Branding',
        discoveryPercentage: 56.0,
        trialPercentage: 34.0,
        repeatUsagePercentage: 22.0,
        averageWeeklyActionsPerUser: 1.2,
        healthClassification: FeatureHealthClassification.UNDERDISCOVERED,
        rootCauseAnalysis:
          'Requires explicit GitHub/repo linking which some users skip during sign up.',
      },
      {
        featureKey: 'CAREER_SIMULATION',
        featureName: 'What-If Career Simulator & Market Forecast',
        category: 'Strategy',
        discoveryPercentage: 48.0,
        trialPercentage: 28.0,
        repeatUsagePercentage: 19.5,
        averageWeeklyActionsPerUser: 0.9,
        healthClassification: FeatureHealthClassification.UNDERDISCOVERED,
        rootCauseAnalysis:
          'Deep strategic value; currently nested inside Career Command Center menu.',
      },
      {
        featureKey: 'NETWORKING_INTELLIGENCE',
        featureName: 'Warm Referral & Outreach Draft Engine',
        category: 'Networking',
        discoveryPercentage: 42.0,
        trialPercentage: 21.0,
        repeatUsagePercentage: 14.0,
        averageWeeklyActionsPerUser: 0.6,
        healthClassification: FeatureHealthClassification.LOW_ADOPTION,
        rootCauseAnalysis:
          'Friction in draft personalization; adding 1-click templates will boost usage.',
      },
    ];
  }
}
