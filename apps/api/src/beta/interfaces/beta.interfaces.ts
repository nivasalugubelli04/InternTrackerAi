export type BetaStatus = 'INVITED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'REMOVED';

export type FeedbackCategory =
  | 'OPPORTUNITY_DISCOVERY'
  | 'APPLICATION_TRACKING'
  | 'AI_COPILOT'
  | 'CAREER_STRATEGY'
  | 'EXECUTION_ENGINE'
  | 'PORTFOLIO'
  | 'SIMULATION'
  | 'RESEARCH'
  | 'ONBOARDING'
  | 'PERFORMANCE'
  | 'OTHER';

export type FeedbackSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type FeedbackLifecycleStatus =
  'NEW' | 'UNDER_REVIEW' | 'PLANNED' | 'IN_PROGRESS' | 'RESOLVED' | 'DECLINED';

export type InsightPriorityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface FunnelStep {
  stepName: string;
  count: number;
  conversionRate: number; // 0.0 to 1.0
  dropoffRate: number; // 0.0 to 1.0
}

export interface FunnelReport {
  funnelName: string;
  totalStarted: number;
  totalCompleted: number;
  overallConversionRate: number;
  steps: FunnelStep[];
}

export interface RetentionCohort {
  period: string; // e.g. "2026-W34"
  cohortSize: number;
  day1Rate: number;
  week1Rate: number;
  week2Rate: number;
  week4Rate: number;
}

export interface FeatureAdoptionMetric {
  featureKey: string;
  featureName: string;
  usersExposed: number;
  usersInteracted: number;
  repeatUsers: number;
  adoptionRate: number; // 0.0 to 1.0
  satisfactionScore?: number | undefined; // 1-5 or null
}

export interface UxFrictionSignal {
  id: string;
  feature: string;
  frictionType:
    'REPEATED_FILTERING' | 'TASK_ABANDONMENT' | 'AI_RETRY_SPIKE' | 'RAPID_EXIT' | 'SLOW_LOAD';
  affectedUsersCount: number;
  severity: FeedbackSeverity;
  description: string;
  detectedAt: Date;
}

export interface ProductHealthScorecardData {
  activationRate: number; // 0.0 to 1.0
  d1RetentionRate: number;
  w1RetentionRate: number;
  overallFeatureAdoption: number;
  errorRate: number; // percentage of requests failing
  userSatisfactionScore: number; // 1.0 to 5.0
  feedbackVolume: {
    total: number;
    openBugs: number;
    resolvedThisWeek: number;
  };
  aiUsefulnessScore: number; // % helpful
}

export interface BetaDashboardData {
  overview: {
    totalBetaUsers: number;
    activeBetaUsers: number;
    activationRate: number;
    totalFeedbackCount: number;
    criticalIssuesCount: number;
  };
  scorecard: ProductHealthScorecardData;
  funnels: {
    signupToActivation: FunnelReport;
    opportunityToApplication: FunnelReport;
    copilotEngagement: FunnelReport;
  };
  retention: RetentionCohort[];
  featureAdoption: FeatureAdoptionMetric[];
  topFeedbackThemes: Array<{
    id: string;
    title: string;
    category: string;
    affectedFeature: string;
    frequencyCount: number;
    severity: string;
    priority: string;
    status: string;
    aiSummary?: string | null | undefined;
  }>;
  frictionSignals: UxFrictionSignal[];
  productInsights: Array<{
    id: string;
    title: string;
    observation: string;
    evidence: string[];
    affectedFeature: string;
    usersAffectedCount: number;
    confidenceLevel: string;
    potentialImpact: string;
    suggestedInvestigation: string;
    priority: string;
    status: string;
  }>;
}
