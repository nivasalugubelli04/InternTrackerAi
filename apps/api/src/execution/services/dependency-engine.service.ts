import { Injectable } from '@nestjs/common';

import { ActionCandidate } from '../interfaces/execution.interfaces';

export interface DependencyAnalysisResult {
  orderedActions: ActionCandidate[];
  blockedActions: {
    action: ActionCandidate;
    blockerReason: string;
    prerequisiteActionTitle?: string;
  }[];
  dependencyGraph: Map<string, string[]>; // Action -> Prerequisites
}

@Injectable()
export class DependencyEngineService {
  /**
   * Analyzes dependencies among candidate actions, identifies blockers,
   * and computes optimal execution sequencing.
   */
  analyzeDependencies(candidates: ActionCandidate[]): DependencyAnalysisResult {
    const blockedActions: {
      action: ActionCandidate;
      blockerReason: string;
      prerequisiteActionTitle?: string;
    }[] = [];

    const dependencyGraph = new Map<string, string[]>();

    // Analyze dependency rules
    for (const candidate of candidates) {
      const prerequisites: string[] = [];

      // Rule 1: Application Submission depends on Resume Tailoring / Checklist
      if (candidate.source === 'APPLICATION' && candidate.title.toLowerCase().includes('submit')) {
        const matchingPrep = candidates.find(
          (c) =>
            c.source === 'APPLICATION' &&
            c.title.toLowerCase().includes('tailor') &&
            c.sourceEntityId === candidate.sourceEntityId,
        );
        if (matchingPrep) {
          prerequisites.push(matchingPrep.title);
          candidate.isBlocked = true;
          candidate.blockerReason = `Resume tailoring for this opportunity is still in progress.`;
          blockedActions.push({
            action: candidate,
            blockerReason: candidate.blockerReason,
            prerequisiteActionTitle: matchingPrep.title,
          });
        }
      }

      // Rule 2: Referral Request depends on Prior Outreach / Contact Interaction
      if (candidate.source === 'NETWORKING' && candidate.title.toLowerCase().includes('referral')) {
        const introDraft = candidates.find(
          (c) =>
            c.source === 'NETWORKING' &&
            c.title.toLowerCase().includes('outreach') &&
            c.sourceEntityId === candidate.sourceEntityId,
        );
        if (introDraft) {
          prerequisites.push(introDraft.title);
          candidate.isBlocked = true;
          candidate.blockerReason = `Initial outreach conversation must be initiated first.`;
          blockedActions.push({
            action: candidate,
            blockerReason: candidate.blockerReason,
            prerequisiteActionTitle: introDraft.title,
          });
        }
      }

      // Rule 3: Technical Mock Practice before Hiring Interview
      if (candidate.source === 'INTERVIEW' && candidate.priority === 'CRITICAL') {
        const skillTask = candidates.find(
          (c) => c.source === 'LEARNING' && c.focusLevel === 'HIGH',
        );
        if (skillTask) {
          prerequisites.push(skillTask.title);
        }
      }

      if (prerequisites.length > 0) {
        dependencyGraph.set(candidate.title, prerequisites);
      }
    }

    // Sort actions so prerequisites come first, followed by unblocked high-priority actions, then blocked actions
    const orderedActions = [...candidates].sort((a, b) => {
      if (a.isBlocked && !b.isBlocked) return 1;
      if (!a.isBlocked && b.isBlocked) return -1;

      const priorityOrder = { CRITICAL: 4, HIGH: 3, IMPORTANT: 2, WHEN_POSSIBLE: 1, OPTIONAL: 0 };
      const diff = (priorityOrder[a.priority] || 0) - (priorityOrder[b.priority] || 0);
      if (diff !== 0) return -diff;

      return (b.relevanceScore || 0) - (a.relevanceScore || 0);
    });

    return {
      orderedActions,
      blockedActions,
      dependencyGraph,
    };
  }
}
