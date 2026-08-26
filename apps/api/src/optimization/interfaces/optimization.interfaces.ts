export type LearningSignalType =
  | 'TASK_COMPLETED'
  | 'TASK_SKIPPED'
  | 'TASK_DELAYED'
  | 'PLAN_ACCEPTED'
  | 'PLAN_REJECTED'
  | 'OPPORTUNITY_SAVED'
  | 'OPPORTUNITY_IGNORED'
  | 'OPPORTUNITY_APPLIED'
  | 'APPLICATION_REJECTED'
  | 'APPLICATION_ADVANCED'
  | 'INTERVIEW_COMPLETED'
  | 'INTERVIEW_ADVANCED'
  | 'SKILL_IMPROVED'
  | 'PROJECT_COMPLETED'
  | 'PORTFOLIO_UPDATED'
  | 'RECOMMENDATION_ACCEPTED'
  | 'RECOMMENDATION_REJECTED'
  | 'FEEDBACK_SUBMITTED';

export type OutcomeCorrelationType =
  'OBSERVED_CORRELATION' | 'LIKELY_CONTRIBUTOR' | 'CONFIRMED_USER_FEEDBACK' | 'INSUFFICIENT_DATA';

export type InsightCategory =
  | 'EXECUTION_INSIGHT'
  | 'SKILL_INSIGHT'
  | 'APPLICATION_INSIGHT'
  | 'PORTFOLIO_INSIGHT'
  | 'OPPORTUNITY_INSIGHT'
  | 'CAREER_STRATEGY_INSIGHT'
  | 'TIME_ALLOCATION_INSIGHT'
  | 'RECOMMENDATION_INSIGHT';

export type OptimizationConfidence = 'HIGH_CONFIDENCE' | 'MEDIUM_CONFIDENCE' | 'LIMITED_DATA';

export type InsightFreshness = 'FRESH' | 'AGING' | 'STALE' | 'INSUFFICIENT_DATA';

export type OptimizationProposalStatus =
  'PENDING' | 'APPROVED' | 'REJECTED' | 'MODIFIED' | 'APPLIED';

export type StrategyExperimentStatus =
  'DRAFT' | 'PENDING_APPROVAL' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export type CareerOptimizationFeedbackResponse =
  | 'HELPFUL'
  | 'NOT_HELPFUL'
  | 'ALREADY_DOING_THIS'
  | 'NOT_RELEVANT'
  | 'TOO_DIFFICULT'
  | 'NOT_ENOUGH_TIME'
  | 'PREFER_ANOTHER_OPTION';

export interface RecordedSignal {
  userId: string;
  signalType: LearningSignalType;
  sourceEngine: string;
  entityType?: string | undefined;
  entityId?: string | undefined;
  payload?: any;
  confidence?: number | undefined;
}

export interface ExecutionPatternSummary {
  completionRate: number; // 0.0 to 1.0
  shortTaskCompletionRate: number;
  longTaskCompletionRate: number;
  frequentDelayCategory?: string | undefined;
  overloadedPlanFrequency: number;
  totalTasksRecorded: number;
  totalSkipped: number;
  totalCompleted: number;
}

export interface ApplicationPatternSummary {
  totalApplied: number;
  totalAdvanced: number;
  conversionRate: number;
  portfolioAlignedRate: number;
  nonAlignedRate: number;
}

export interface OpportunityPatternSummary {
  savedCount: number;
  appliedCount: number;
  ignoredCount: number;
  highMatchUnappliedCount: number;
}

export interface OptimizationDashboardData {
  whatIsWorking: Array<{
    id: string;
    category: InsightCategory;
    title: string;
    observation: string;
    evidence: string[];
    confidence: OptimizationConfidence;
    observationDays: number;
  }>;
  whatNeedsAdjustment: Array<{
    id: string;
    category: InsightCategory;
    title: string;
    observation: string;
    evidence: string[];
    confidence: OptimizationConfidence;
    suggestedAction: string;
    observationDays: number;
  }>;
  executionPatterns: ExecutionPatternSummary;
  proposals: Array<{
    id: string;
    currentStrategy: string;
    observation: string;
    proposedChange: string;
    expectedBenefit: string;
    tradeOff: string;
    confidence: OptimizationConfidence;
    status: OptimizationProposalStatus;
    actionPayload: any;
  }>;
  activeExperiments: Array<{
    id: string;
    title: string;
    hypothesis: string;
    durationDays: number;
    strategyA: string;
    strategyB: string;
    status: StrategyExperimentStatus;
    metricsCurrent?: any;
  }>;
  learnedPreferences: Array<{
    id: string;
    key: string;
    value: string;
    confidence: OptimizationConfidence;
    isEnabled: boolean;
  }>;
  recommendationEffectiveness?: any;
  dataSufficiency: {
    isSufficient: boolean;
    totalSignals: number;
    message: string;
  };
}
