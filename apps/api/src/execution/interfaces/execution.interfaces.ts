import {
  EffortCategory,
  ExecutionItemStatus,
  ExecutionPriority,
  SprintStatus,
  SprintType,
} from '@prisma/client';

export type ActionSourceType =
  | 'APPLICATION'
  | 'INTERVIEW'
  | 'LEARNING'
  | 'PROJECT'
  | 'PORTFOLIO'
  | 'NETWORKING'
  | 'FOLLOW_UP'
  | 'CAREER_STRATEGY'
  | 'EXTERNAL_CALENDAR'
  | 'USER_CREATED';

export type FocusLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export type WorkloadRisk = 'BALANCED' | 'MODERATE' | 'OVERLOADED';

export interface ActionSubStep {
  id: string;
  title: string;
  order: number;
  isCompleted: boolean;
  estimatedMinutes?: number;
}

export interface ActionCandidate {
  id?: string;
  actionId?: string; // Phase 37 CareerAction ID if mapped
  title: string;
  description?: string;
  source: ActionSourceType;
  sourceEntityType?: string;
  sourceEntityId?: string;
  priority: ExecutionPriority;
  focusLevel: FocusLevel;
  estimatedEffort: EffortCategory;
  estimatedMinutes: number;
  deadline?: Date | null;
  priorityExplanation: string;
  potentialImpact: string;
  suggestedNextStep: string;
  isBlocked?: boolean;
  blockerReason?: string;
  prerequisiteActionIds?: string[];
  subSteps?: ActionSubStep[];
  relevanceScore?: number;
}

export interface NextBestActionResponse {
  action: ActionCandidate;
  reason: string;
  impactScore: number;
  urgencyLabel: string;
  suggestedFocusMinutes: number;
  blockerWarning?: string | null;
}

export interface WorkloadAssessment {
  risk: WorkloadRisk;
  totalEstimatedMinutes: number;
  availableMinutes: number;
  totalActionsCount: number;
  maxDailyActions: number;
  explanation: string;
  deprioritizeSuggestions: {
    actionTitle: string;
    reason: string;
    suggestedOption: 'PAUSE' | 'REDUCE_SCOPE' | 'ARCHIVE';
  }[];
}

export interface DailyPlanResponse {
  id: string;
  targetDate: string;
  planObjective: string;
  primaryFocus: string;
  workloadRisk: WorkloadRisk;
  workloadReason?: string | null;
  totalEstimatedMinutes: number;
  nextBestAction: NextBestActionResponse | null;
  todayActions: ExecutionItemDto[];
  laterTodayActions: ExecutionItemDto[];
  upcomingDeadlines: {
    title: string;
    source: string;
    deadline: string;
    daysRemaining: number;
  }[];
  blockedActions: {
    id: string;
    title: string;
    blockerReason: string;
    prerequisiteTitle?: string | null;
  }[];
  activeSprint?: CareerSprintDto | null;
}

export interface WeeklyPlanResponse {
  id: string;
  weekStartDate: string;
  planObjective: string;
  primaryFocus: string;
  secondaryFocus?: string | null;
  maintainFocus?: string | null;
  workloadRisk: WorkloadRisk;
  workloadReason?: string | null;
  totalEstimatedMinutes: number;
  topOpportunities: {
    company: string;
    roleTitle: string;
    deadline?: string | null;
    alignmentScore?: number;
  }[];
  interviewPreparations: {
    company: string;
    scheduledDate: string;
    stage: string;
    status: string;
  }[];
  learningPriorities: {
    skill: string;
    moduleTitle: string;
    estimatedMinutes: number;
  }[];
  projectMilestones: {
    projectTitle: string;
    milestone: string;
  }[];
  networkingActions: {
    contactName: string;
    company?: string;
    goal: string;
  }[];
  actions: ExecutionItemDto[];
  recommendedDistribution: {
    applyPercent: number;
    preparePercent: number;
    buildPercent: number;
    networkPercent: number;
  };
}

export interface ExecutionItemDto {
  id: string;
  orderIndex: number;
  title: string;
  description?: string | null;
  source: ActionSourceType;
  sourceEntityType?: string | null;
  sourceEntityId?: string | null;
  priority: ExecutionPriority;
  focusLevel: FocusLevel;
  estimatedEffort: EffortCategory;
  estimatedMinutes: number;
  deadline?: string | null;
  priorityExplanation?: string | null;
  potentialImpact?: string | null;
  suggestedNextStep?: string | null;
  status: ExecutionItemStatus;
  isBlocked: boolean;
  blockerReason?: string | null;
  subSteps?: ActionSubStep[];
  startedAt?: string | null;
  completedAt?: string | null;
}

export interface CareerSprintDto {
  id: string;
  title: string;
  goal: string;
  sprintType: SprintType;
  startDate: string;
  endDate: string;
  durationDays: number;
  status: SprintStatus;
  progressPercent: number;
  reflection?: string | null;
  keyMilestones: string[];
  items: {
    id: string;
    title: string;
    isMilestone: boolean;
    status: string;
    targetDay: number;
  }[];
}

export interface PlanReviewDto {
  id: string;
  reviewPeriod: string;
  periodStartDate: string;
  periodEndDate: string;
  whatWentWell: string[];
  progressMade: string[];
  actionsCarriedForward: string[];
  currentBottlenecks: string[];
  nextFocusRecommendations: string[];
  completedActionsCount: number;
  totalActionsCount: number;
  userNotes?: string | null;
}

export interface UserExecutionPreferenceDto {
  dailyAvailableMinutes: number;
  maxDailyActions: number;
  preferredWorkingPeriods: string[];
  preferredRestDays: string[];
  planningHorizonDays: number;
  calendarSyncEnabled: boolean;
  autoReplanOnTriggers: boolean;
}
