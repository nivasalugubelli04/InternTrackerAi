import { Injectable } from '@nestjs/common';

import { SignalPriority, SignalCategory } from '../interfaces/engagement.interfaces';

@Injectable()
export class EngagementPriorityService {
  /**
   * Computes deterministic engagement priority based on domain rules.
   */
  evaluatePriority(params: {
    category: SignalCategory;
    deadlineHours?: number | undefined;
    interviewHours?: number | undefined;
    matchScore?: number | undefined;
    daysInactive?: number | undefined;
  }): SignalPriority {
    // 1. Interview Urgency
    if (params.interviewHours !== undefined) {
      if (params.interviewHours <= 24) return 'CRITICAL';
      if (params.interviewHours <= 72) return 'HIGH';
      return 'MEDIUM';
    }

    // 2. Application Deadline Urgency
    if (params.deadlineHours !== undefined) {
      if (params.deadlineHours <= 24) return 'CRITICAL';
      if (params.deadlineHours <= 48) return 'HIGH';
      if (params.deadlineHours <= 120) return 'MEDIUM';
      return 'LOW';
    }

    // 3. High-Match Opportunity
    if (params.category === 'OPPORTUNITY_MATCH' && params.matchScore !== undefined) {
      if (params.matchScore >= 92) return 'HIGH';
      if (params.matchScore >= 80) return 'MEDIUM';
      return 'LOW';
    }

    // 4. Inactivity Re-engagement
    if (params.category === 'INACTIVITY_DETECTED' && params.daysInactive !== undefined) {
      if (params.daysInactive >= 14) return 'MEDIUM';
      if (params.daysInactive >= 7) return 'MEDIUM';
      return 'LOW';
    }

    // 5. Default category mappings
    switch (params.category) {
      case 'INTERVIEW_UPCOMING':
      case 'DEADLINE_APPROACHING':
        return 'HIGH';
      case 'APPLICATION_STAGNANT':
      case 'SKILL_GAP_ALERT':
      case 'COPILOT_PROPOSAL':
      case 'TASK_OVERDUE':
        return 'MEDIUM';
      case 'PORTFOLIO_IMPROVEMENT':
      case 'RESEARCH_INSIGHT':
      case 'MILESTONE_ACHIEVED':
      default:
        return 'LOW';
    }
  }
}
