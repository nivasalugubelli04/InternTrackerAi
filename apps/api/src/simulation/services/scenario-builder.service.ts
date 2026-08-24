import { Injectable, Logger } from '@nestjs/common';

import {
  BaselineCareerSnapshot,
  ScenarioType,
  SimulationVariables,
  TimeAllocation,
} from '../interfaces/simulation.interfaces';

export interface PredefinedScenarioTemplate {
  scenarioKey: string;
  title: string;
  scenarioType: ScenarioType;
  description: string;
  defaultTimeAllocation: TimeAllocation;
  defaultVariables: (baseline: BaselineCareerSnapshot) => SimulationVariables;
  assumptions: string[];
}

@Injectable()
export class ScenarioBuilderService {
  private readonly logger = new Logger(ScenarioBuilderService.name);

  /**
   * Returns standard predefined scenario archetypes tailored to the user's baseline.
   */
  getPredefinedArchetypes(baseline: BaselineCareerSnapshot): PredefinedScenarioTemplate[] {
    this.logger.log('Building predefined scenario archetypes');
    const defaultRole = baseline.targetRole || 'Software Engineer';
    const topProject = baseline.projects[0]?.title || 'Core Project';

    return [
      {
        scenarioKey: 'SCENARIO_A',
        title: 'Project Acceleration & Public Deployment',
        scenarioType: 'PROJECT_ACCELERATION',
        description:
          'Direct heavy effort towards completing, testing, and publicly deploying a flagship project.',
        defaultTimeAllocation: {
          learningPercent: 15,
          projectsPercent: 45,
          applicationsPercent: 15,
          interviewPrepPercent: 15,
          networkingPercent: 10,
        },
        defaultVariables: () => ({
          projectStrategy: {
            projectTitle: topProject,
            deployToPublic: true,
            weeklyHours: 6,
            targetTechStack: ['TypeScript', 'NestJS', 'PostgreSQL', 'Docker'],
          },
          portfolioStrategy: {
            documentAllProjects: true,
            linkLiveDemos: true,
            addCaseStudies: true,
          },
        }),
        assumptions: [
          'You have at least 1 core project codebase in development.',
          'Deployment target infrastructure (e.g. Vercel/Render) is available.',
          'Weekly available hours remain stable during the sprint.',
        ],
      },
      {
        scenarioKey: 'SCENARIO_B',
        title: 'High-Alignment Application Sprint',
        scenarioType: 'APPLICATION_SPRINT',
        description:
          'Maximize outbound reach by submitting 6–8 tailored, high-relevance internship applications per week.',
        defaultTimeAllocation: {
          learningPercent: 10,
          projectsPercent: 15,
          applicationsPercent: 45,
          interviewPrepPercent: 20,
          networkingPercent: 10,
        },
        defaultVariables: () => ({
          applicationStrategy: {
            additionalWeeklyApplications: 6,
            minimumMatchScore: 75,
            targetCompanyTiers: ['Tier 1 Tech', 'High-Growth AI Startups'],
          },
          interviewPrep: {
            focusArea: 'BEHAVIORAL',
            weeklyMockSessions: 1,
            weeklyPracticeHours: 2,
          },
        }),
        assumptions: [
          'Resume and LinkedIn profile are already baseline ready.',
          'Target companies have open positions aligned with current skills.',
          'Interview responses may start arriving within 2–3 weeks.',
        ],
      },
      {
        scenarioKey: 'SCENARIO_C',
        title: 'Balanced Execution & Readiness Sprint',
        scenarioType: 'BALANCED_STRATEGY',
        description:
          'Harmonize project building, interview preparation, and targeted applications without overtaxing any single area.',
        defaultTimeAllocation: {
          learningPercent: 25,
          projectsPercent: 25,
          applicationsPercent: 20,
          interviewPrepPercent: 20,
          networkingPercent: 10,
        },
        defaultVariables: () => ({
          skillInvestment: {
            skillName: 'System Architecture & Optimization',
            targetProficiency: 'INTERMEDIATE',
            weeklyHours: 3,
            durationWeeks: 4,
          },
          projectStrategy: {
            projectTitle: topProject,
            deployToPublic: true,
            weeklyHours: 3,
            targetTechStack: ['TypeScript', 'NestJS'],
          },
          applicationStrategy: {
            additionalWeeklyApplications: 3,
            minimumMatchScore: 80,
          },
          interviewPrep: {
            focusArea: 'BALANCED',
            weeklyMockSessions: 1,
            weeklyPracticeHours: 2,
          },
        }),
        assumptions: [
          'Balanced pace accommodates routine academic or professional schedules.',
          'Gradual multi-dimensional progress reduces burnout risk.',
        ],
      },
      {
        scenarioKey: 'SCENARIO_D',
        title: 'Deep Interview Preparation Mode',
        scenarioType: 'INTERVIEW_PREP',
        description:
          'Focus intensely on technical problem solving, system design, and AI mock interview evaluations.',
        defaultTimeAllocation: {
          learningPercent: 20,
          projectsPercent: 10,
          applicationsPercent: 15,
          interviewPrepPercent: 50,
          networkingPercent: 5,
        },
        defaultVariables: () => ({
          interviewPrep: {
            focusArea: 'DSA',
            weeklyMockSessions: 2,
            weeklyPracticeHours: 5,
          },
        }),
        assumptions: [
          'Target roles require algorithmic screening or live coding rounds.',
          'Application pipeline is already active or upcoming interviews are scheduled.',
        ],
      },
      {
        scenarioKey: 'SCENARIO_E',
        title: `Skill Acceleration: Specialized ${defaultRole}`,
        scenarioType: 'SKILL_ACCELERATION',
        description:
          'Close critical skill gaps to qualify for higher-tier positions and complex technical assessments.',
        defaultTimeAllocation: {
          learningPercent: 50,
          projectsPercent: 25,
          applicationsPercent: 10,
          interviewPrepPercent: 10,
          networkingPercent: 5,
        },
        defaultVariables: () => ({
          skillInvestment: {
            skillName: 'Advanced Distributed Systems & MLOps',
            targetProficiency: 'ADVANCED',
            weeklyHours: 5,
            durationWeeks: 4,
          },
        }),
        assumptions: [
          'Acquired skills will be demonstrated through a companion project in subsequent sprints.',
          'Application volume is temporarily reduced while mastering new technologies.',
        ],
      },
    ];
  }

  /**
   * Builds custom scenario input with defaults for any missing parameters.
   */
  buildCustomScenario(
    _baseline: BaselineCareerSnapshot,
    title: string,
    variables: SimulationVariables,
    timeAllocation?: Partial<TimeAllocation>,
  ) {
    const resolvedAllocation: TimeAllocation = {
      learningPercent: timeAllocation?.learningPercent ?? 20,
      projectsPercent: timeAllocation?.projectsPercent ?? 30,
      applicationsPercent: timeAllocation?.applicationsPercent ?? 20,
      interviewPrepPercent: timeAllocation?.interviewPrepPercent ?? 20,
      networkingPercent: timeAllocation?.networkingPercent ?? 10,
    };

    return {
      scenarioKey: 'CUSTOM',
      title: title || 'Custom Strategy Scenario',
      scenarioType: 'CUSTOM' as ScenarioType,
      variables,
      timeAllocation: resolvedAllocation,
      assumptions: [
        'User maintains current available hours throughout the simulation horizon.',
        'External job market conditions remain stable during execution.',
      ],
    };
  }
}
