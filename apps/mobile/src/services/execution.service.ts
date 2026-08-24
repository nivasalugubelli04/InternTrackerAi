import { api } from './api';

export interface ActionSubStep {
  id: string;
  title: string;
  order: number;
  isCompleted: boolean;
  estimatedMinutes?: number;
}

export interface NextBestActionResponse {
  action: {
    id?: string;
    title: string;
    description?: string;
    source: string;
    priority: string;
    focusLevel: string;
    estimatedEffort: string;
    estimatedMinutes: number;
    deadline?: string | null;
    priorityExplanation: string;
    potentialImpact: string;
    suggestedNextStep: string;
  };
  reason: string;
  impactScore: number;
  urgencyLabel: string;
  suggestedFocusMinutes: number;
  blockerWarning?: string | null;
}

export interface ExecutionItem {
  id: string;
  orderIndex: number;
  title: string;
  description?: string | null;
  source: string;
  sourceEntityType?: string | null;
  sourceEntityId?: string | null;
  priority: 'CRITICAL' | 'HIGH' | 'IMPORTANT' | 'WHEN_POSSIBLE' | 'OPTIONAL';
  focusLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  estimatedEffort: 'QUICK' | 'SHORT' | 'MEDIUM' | 'DEEP_WORK';
  estimatedMinutes: number;
  deadline?: string | null;
  priorityExplanation?: string | null;
  potentialImpact?: string | null;
  suggestedNextStep?: string | null;
  status:
    | 'PENDING'
    | 'IN_PROGRESS'
    | 'COMPLETED'
    | 'RESCHEDULED'
    | 'BLOCKED'
    | 'DEPRIORITIZED'
    | 'ARCHIVED';
  isBlocked: boolean;
  blockerReason?: string | null;
  subSteps?: ActionSubStep[];
  startedAt?: string | null;
  completedAt?: string | null;
}

export interface DailyPlan {
  id: string;
  targetDate: string;
  planObjective: string;
  primaryFocus: string;
  workloadRisk: 'BALANCED' | 'MODERATE' | 'OVERLOADED';
  workloadReason?: string | null;
  totalEstimatedMinutes: number;
  nextBestAction: NextBestActionResponse | null;
  todayActions: ExecutionItem[];
  laterTodayActions: ExecutionItem[];
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
  activeSprint?: CareerSprint | null;
}

export interface WeeklyPlan {
  id: string;
  weekStartDate: string;
  planObjective: string;
  primaryFocus: string;
  secondaryFocus?: string | null;
  maintainFocus?: string | null;
  workloadRisk: 'BALANCED' | 'MODERATE' | 'OVERLOADED';
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
  actions: ExecutionItem[];
  recommendedDistribution: {
    applyPercent: number;
    preparePercent: number;
    buildPercent: number;
    networkPercent: number;
  };
}

export interface CareerSprint {
  id: string;
  title: string;
  goal: string;
  sprintType: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  status: string;
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

export interface PlanReview {
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

export interface FocusSessionData {
  actionId: string;
  actionTitle: string;
  suggestedDurationMinutes: number;
  recommendedStartTime: string;
  recommendedEndTime: string;
  preparationChecklist: string[];
  calendarContext?: {
    isCalendarConnected: boolean;
    calendarProvider?: string;
    suggestedEventTitle: string;
    suggestedDescription: string;
    canAddToCalendar: boolean;
  };
}

export interface ExecutionPreferences {
  dailyAvailableMinutes: number;
  maxDailyActions: number;
  preferredWorkingPeriods: string[];
  preferredRestDays: string[];
  planningHorizonDays: number;
  calendarSyncEnabled: boolean;
  autoReplanOnTriggers: boolean;
}

export const executionService = {
  async getDailyPlan(targetDate?: string): Promise<DailyPlan> {
    const params = targetDate ? { targetDate } : undefined;
    const response = await api.get('/execution/today', { params });
    return response.data;
  },

  async getWeeklyPlan(): Promise<WeeklyPlan> {
    const response = await api.get('/execution/week');
    return response.data;
  },

  async generatePlan(
    planType: 'DAILY' | 'WEEKLY' = 'DAILY',
    targetDate?: string,
  ): Promise<DailyPlan | WeeklyPlan> {
    const response = await api.post('/execution/plan/generate', { planType, targetDate });
    return response.data;
  },

  async getReplanTriggers(): Promise<any> {
    const response = await api.get('/execution/replan/triggers');
    return response.data;
  },

  async executeReplan(): Promise<DailyPlan> {
    const response = await api.post('/execution/replan');
    return response.data;
  },

  async startAction(id: string): Promise<ExecutionItem> {
    const response = await api.post(`/execution/actions/${id}/start`);
    return response.data;
  },

  async completeAction(id: string): Promise<ExecutionItem> {
    const response = await api.post(`/execution/actions/${id}/complete`);
    return response.data;
  },

  async rescheduleAction(
    id: string,
    rescheduledToDate: string,
    reason?: string,
  ): Promise<ExecutionItem> {
    const response = await api.post(`/execution/actions/${id}/reschedule`, {
      rescheduledToDate,
      reason,
    });
    return response.data;
  },

  async deprioritizeAction(
    id: string,
    option: 'PAUSE' | 'REDUCE_SCOPE' | 'ARCHIVE',
    reason?: string,
  ): Promise<ExecutionItem> {
    const response = await api.post(`/execution/actions/${id}/deprioritize`, { option, reason });
    return response.data;
  },

  async decomposeAction(id: string): Promise<ActionSubStep[]> {
    const response = await api.post(`/execution/actions/${id}/decompose`);
    return response.data;
  },

  async toggleSubStep(id: string, stepId: string): Promise<ExecutionItem> {
    const response = await api.post(`/execution/actions/${id}/substeps/${stepId}/toggle`);
    return response.data;
  },

  async getFocusSession(id: string, duration?: number): Promise<FocusSessionData> {
    const params = duration ? { duration } : undefined;
    const response = await api.post(`/execution/actions/${id}/focus-session`, null, { params });
    return response.data;
  },

  async getSprints(): Promise<CareerSprint[]> {
    const response = await api.get('/execution/sprints');
    return response.data;
  },

  async getActiveSprint(): Promise<CareerSprint | null> {
    const response = await api.get('/execution/sprints/active');
    return response.data;
  },

  async createSprint(data: {
    title: string;
    goal: string;
    sprintType?: string;
    durationDays?: number;
    keyMilestones?: string[];
    itemTitles?: string[];
  }): Promise<CareerSprint> {
    const response = await api.post('/execution/sprints', data);
    return response.data;
  },

  async completeSprintItem(sprintId: string, itemId: string): Promise<CareerSprint> {
    const response = await api.post(`/execution/sprints/${sprintId}/items/${itemId}/complete`);
    return response.data;
  },

  async getWorkload(): Promise<any> {
    const response = await api.get('/execution/workload');
    return response.data;
  },

  async getReview(): Promise<PlanReview> {
    const response = await api.get('/execution/review');
    return response.data;
  },

  async generateReview(): Promise<PlanReview> {
    const response = await api.post('/execution/review/generate');
    return response.data;
  },

  async saveReviewNotes(id: string, notes: string): Promise<PlanReview> {
    const response = await api.put(`/execution/review/${id}/notes`, { notes });
    return response.data;
  },

  async getPreferences(): Promise<ExecutionPreferences> {
    const response = await api.get('/execution/preferences');
    return response.data;
  },

  async updatePreferences(data: Partial<ExecutionPreferences>): Promise<ExecutionPreferences> {
    const response = await api.put('/execution/preferences', data);
    return response.data;
  },
};
