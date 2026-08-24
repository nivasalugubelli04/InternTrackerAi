import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  EffortCategory,
  ExecutionPriority,
  PlanType,
  SprintStatus,
  SprintType,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import {
  BaselineCareerSnapshot,
  ProposedPlanDiff,
  ScenarioResultDto,
} from '../interfaces/simulation.interfaces';

@Injectable()
export class SimulationExecutionBridgeService {
  private readonly logger = new Logger(SimulationExecutionBridgeService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Translates a simulated scenario into a proposed Phase 45 execution plan diff.
   */
  generateProposedPlanDiff(
    baseline: BaselineCareerSnapshot,
    scenario: ScenarioResultDto,
  ): ProposedPlanDiff {
    let sprintType: SprintType = SprintType.CUSTOM;
    let sprintTitle = `Career Sprint: ${scenario.title}`;
    let sprintGoal = `Execute simulated ${scenario.scenarioType} strategy to advance career momentum.`;

    const keyMilestones: string[] = [];
    const suggestedActionItems: ProposedPlanDiff['suggestedActionItems'] = [];
    const deprioritizeSuggestions: string[] = [];

    // Map Sprint Types
    if (scenario.scenarioType === 'PROJECT_ACCELERATION') {
      sprintType = SprintType.PROJECT;
      sprintTitle = `Project Sprint: ${scenario.variables.projectStrategy?.projectTitle || 'Flagship Project'}`;
      sprintGoal = 'Build, polish, and publicly deploy flagship project with verifiable evidence.';
      keyMilestones.push('Project architecture finalized');
      keyMilestones.push('Core feature implementation complete');
      keyMilestones.push('Public deployment & live demo verified');
      keyMilestones.push('Evidence node linked in Professional Graph');

      suggestedActionItems.push(
        {
          title: 'Implement and test core project feature set',
          description: 'Focus on high-value backend/frontend modules.',
          priority: 'CRITICAL',
          category: 'PORTFOLIO',
          estimatedMinutes: 60,
          dayNumber: 1,
        },
        {
          title: 'Configure automated CI/CD and public cloud deployment',
          description: 'Deploy live application with reproducible environment configs.',
          priority: 'HIGH',
          category: 'PORTFOLIO',
          estimatedMinutes: 45,
          dayNumber: 3,
        },
        {
          title: 'Write technical README and create architecture diagram',
          description: 'Document key design decisions and performance characteristics.',
          priority: 'HIGH',
          category: 'PORTFOLIO',
          estimatedMinutes: 30,
          dayNumber: 5,
        },
      );
      deprioritizeSuggestions.push(
        'Pause cold outbound applications for 5 days to complete deployment.',
      );
    } else if (scenario.scenarioType === 'APPLICATION_SPRINT') {
      sprintType = SprintType.APPLICATION;
      sprintTitle = 'Application Acceleration Sprint';
      sprintGoal = 'Submit 6–8 tailored applications to high-alignment open internships.';
      keyMilestones.push('Top 8 matching companies identified');
      keyMilestones.push('Tailored resumes and evidence links attached');
      keyMilestones.push('Follow-up schedule created');

      suggestedActionItems.push(
        {
          title: 'Identify top 4 matched internship postings',
          description: 'Filter opportunities with match score >= 75%.',
          priority: 'CRITICAL',
          category: 'APPLICATION',
          estimatedMinutes: 30,
          dayNumber: 1,
        },
        {
          title: 'Tailor resume bullets to target role keywords',
          description: 'Highlight relevant projects and verified skills.',
          priority: 'HIGH',
          category: 'APPLICATION',
          estimatedMinutes: 45,
          dayNumber: 2,
        },
        {
          title: 'Submit batch 1 applications with custom notes',
          description: 'Submit polished applications through official portals.',
          priority: 'CRITICAL',
          category: 'APPLICATION',
          estimatedMinutes: 40,
          dayNumber: 3,
        },
      );
      deprioritizeSuggestions.push(
        'Defer non-critical tutorial learning to protect application focus hours.',
      );
    } else if (scenario.scenarioType === 'INTERVIEW_PREP') {
      sprintType = SprintType.PREPARATION;
      sprintTitle = 'Technical Interview Readiness Sprint';
      sprintGoal = 'Sharpen algorithmic problem solving and behavioral communication.';
      keyMilestones.push('Complete 2 AI mock interviews');
      keyMilestones.push('Review system design & data structures fundamentals');

      suggestedActionItems.push(
        {
          title: 'Complete AI Technical Mock Interview session',
          description: 'Practice real-time technical problem solving.',
          priority: 'CRITICAL',
          category: 'INTERVIEW_PREP',
          estimatedMinutes: 45,
          dayNumber: 2,
        },
        {
          title: 'Review Mock Interview score breakdown & feedback',
          description: 'Address weak points identified in communication or code structure.',
          priority: 'HIGH',
          category: 'INTERVIEW_PREP',
          estimatedMinutes: 30,
          dayNumber: 4,
        },
      );
    } else {
      // Balanced / Custom
      sprintType = SprintType.SKILL;
      keyMilestones.push('Execute balanced daily actions across skills, projects, and pipeline');
      suggestedActionItems.push(
        {
          title: 'Advance primary skill learning module',
          description: 'Complete high-priority lesson and hands-on exercise.',
          priority: 'IMPORTANT' as any,
          category: 'SKILL_BUILDING',
          estimatedMinutes: 30,
          dayNumber: 1,
        },
        {
          title: 'Make incremental progress on active project codebase',
          description: 'Commit code improvements and add test coverage.',
          priority: 'HIGH',
          category: 'PORTFOLIO',
          estimatedMinutes: 45,
          dayNumber: 3,
        },
        {
          title: 'Submit 2 tailored applications to priority roles',
          description: 'Maintain healthy pipeline volume.',
          priority: 'HIGH',
          category: 'APPLICATION',
          estimatedMinutes: 30,
          dayNumber: 5,
        },
      );
    }

    const allocatedMinutesPerDay = Math.min(
      120,
      Math.max(30, Math.round((baseline.weeklyAvailableMinutes || 420) / 7)),
    );

    return {
      sprintTitle,
      sprintGoal,
      sprintType,
      durationDays: 7,
      keyMilestones,
      allocatedMinutesPerDay,
      suggestedActionItems,
      deprioritizeSuggestions,
    };
  }

  /**
   * User-approved activation: Applies the simulated scenario to Phase 45 Execution Engine.
   */
  async activateScenarioPlan(userId: string, scenarioId: string) {
    this.logger.log(
      `Activating scenario ${scenarioId} into Phase 45 Execution Engine for user ${userId}`,
    );

    const scenario = await this.prisma.simulationScenario.findFirst({
      where: { id: scenarioId, simulation: { userId } },
      include: { simulation: true },
    });

    if (!scenario) {
      throw new NotFoundException('Scenario not found or does not belong to user.');
    }

    const proposedPlan = scenario.proposedPlan as ProposedPlanDiff | null;
    if (!proposedPlan) {
      throw new NotFoundException('Scenario does not have an actionable proposed plan diff.');
    }

    // 1. Mark current active sprints as completed
    await this.prisma.careerSprint.updateMany({
      where: { userId, status: SprintStatus.ACTIVE },
      data: { status: SprintStatus.COMPLETED },
    });

    // 2. Create the new CareerSprint (Phase 45)
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + (proposedPlan.durationDays || 7));

    const sprintType = (SprintType as any)[proposedPlan.sprintType] || SprintType.CUSTOM;

    const newSprint = await this.prisma.careerSprint.create({
      data: {
        userId,
        title: proposedPlan.sprintTitle,
        goal: proposedPlan.sprintGoal,
        sprintType,
        startDate,
        endDate,
        durationDays: proposedPlan.durationDays || 7,
        status: SprintStatus.ACTIVE,
        keyMilestones: proposedPlan.keyMilestones || [],
      },
    });

    // 3. Create CareerSprintItems
    const actions = proposedPlan.suggestedActionItems || [];
    for (let i = 0; i < actions.length; i++) {
      const item = actions[i];
      if (!item) continue;
      await this.prisma.careerSprintItem.create({
        data: {
          sprintId: newSprint.id,
          title: item.title,
          description: item.description,
          isMilestone: i === 0 || i === actions.length - 1,
          status: 'PENDING',
          targetDay: item.dayNumber || 1,
        },
      });
    }

    // 4. Create Weekly ExecutionPlan with ExecutionPlanItems
    const totalEstimated = actions.reduce(
      (sum, it) => sum + (it ? it.estimatedMinutes || 30 : 30),
      0,
    );

    const executionPlan = await this.prisma.executionPlan.create({
      data: {
        userId,
        planType: PlanType.WEEKLY,
        weekStartDate: startDate,
        planObjective: proposedPlan.sprintGoal,
        primaryFocus: proposedPlan.sprintTitle,
        secondaryFocus: scenario.scenarioType,
        workloadRisk: 'BALANCED',
        totalEstimatedMinutes: totalEstimated,
        aiGenerated: true,
      },
    });

    for (let idx = 0; idx < actions.length; idx++) {
      const action = actions[idx];
      if (!action) continue;
      const priority =
        action.priority === 'CRITICAL'
          ? ExecutionPriority.CRITICAL
          : action.priority === 'HIGH'
            ? ExecutionPriority.HIGH
            : ExecutionPriority.IMPORTANT;

      await this.prisma.executionPlanItem.create({
        data: {
          planId: executionPlan.id,
          orderIndex: idx + 1,
          title: action.title,
          description: action.description,
          source: action.category,
          priority,
          estimatedEffort:
            (action.estimatedMinutes || 30) > 45 ? EffortCategory.MEDIUM : EffortCategory.SHORT,
          estimatedMinutes: action.estimatedMinutes || 30,
          status: 'PENDING',
        },
      });
    }

    // 5. Emit CareerEvent
    await this.prisma.careerEvent.create({
      data: {
        userId,
        eventType: 'SimulationPlanActivated',
        source: 'CAREER_SIMULATION',
        entityType: 'CareerSprint',
        entityId: newSprint.id,
        importance: 'HIGH',
        metadata: {
          scenarioId: scenario.id,
          scenarioKey: scenario.scenarioKey,
          sprintTitle: newSprint.title,
          planId: executionPlan.id,
        },
      },
    });

    return {
      success: true,
      message: `Scenario "${scenario.title}" converted into active Phase 45 Career Sprint.`,
      sprint: newSprint,
      plan: executionPlan,
    };
  }
}
