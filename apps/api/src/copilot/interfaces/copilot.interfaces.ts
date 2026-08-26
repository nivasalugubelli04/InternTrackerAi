export type CopilotIntentType =
  | 'DAILY_PLANNING'
  | 'WEEKLY_PLANNING'
  | 'CAREER_ANALYSIS'
  | 'SKILL_ANALYSIS'
  | 'SKILL_RECOMMENDATION'
  | 'OPPORTUNITY_ANALYSIS'
  | 'APPLICATION_ANALYSIS'
  | 'INTERVIEW_PREPARATION'
  | 'PORTFOLIO_ANALYSIS'
  | 'NETWORKING_ADVICE'
  | 'CAREER_TRAJECTORY'
  | 'CAREER_SIMULATION'
  | 'CAREER_COMPARISON'
  | 'CAREER_RESEARCH'
  | 'PROGRESS_ANALYSIS'
  | 'PRIORITY_ANALYSIS'
  | 'MULTI_ENGINE'
  | 'GENERAL_CAREER_GUIDANCE';

export type CopilotAnswerType =
  | 'DIRECT_ANSWER'
  | 'ANALYSIS'
  | 'COMPARISON'
  | 'RECOMMENDATION'
  | 'ACTION_PLAN'
  | 'SIMULATION_SUMMARY'
  | 'OPPORTUNITY_SUMMARY'
  | 'PROGRESS_SUMMARY';

export type CopilotConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LIMITED';

export type CopilotProposalStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'EXECUTED';

export interface GroundingSourceRef {
  sourceType: string;
  sourceId?: string;
  title: string;
  timestamp?: string;
  confidence: number;
}

export interface CopilotToolDefinition {
  name: string;
  description: string;
  targetPhase: string;
  requiredPermissions: string[];
}

export interface CopilotContextBundle {
  userId: string;
  intents: CopilotIntentType[];
  careerStateSummary?: any;
  executionPlan?: any;
  topOpportunities?: any[];
  skillGaps?: any[];
  portfolioEvidence?: any[];
  simulationResults?: any;
  analyticsSnapshot?: any;
  priorityActions?: any[];
  groundingSources: GroundingSourceRef[];
  estimatedTokens: number;
}

export interface CopilotStructuredResponse {
  answerType: CopilotAnswerType;
  summary: string;
  keyInsights: string[];
  evidence: string[];
  confidence: CopilotConfidenceLevel;
  confidenceReason?: string;
  limitations?: string;
  recommendedActions: string[];
  suggestedFollowUps: string[];
  proposedAction?: {
    proposalType: string;
    title: string;
    description: string;
    targetEngine: string;
    payload: any;
  };
}

export interface CopilotHomeSummary {
  greeting: string;
  currentRole: string;
  careerGoals: string[];
  topPriority?:
    | {
        title: string;
        estimatedMinutes: number;
        urgency: string;
      }
    | undefined;
  activeOpportunitiesCount: number;
  openSkillGapsCount: number;
  recentContextTopics: string[];
  suggestedPrompts: string[];
}
