import { apiClient } from './api';

export interface GroundingSourceRef {
  sourceType: string;
  sourceId?: string;
  title: string;
  timestamp?: string;
  confidence: number;
}

export interface CopilotStructuredResponse {
  answerType: string;
  summary: string;
  keyInsights: string[];
  evidence: string[];
  confidence: 'HIGH' | 'MEDIUM' | 'LIMITED';
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
  topPriority?: {
    title: string;
    estimatedMinutes: number;
    urgency: string;
  };
  activeOpportunitiesCount: number;
  openSkillGapsCount: number;
  recentContextTopics: string[];
  suggestedPrompts: string[];
}

export interface SendMessagePayload {
  message: string;
  conversationId?: string;
  jobId?: string;
}

export interface CopilotMessageResult {
  conversationId: string;
  messageId: string;
  intent: string;
  response: CopilotStructuredResponse;
  proposal?: {
    id: string;
    title: string;
    description: string;
    status: string;
  };
  groundingSources: GroundingSourceRef[];
}

export const copilotService = {
  getHomeSummary: async (): Promise<CopilotHomeSummary> => {
    const { data } = await apiClient.get<CopilotHomeSummary>('/copilot/home');
    return data;
  },

  sendMessage: async (payload: SendMessagePayload): Promise<CopilotMessageResult> => {
    const { data } = await apiClient.post<CopilotMessageResult>('/copilot/messages', payload);
    return data;
  },

  getConversations: async () => {
    const { data } = await apiClient.get('/copilot/conversations');
    return data;
  },

  getConversation: async (id: string) => {
    const { data } = await apiClient.get(`/copilot/conversations/${id}`);
    return data;
  },

  deleteConversation: async (id: string) => {
    const { data } = await apiClient.delete(`/copilot/conversations/${id}`);
    return data;
  },

  confirmProposal: async (proposalId: string, customNotes?: string) => {
    const { data } = await apiClient.post(`/copilot/proposals/${proposalId}/confirm`, {
      customNotes,
    });
    return data;
  },

  cancelProposal: async (proposalId: string) => {
    const { data } = await apiClient.post(`/copilot/proposals/${proposalId}/cancel`);
    return data;
  },

  getMemories: async () => {
    const { data } = await apiClient.get('/copilot/memories');
    return data;
  },

  deleteMemory: async (memoryId: string) => {
    const { data } = await apiClient.delete(`/copilot/memories/${memoryId}`);
    return data;
  },
};
