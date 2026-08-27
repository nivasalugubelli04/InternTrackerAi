import { Injectable } from '@nestjs/common';

export interface FeedbackClusterTrend {
  topic: string;
  category: string;
  feedbackCount: number;
  sentiment: 'NEGATIVE' | 'NEUTRAL' | 'POSITIVE';
  growthRatePercentage: number;
  sampleQuotes: string[];
  impactedFeature: string;
  recommendedResolution: string;
}

export interface KnowledgeGapItem {
  questionTheme: string;
  frequencyCount: number;
  primaryChannel: 'SUPPORT_TICKET' | 'IN_APP_FEEDBACK' | 'AI_CHAT';
  productRootCause: string;
  suggestedImprovement: string;
}

@Injectable()
export class FeedbackIntelligenceService {
  async getFeedbackTrends(): Promise<FeedbackClusterTrend[]> {
    return [
      {
        topic: 'Request for automatic calendar sync for mock interviews',
        category: 'FEATURE_REQUEST',
        feedbackCount: 18,
        sentiment: 'POSITIVE',
        growthRatePercentage: 35.0,
        sampleQuotes: [
          'Would love if my scheduled mock interview synced directly with Google Calendar.',
          'Please add iCal export for upcoming interview preparation slots.',
        ],
        impactedFeature: 'INTERVIEW_INTELLIGENCE',
        recommendedResolution:
          'Implement 1-click Google Calendar & Apple Calendar .ics export on scheduled prep.',
      },
      {
        topic: 'Quant and Trading internship recommendations are too general',
        category: 'CAREER_RELEVANCE',
        feedbackCount: 12,
        sentiment: 'NEGATIVE',
        growthRatePercentage: 20.0,
        sampleQuotes: [
          'Suggested web dev projects for a Jane Street trading internship.',
          'Need specific C++ / low-latency project suggestions for algorithmic trading roles.',
        ],
        impactedFeature: 'CAREER_INTELLIGENCE_MATCHING',
        recommendedResolution:
          'Enrich quantitative finance ontology in skills radar with stochastic calculus and C++17/20.',
      },
      {
        topic: 'Mobile dark mode toggle is hard to find in profile settings',
        category: 'UX_ISSUE',
        feedbackCount: 9,
        sentiment: 'NEUTRAL',
        growthRatePercentage: 10.0,
        sampleQuotes: [
          'Where is the dark mode switch on mobile?',
          'Could dark mode follow system preferences automatically?',
        ],
        impactedFeature: 'MOBILE_SETTINGS',
        recommendedResolution:
          'Default mobile theme to system appearance and elevate appearance toggle to top of Settings.',
      },
    ];
  }

  async getKnowledgeGaps(): Promise<KnowledgeGapItem[]> {
    return [
      {
        questionTheme: 'How to export full personal career data?',
        frequencyCount: 15,
        primaryChannel: 'SUPPORT_TICKET',
        productRootCause:
          'Users look in Account Settings rather than finding Privacy & Data Control.',
        suggestedImprovement:
          'Add a direct "Download My Data" shortcut button under Account Settings.',
      },
      {
        questionTheme: 'How are opportunity match scores calculated?',
        frequencyCount: 22,
        primaryChannel: 'AI_CHAT',
        productRootCause: 'Candidates want transparency into why a job is scored 92% vs 84%.',
        suggestedImprovement:
          'Add an interactive "Why this match?" breakdown tooltip next to the match percentage badge.',
      },
    ];
  }
}
