/**
 * Phase 46 — Career Simulation & Opportunity Forecasting Engine Interfaces
 */

export type TimeHorizon = 'TWO_WEEKS' | 'ONE_MONTH' | 'THREE_MONTHS' | 'CUSTOM';

export type SimulationStatus = 'DRAFT' | 'RUNNING' | 'COMPLETED' | 'ARCHIVED';

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LIMITED';

export type ScenarioType =
  | 'SKILL_ACCELERATION'
  | 'PROJECT_ACCELERATION'
  | 'APPLICATION_SPRINT'
  | 'INTERVIEW_PREP'
  | 'PORTFOLIO_IMPROVEMENT'
  | 'NETWORKING_PUSH'
  | 'BALANCED_STRATEGY'
  | 'FOCUS_STRATEGY'
  | 'CAREER_PATH_COMPARISON'
  | 'CUSTOM';

export type ImpactDimension =
  | 'SKILL_DEVELOPMENT'
  | 'PORTFOLIO_STRENGTH'
  | 'APPLICATION_READINESS'
  | 'INTERVIEW_READINESS'
  | 'NETWORKING_MOMENTUM'
  | 'CAREER_ALIGNMENT'
  | 'EXECUTION_LOAD'
  | 'CAREER_MOMENTUM'
  | 'OPPORTUNITY_READINESS';

export type ImpactDirection =
  'STRONG_INCREASE' | 'MODERATE_INCREASE' | 'NEUTRAL' | 'MODERATE_DECREASE' | 'HIGH_RISK';

export type OpportunityReadinessTrend =
  'STRONGER' | 'STABLE' | 'NEEDS_IMPROVEMENT' | 'INSUFFICIENT_DATA';

export interface TimeAllocation {
  learningPercent: number;
  projectsPercent: number;
  applicationsPercent: number;
  interviewPrepPercent: number;
  networkingPercent: number;
}

export interface SimulationVariables {
  skillInvestment?: {
    skillName: string;
    targetProficiency?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
    weeklyHours: number;
    durationWeeks: number;
  };
  applicationStrategy?: {
    additionalWeeklyApplications: number;
    minimumMatchScore?: number;
    targetCompanyTiers?: string[];
  };
  projectStrategy?: {
    projectTitle: string;
    deployToPublic: boolean;
    weeklyHours: number;
    targetTechStack: string[];
  };
  portfolioStrategy?: {
    documentAllProjects: boolean;
    linkLiveDemos: boolean;
    addCaseStudies: boolean;
  };
  networkingStrategy?: {
    weeklyOutreachCount: number;
    targetCompanies: string[];
    followUpCadenceDays?: number;
  };
  interviewPrep?: {
    focusArea: 'DSA' | 'SYSTEM_DESIGN' | 'BEHAVIORAL' | 'ROLE_SPECIFIC' | 'BALANCED';
    weeklyMockSessions: number;
    weeklyPracticeHours: number;
  };
  customAdjustments?: Record<string, any>;
}

export interface BaselineCareerSnapshot {
  userId: string;
  targetRole: string | null;
  careerGoals: string[];
  skills: Array<{ name: string; category: string; proficiency: string }>;
  projects: Array<{ title: string; isDeployed: boolean; techStack: string[] }>;
  evidenceNodeCount: number;
  portfolioMaturity: 'NONE' | 'STARTER' | 'DEVELOPING' | 'STRONG';
  activeApplicationCount: number;
  totalApplications: number;
  mockInterviewCount: number;
  mockInterviewAvgScore: number | null;
  networkingContactCount: number;
  weeklyAvailableMinutes: number;
  activeSprint: {
    id: string;
    title: string;
    goal: string;
    sprintType: string;
  } | null;
  externalDataSummary: {
    githubReposTracked: number;
    calendarEventsTracked: number;
  };
  trajectoryPhase: string;
  careerMomentum: string;
  dataCompletenessScore: number; // 0 to 100
  dataLimitations: string[];
  capturedAt: string;
}

export interface ConstraintValidationResult {
  isRealistic: boolean;
  totalWeeklyHoursRequired: number;
  maxWeeklyHoursAvailable: number;
  utilizationPercentage: number;
  violations: string[];
  warnings: string[];
  adjustmentsSuggested: string[];
}

export interface DimensionScore {
  score: number; // 0 to 100
  delta: number; // change from baseline
  direction: ImpactDirection;
  summary: string;
}

export interface ImpactAssessment {
  dimensions: Record<ImpactDimension, DimensionScore>;
  overallImpactScore: number;
  benefits: string[];
  tradeOffs: string[];
  risks: Array<{
    riskType: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    description: string;
    mitigation: string;
  }>;
  sensitivityFactors: Array<{
    variable: string;
    leverage: 'HIGH' | 'MEDIUM' | 'LOW';
    impactExplanation: string;
  }>;
}

export interface OpportunityForecastItem {
  companyName: string;
  jobTitle: string;
  currentMatchScore: number;
  forecastedMatchScore: number;
  readinessTrend: OpportunityReadinessTrend;
  keyPositiveFactors: string[];
  remainingGaps: string[];
  confidence: ConfidenceLevel;
}

export interface CareerPathComparisonItem {
  pathTitle: string;
  currentAlignmentScore: number;
  simulatedAlignmentScore: number;
  skillGapsToClose: string[];
  transferableSkills: string[];
  estimatedWeeksToReadiness: number;
  tradeOffs: string[];
}

export interface ScenarioResultDto {
  id?: string;
  scenarioKey: string;
  title: string;
  scenarioType: ScenarioType;
  variables: SimulationVariables;
  timeAllocation: TimeAllocation;
  isRealistic: boolean;
  constraintViolations: string[];
  impactAssessment: ImpactAssessment;
  assumptions: string[];
  confidenceLevel: ConfidenceLevel;
  confidenceReason: string;
  isRecommended: boolean;
  aiNarrative?: string | null;
  opportunityForecasts?: OpportunityForecastItem[];
  careerPathComparisons?: CareerPathComparisonItem[];
  proposedPlan?: ProposedPlanDiff | null;
}

export interface ProposedPlanDiff {
  sprintTitle: string;
  sprintGoal: string;
  sprintType: string;
  durationDays: number;
  keyMilestones: string[];
  allocatedMinutesPerDay: number;
  suggestedActionItems: Array<{
    title: string;
    description: string;
    priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    category: 'APPLICATION' | 'SKILL_BUILDING' | 'PORTFOLIO' | 'NETWORKING' | 'INTERVIEW_PREP';
    estimatedMinutes: number;
    dayNumber: number;
  }>;
  deprioritizeSuggestions: string[];
}

export interface SimulationComparisonResult {
  simulationId: string;
  bestOptionKey: string;
  recommendationReason: string;
  comparisonMatrix: {
    scenarios: Array<{
      key: string;
      title: string;
      isRecommended: boolean;
      confidenceLevel: ConfidenceLevel;
      overallScore: number;
      utilizationPercentage: number;
      dimensionScores: Record<ImpactDimension, { score: number; direction: ImpactDirection }>;
      topBenefit: string;
      topTradeOff: string;
      topRisk: string;
    }>;
  };
}
