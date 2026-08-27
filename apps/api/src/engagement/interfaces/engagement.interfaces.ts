export type UserSegmentType =
  | 'NEW_USER'
  | 'ACTIVATED_USER'
  | 'ACTIVE_APPLICANT'
  | 'INTERVIEW_ACTIVE'
  | 'SKILL_BUILDER'
  | 'INACTIVE_USER';

export type ChurnRiskType = 'LOW' | 'MEDIUM' | 'HIGH';

export type SignalPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type SignalCategory =
  | 'OPPORTUNITY_MATCH'
  | 'DEADLINE_APPROACHING'
  | 'APPLICATION_STAGNANT'
  | 'INTERVIEW_UPCOMING'
  | 'SKILL_GAP_ALERT'
  | 'TASK_OVERDUE'
  | 'PORTFOLIO_IMPROVEMENT'
  | 'RESEARCH_INSIGHT'
  | 'COPILOT_PROPOSAL'
  | 'INACTIVITY_DETECTED'
  | 'MILESTONE_ACHIEVED';

export interface NextBestStep {
  stepKey: string;
  title: string;
  description: string;
  actionLabel: string;
  targetRoute: string;
  estimatedMinutes: number;
  priority: SignalPriority;
  impactExplanation: string;
}

export interface ActivationProgressData {
  isActivated: boolean;
  activationScore: number; // 0.0 to 1.0
  timeToValueSec?: number | null | undefined;
  completedMilestones: string[];
  nextBestStep: NextBestStep | null;
}

export interface DailyFocusCardData {
  id: string;
  title: string;
  reason: string;
  actionLabel: string;
  targetRoute: string;
  priority: SignalPriority;
  matchScore?: number | null | undefined;
  deadline?: Date | null | undefined;
  isCompleted: boolean;
  date: string;
}

export interface WeeklySummarySection {
  title: string;
  summaryText: string;
  metric?: string | undefined;
  items: string[];
}

export interface WeeklyCareerSummaryData {
  period: string; // e.g. "Week of August 24, 2026"
  headline: string;
  highlights: string[];
  applicationsCount: number;
  newMatchesCount: number;
  tasksCompletedCount: number;
  skillProgressCount: number;
  upcomingDeadlines: Array<{
    title: string;
    company: string;
    deadline: Date;
  }>;
  recommendedFocus: string;
  keyInsight: string;
  nextBestAction: NextBestStep;
}

export interface ChurnRiskEvaluation {
  userId: string;
  segment: UserSegmentType;
  churnRisk: ChurnRiskType;
  score: number; // 0.0 (safe) to 1.0 (imminent churn)
  explainableReasons: string[];
  recommendedIntervention: string;
}

export interface GrowthMetricsData {
  dau: number;
  wau: number;
  mau: number;
  overallActivationRate: number;
  avgTimeToValueHours: number;
  segmentDistribution: Record<UserSegmentType, number>;
  churnRiskDistribution: Record<ChurnRiskType, number>;
  notificationEffectiveness: {
    sent: number;
    delivered: number;
    opened: number;
    acted: number;
    openRate: number;
    actionRate: number;
  };
  reengagementSuccessRate: number;
}
