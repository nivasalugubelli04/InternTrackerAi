import { Injectable } from '@nestjs/common';

import { ActionCandidate } from '../interfaces/execution.interfaces';

export interface DeadlineRiskAssessment {
  criticalDeadlines: {
    title: string;
    source: string;
    deadline: Date;
    daysRemaining: number;
    hoursRemaining: number;
    recommendedStep: string;
  }[];
  approachingDeadlines: {
    title: string;
    source: string;
    deadline: Date;
    daysRemaining: number;
    recommendedStep: string;
  }[];
}

@Injectable()
export class DeadlineIntelligenceService {
  assessDeadlines(actions: ActionCandidate[]): DeadlineRiskAssessment {
    const now = new Date();
    const criticalDeadlines: DeadlineRiskAssessment['criticalDeadlines'] = [];
    const approachingDeadlines: DeadlineRiskAssessment['approachingDeadlines'] = [];

    for (const action of actions) {
      if (!action.deadline) continue;

      const deadline = new Date(action.deadline);
      const diffMs = deadline.getTime() - now.getTime();
      const hoursRemaining = Math.max(0, Math.round(diffMs / (1000 * 60 * 60)));
      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (hoursRemaining <= 48) {
        criticalDeadlines.push({
          title: action.title,
          source: action.source,
          deadline,
          daysRemaining: Math.max(0, daysRemaining),
          hoursRemaining,
          recommendedStep: action.suggestedNextStep || 'Prioritize immediately in today’s plan.',
        });
      } else if (daysRemaining <= 7) {
        approachingDeadlines.push({
          title: action.title,
          source: action.source,
          deadline,
          daysRemaining,
          recommendedStep: action.suggestedNextStep || 'Schedule preparation block this week.',
        });
      }
    }

    criticalDeadlines.sort((a, b) => a.hoursRemaining - b.hoursRemaining);
    approachingDeadlines.sort((a, b) => a.daysRemaining - b.daysRemaining);

    return {
      criticalDeadlines,
      approachingDeadlines,
    };
  }
}
