import { Injectable } from '@nestjs/common';

export interface UserFrictionSignal {
  signalType: string;
  featureName: string;
  affectedUserCount: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  frictionPattern: string;
  recommendedMitigation: string;
}

export interface ChurnRiskProfile {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  userCount: number;
  leadingIndicators: string[];
  reengagementStrategy: string;
}

@Injectable()
export class JourneyFrictionService {
  async detectFrictionSignals(): Promise<UserFrictionSignal[]> {
    return [
      {
        signalType: 'ABANDONED_UPGRADE_MODAL',
        featureName: 'PRO_SUBSCRIPTION_CHECKOUT',
        affectedUserCount: 14,
        severity: 'HIGH',
        description:
          'Candidates open the annual PRO plan modal but exit before entering payment information.',
        frictionPattern: 'Click "Upgrade to PRO" -> View modal 12s -> Click Close',
        recommendedMitigation:
          'Highlight student 40% discount badge and monthly option alongside annual.',
      },
      {
        signalType: 'REPEATED_AI_REGENERATION',
        featureName: 'AI_RESUME_BULLET_GENERATOR',
        affectedUserCount: 22,
        severity: 'MEDIUM',
        description: 'Candidates regenerate tailored resume bullets 3+ times consecutively.',
        frictionPattern: 'Trigger bullet optimization -> Discard -> Regenerate x3',
        recommendedMitigation:
          'Add selectable tone chips (e.g. "Action-Oriented", "Metrics-Heavy", "Concise").',
      },
      {
        signalType: 'SEARCH_ZERO_RESULTS_LOOP',
        featureName: 'OPPORTUNITY_SEARCH',
        affectedUserCount: 9,
        severity: 'MEDIUM',
        description:
          'Users applying strict location + stipend filters receive zero results without fallback hints.',
        frictionPattern: 'Query specialized role + location -> 0 results -> Repeat identical query',
        recommendedMitigation:
          'Provide "Did you mean" relax-filter suggestions (e.g. Expand to Remote).',
      },
    ];
  }

  async getChurnRiskAnalysis(): Promise<ChurnRiskProfile[]> {
    return [
      {
        riskLevel: 'CRITICAL',
        userCount: 8,
        leadingIndicators: [
          'No login for 21+ days after tracking 1 application',
          'Dismissed 2 consecutive weekly opportunity digests',
          'Encountered failed scraper sync on saved company',
        ],
        reengagementStrategy:
          'Send personalized high-match internship alert (95%+ match) with 1-click apply.',
      },
      {
        riskLevel: 'MEDIUM',
        userCount: 24,
        leadingIndicators: [
          'Completed profile but tracked 0 applications in 14 days',
          'Opened AI Copilot once without follow-up questions',
        ],
        reengagementStrategy:
          'In-app nudge: "3 companies matching your target roles are closing deadlines this week."',
      },
      {
        riskLevel: 'LOW',
        userCount: 140,
        leadingIndicators: [
          'Active within last 5 days',
          'Multiple active applications in Interview/Applied stage',
        ],
        reengagementStrategy:
          'Maintain normal weekly milestone updates and celebration notifications.',
      },
    ];
  }
}
