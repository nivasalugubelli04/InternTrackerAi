import { Injectable } from '@nestjs/common';

import { ActionCandidate, NextBestActionResponse } from '../interfaces/execution.interfaces';

@Injectable()
export class NextBestActionService {
  selectNextBestAction(candidates: ActionCandidate[]): NextBestActionResponse | null {
    if (!candidates || candidates.length === 0) {
      return null;
    }

    // Filter unblocked candidate actions
    const unblockedCandidates = candidates.filter((c) => !c.isBlocked);
    const pool = unblockedCandidates.length > 0 ? unblockedCandidates : candidates;

    if (pool.length === 0) {
      return null;
    }

    // Score candidates based on multi-factor heuristic
    const scored = pool.map((item) => {
      let score = item.relevanceScore || 50;

      // Urgency boost
      if (item.priority === 'CRITICAL') score += 40;
      else if (item.priority === 'HIGH') score += 25;
      else if (item.priority === 'IMPORTANT') score += 10;

      // Source impact
      if (item.source === 'INTERVIEW') score += 35;
      else if (item.source === 'APPLICATION') score += 20;
      else if (item.source === 'LEARNING') score += 15;
      else if (item.source === 'PORTFOLIO') score += 12;

      // Deadline proximity
      if (item.deadline) {
        const now = new Date();
        const hoursLeft = (new Date(item.deadline).getTime() - now.getTime()) / (1000 * 60 * 60);
        if (hoursLeft <= 48) score += 30;
        else if (hoursLeft <= 120) score += 15;
      }

      // Penalize blocked
      if (item.isBlocked) score -= 50;

      return { item, calculatedScore: score };
    });

    scored.sort((a, b) => b.calculatedScore - a.calculatedScore);
    const top = scored[0];

    if (!top) {
      return null;
    }

    const urgencyLabel =
      top.item.priority === 'CRITICAL'
        ? 'Immediate Attention'
        : top.item.priority === 'HIGH'
          ? 'High Priority'
          : 'Recommended Focus';

    let reason =
      top.item.priorityExplanation || 'Highest strategic value toward your current career goal.';
    if (top.item.source === 'INTERVIEW') {
      reason = 'Interview is scheduled soon. High-impact milestone with immediate career outcome.';
    } else if (top.item.source === 'APPLICATION' && top.item.deadline) {
      reason =
        'Application deadline is approaching. Submitting on time ensures full consideration.';
    }

    return {
      action: top.item,
      reason,
      impactScore: Math.min(100, Math.round(top.calculatedScore)),
      urgencyLabel,
      suggestedFocusMinutes: top.item.estimatedMinutes || 45,
      blockerWarning: top.item.isBlocked ? top.item.blockerReason || null : null,
    };
  }
}
