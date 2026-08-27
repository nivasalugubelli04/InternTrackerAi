import { Injectable } from '@nestjs/common';

export interface CohortRow {
  cohortWeek: string;
  cohortSize: number;
  d1Retention: number;
  d7Retention: number;
  d14Retention: number;
  d30Retention: number;
}

export interface RetentionCorrelationItem {
  userAction: string;
  correlationScore: number; // -1.0 to 1.0
  impactDescription: string;
}

export interface EngagementScoreModel {
  dimensions: Array<{
    name: string;
    weight: number;
    description: string;
  }>;
  distribution: {
    powerUsersPercentage: number; // Highly active
    regularUsersPercentage: number; // Weekly active
    casualUsersPercentage: number; // Bi-weekly
    atRiskPercentage: number; // Inactive 14+ days
  };
}

@Injectable()
export class RetentionCohortService {
  async getCohortMatrix(): Promise<CohortRow[]> {
    return [
      {
        cohortWeek: '2026-W31 (Aug 1 - Aug 7)',
        cohortSize: 45,
        d1Retention: 84.4,
        d7Retention: 68.9,
        d14Retention: 57.8,
        d30Retention: 48.9,
      },
      {
        cohortWeek: '2026-W32 (Aug 8 - Aug 14)',
        cohortSize: 58,
        d1Retention: 86.2,
        d7Retention: 70.7,
        d14Retention: 60.3,
        d30Retention: 51.7,
      },
      {
        cohortWeek: '2026-W33 (Aug 15 - Aug 21)',
        cohortSize: 64,
        d1Retention: 87.5,
        d7Retention: 73.4,
        d14Retention: 64.1,
        d30Retention: 54.7,
      },
      {
        cohortWeek: '2026-W34 (Aug 22 - Aug 28)',
        cohortSize: 72,
        d1Retention: 88.9,
        d7Retention: 75.0,
        d14Retention: 66.7,
        d30Retention: 58.3,
      },
    ];
  }

  getRetentionCorrelations(): RetentionCorrelationItem[] {
    return [
      {
        userAction: 'Tracking >= 3 internship applications in Week 1',
        correlationScore: 0.82,
        impactDescription:
          'Users who log 3+ applications have a 3.4x higher 30-day retention probability.',
      },
      {
        userAction: 'Setting up AI Copilot target roles in onboarding',
        correlationScore: 0.74,
        impactDescription: 'Personalized prompt context leads to 2.8x more return sessions.',
      },
      {
        userAction: 'Reviewing skill radar gap analysis',
        correlationScore: 0.65,
        impactDescription:
          'Candidates actively addressing skill deficits show 2.2x higher weekly engagement.',
      },
      {
        userAction: 'Zero search results encountered on first search',
        correlationScore: -0.68,
        impactDescription: 'High risk of instant abandonment without relaxed filter hints.',
      },
    ];
  }

  getEngagementModel(): EngagementScoreModel {
    return {
      dimensions: [
        {
          name: 'Application Pipeline Activity',
          weight: 0.35,
          description: 'Creating, updating, and advancing job cards',
        },
        {
          name: 'AI Copilot & Tool Interactions',
          weight: 0.25,
          description: 'Queries, simulations, resume tailoring',
        },
        {
          name: 'Recency & Return Frequency',
          weight: 0.25,
          description: 'Logins and active days in rolling 14 days',
        },
        {
          name: 'Profile & Goal Completion',
          weight: 0.15,
          description: 'Defined target roles, skills, and portfolio links',
        },
      ],
      distribution: {
        powerUsersPercentage: 24.5,
        regularUsersPercentage: 44.0,
        casualUsersPercentage: 21.5,
        atRiskPercentage: 10.0,
      },
    };
  }
}
