import { apiClient } from './api';

export interface OptimizationInsightItem {
  id: string;
  category: string;
  title: string;
  observation: string;
  evidence: string[];
  confidence: 'HIGH_CONFIDENCE' | 'MEDIUM_CONFIDENCE' | 'LIMITED_DATA';
  suggestedAction?: string;
  observationDays: number;
}

export interface OptimizationProposalItem {
  id: string;
  currentStrategy: string;
  observation: string;
  proposedChange: string;
  expectedBenefit: string;
  tradeOff: string;
  confidence: 'HIGH_CONFIDENCE' | 'MEDIUM_CONFIDENCE' | 'LIMITED_DATA';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'MODIFIED' | 'APPLIED';
  actionPayload: any;
}

export interface StrategyExperimentItem {
  id: string;
  title: string;
  hypothesis: string;
  durationDays: number;
  strategyA: string;
  strategyB: string;
  status: string;
  metricsCurrent?: any;
}

export interface LearnedPreferenceItem {
  id: string;
  key: string;
  value: string;
  confidence: string;
  isEnabled: boolean;
}

export interface OptimizationDashboardResponse {
  whatIsWorking: OptimizationInsightItem[];
  whatNeedsAdjustment: OptimizationInsightItem[];
  executionPatterns: {
    completionRate: number;
    shortTaskCompletionRate: number;
    longTaskCompletionRate: number;
    frequentDelayCategory?: string;
    totalTasksRecorded: number;
    totalCompleted: number;
  };
  proposals: OptimizationProposalItem[];
  activeExperiments: StrategyExperimentItem[];
  learnedPreferences: LearnedPreferenceItem[];
  dataSufficiency: {
    isSufficient: boolean;
    totalSignals: number;
    message: string;
  };
}

export const optimizationService = {
  getDashboard: async (): Promise<OptimizationDashboardResponse> => {
    const { data } = await apiClient.get<OptimizationDashboardResponse>('/optimization/dashboard');
    return data;
  },

  getInsights: async (): Promise<OptimizationInsightItem[]> => {
    const { data } = await apiClient.get<OptimizationInsightItem[]>('/optimization/insights');
    return data;
  },

  approveProposal: async (proposalId: string, customNotes?: string) => {
    const { data } = await apiClient.post(`/optimization/proposals/${proposalId}/approve`, {
      customNotes,
    });
    return data;
  },

  rejectProposal: async (proposalId: string, rejectionReason?: string) => {
    const { data } = await apiClient.post(`/optimization/proposals/${proposalId}/reject`, {
      rejectionReason,
    });
    return data;
  },

  submitFeedback: async (payload: {
    recommendationId?: string;
    recommendationType: string;
    response: string;
    comment?: string;
  }) => {
    const { data } = await apiClient.post('/optimization/feedback', payload);
    return data;
  },

  updatePreference: async (
    preferenceId: string,
    payload: { value?: string; isEnabled?: boolean },
  ) => {
    const { data } = await apiClient.patch(`/optimization/preferences/${preferenceId}`, payload);
    return data;
  },

  deletePreference: async (preferenceId: string) => {
    const { data } = await apiClient.delete(`/optimization/preferences/${preferenceId}`);
    return data;
  },
};
