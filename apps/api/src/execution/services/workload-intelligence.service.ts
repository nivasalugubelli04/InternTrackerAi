import { Injectable } from '@nestjs/common';

import {
  ActionCandidate,
  UserExecutionPreferenceDto,
  WorkloadAssessment,
} from '../interfaces/execution.interfaces';

@Injectable()
export class WorkloadIntelligenceService {
  assessWorkload(
    actions: ActionCandidate[],
    preferences?: Partial<UserExecutionPreferenceDto>,
  ): WorkloadAssessment {
    const dailyAvailableMinutes = preferences?.dailyAvailableMinutes || 60;
    const maxDailyActions = preferences?.maxDailyActions || 3;

    // Filter unblocked, active actions for today's consideration
    const activeActions = actions.filter((a) => !a.isBlocked);
    const totalMinutes = activeActions.reduce((sum, a) => sum + (a.estimatedMinutes || 30), 0);
    const totalActionsCount = activeActions.length;

    let risk: 'BALANCED' | 'MODERATE' | 'OVERLOADED' = 'BALANCED';
    let explanation = 'Your daily plan is well balanced with your available time budget.';
    const deprioritizeSuggestions: WorkloadAssessment['deprioritizeSuggestions'] = [];

    if (totalMinutes > dailyAvailableMinutes * 1.5 || totalActionsCount > maxDailyActions + 3) {
      risk = 'OVERLOADED';
      explanation = `Active commitments (${totalMinutes} mins across ${totalActionsCount} actions) exceed your target capacity (${dailyAvailableMinutes} mins, ${maxDailyActions} actions).`;

      // Suggest deprioritizing low priority or optional actions
      const lowPriorityActions = actions
        .filter((a) => a.priority === 'WHEN_POSSIBLE' || a.priority === 'OPTIONAL')
        .slice(0, 3);

      for (const item of lowPriorityActions) {
        deprioritizeSuggestions.push({
          actionTitle: item.title,
          reason: 'Lower immediate urgency compared to active deadlines.',
          suggestedOption: 'PAUSE',
        });
      }
    } else if (totalMinutes > dailyAvailableMinutes || totalActionsCount > maxDailyActions) {
      risk = 'MODERATE';
      explanation = `Moderate workload. Focus on top ${maxDailyActions} actions today to maintain steady execution momentum.`;
    }

    return {
      risk,
      totalEstimatedMinutes: totalMinutes,
      availableMinutes: dailyAvailableMinutes,
      totalActionsCount,
      maxDailyActions,
      explanation,
      deprioritizeSuggestions,
    };
  }
}
