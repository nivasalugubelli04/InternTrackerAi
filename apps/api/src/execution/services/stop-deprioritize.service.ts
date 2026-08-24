import { Injectable } from '@nestjs/common';

import { ActionCandidate } from '../interfaces/execution.interfaces';

export interface DeprioritizeRecommendation {
  action: ActionCandidate;
  reason: string;
  recommendedOption: 'PAUSE' | 'REDUCE_SCOPE' | 'ARCHIVE';
  explanation: string;
}

@Injectable()
export class StopDeprioritizeService {
  identifyDeprioritizeCandidates(actions: ActionCandidate[]): DeprioritizeRecommendation[] {
    const recommendations: DeprioritizeRecommendation[] = [];

    for (const action of actions) {
      // 1. Check if action has low priority and high estimated time
      if (
        (action.priority === 'WHEN_POSSIBLE' || action.priority === 'OPTIONAL') &&
        action.estimatedMinutes >= 45
      ) {
        recommendations.push({
          action,
          reason: 'Consumes significant time with low immediate career leverage.',
          recommendedOption: 'PAUSE',
          explanation: `This task takes ~${action.estimatedMinutes} mins but has low immediate alignment with your active priorities. Consider pausing it until major deadlines pass.`,
        });
      }

      // 2. Blocked for long time
      if (action.isBlocked) {
        recommendations.push({
          action,
          reason: 'Action is currently blocked by incomplete prerequisites.',
          recommendedOption: 'REDUCE_SCOPE',
          explanation: `Action cannot proceed until "${action.blockerReason || 'Prerequisite'}" is resolved. Consider focusing on the prerequisite first.`,
        });
      }
    }

    return recommendations.slice(0, 3);
  }
}
