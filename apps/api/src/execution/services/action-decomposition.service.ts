import { Injectable } from '@nestjs/common';

import { ActionCandidate, ActionSubStep } from '../interfaces/execution.interfaces';

@Injectable()
export class ActionDecompositionService {
  /**
   * Generates step-by-step breakdown for complex career execution actions.
   */
  decomposeAction(action: ActionCandidate): ActionSubStep[] {
    const titleLower = action.title.toLowerCase();

    // 1. Interview Preparation Breakdown
    if (action.source === 'INTERVIEW' || titleLower.includes('interview')) {
      return [
        {
          id: 'step-1',
          title: 'Review company mission, recent news & tech stack',
          order: 1,
          isCompleted: false,
          estimatedMinutes: 15,
        },
        {
          id: 'step-2',
          title: 'Practice top 3 role-specific behavioral stories (STAR method)',
          order: 2,
          isCompleted: false,
          estimatedMinutes: 20,
        },
        {
          id: 'step-3',
          title: 'Conduct targeted mock coding/system design walkthrough',
          order: 3,
          isCompleted: false,
          estimatedMinutes: 30,
        },
        {
          id: 'step-4',
          title: 'Prepare 3 thoughtful questions for the interview panel',
          order: 4,
          isCompleted: false,
          estimatedMinutes: 10,
        },
      ];
    }

    // 2. Application Submission Breakdown
    if (action.source === 'APPLICATION' || titleLower.includes('application')) {
      return [
        {
          id: 'step-1',
          title: 'Review job posting & note missing required keywords',
          order: 1,
          isCompleted: false,
          estimatedMinutes: 10,
        },
        {
          id: 'step-2',
          title: 'Tailor resume bullets & summary to match requirements',
          order: 2,
          isCompleted: false,
          estimatedMinutes: 15,
        },
        {
          id: 'step-3',
          title: 'Attach relevant portfolio projects & GitHub links',
          order: 3,
          isCompleted: false,
          estimatedMinutes: 10,
        },
        {
          id: 'step-4',
          title: 'Complete application portal questions & submit',
          order: 4,
          isCompleted: false,
          estimatedMinutes: 15,
        },
      ];
    }

    // 3. Project / Portfolio Development Breakdown
    if (
      action.source === 'PROJECT' ||
      action.source === 'PORTFOLIO' ||
      titleLower.includes('project')
    ) {
      return [
        {
          id: 'step-1',
          title: 'Define project scope & high-level architecture diagram',
          order: 1,
          isCompleted: false,
          estimatedMinutes: 15,
        },
        {
          id: 'step-2',
          title: 'Implement core functionality & API endpoints',
          order: 2,
          isCompleted: false,
          estimatedMinutes: 45,
        },
        {
          id: 'step-3',
          title: 'Add test suite & Docker containerization',
          order: 3,
          isCompleted: false,
          estimatedMinutes: 30,
        },
        {
          id: 'step-4',
          title: 'Deploy live demo & document README with architecture',
          order: 4,
          isCompleted: false,
          estimatedMinutes: 20,
        },
      ];
    }

    // 4. Learning / Skill Gap Breakdown
    if (
      action.source === 'LEARNING' ||
      titleLower.includes('skill') ||
      titleLower.includes('module')
    ) {
      return [
        {
          id: 'step-1',
          title: 'Read foundational concept guide & documentation',
          order: 1,
          isCompleted: false,
          estimatedMinutes: 15,
        },
        {
          id: 'step-2',
          title: 'Complete interactive coding exercises',
          order: 2,
          isCompleted: false,
          estimatedMinutes: 20,
        },
        {
          id: 'step-3',
          title: 'Apply learned skill in a mini-project code snippet',
          order: 3,
          isCompleted: false,
          estimatedMinutes: 25,
        },
      ];
    }

    // Default Generic Breakdown
    return [
      {
        id: 'step-1',
        title: 'Clarify target outcome & gather required references',
        order: 1,
        isCompleted: false,
        estimatedMinutes: 10,
      },
      {
        id: 'step-2',
        title: 'Execute primary task block without interruptions',
        order: 2,
        isCompleted: false,
        estimatedMinutes: 25,
      },
      {
        id: 'step-3',
        title: 'Review result against quality criteria & finalize',
        order: 3,
        isCompleted: false,
        estimatedMinutes: 10,
      },
    ];
  }
}
