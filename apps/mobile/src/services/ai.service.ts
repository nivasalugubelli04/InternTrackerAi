import { apiClient, ACCESS_TOKEN_KEY } from './api';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = 'http://localhost:3000/api/v1';

export interface AiMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

export interface AiConversation {
  id: string;
  title: string;
  contextType: string;
  contextId: string | null;
  createdAt: string;
  updatedAt: string;
  messages?: AiMessage[];
}

export const aiService = {
  async analyzeResume(resumeText: string): Promise<any> {
    const response = await apiClient.post('/ai/resume-analysis', { resumeText });
    return response.data;
  },

  async summarizeJob(jobId: string): Promise<any> {
    const response = await apiClient.post(`/ai/job-summary/${jobId}`);
    return response.data;
  },

  async explainMatch(jobId: string): Promise<any> {
    const response = await apiClient.post(`/ai/match-explanation/${jobId}`);
    return response.data;
  },

  async analyzeSkillGap(jobId: string): Promise<any> {
    const response = await apiClient.post(`/ai/skill-gap/${jobId}`);
    return response.data;
  },

  async generateCoverLetter(jobId: string): Promise<any> {
    const response = await apiClient.post(`/ai/cover-letter/${jobId}`);
    return response.data;
  },

  async generateReferral(jobId: string): Promise<any> {
    const response = await apiClient.post(`/ai/referral-message/${jobId}`);
    return response.data;
  },

  async generateInterviewPrep(jobId: string): Promise<any> {
    const response = await apiClient.post(`/ai/interview-prep/${jobId}`);
    return response.data;
  },

  async compareJobs(jobIds: string[]): Promise<any> {
    const response = await apiClient.post('/ai/compare', { jobIds });
    return response.data;
  },

  async generateRoadmap(targetRole: string, targetCompany?: string): Promise<any> {
    const response = await apiClient.post('/ai/learning-roadmap', { targetRole, targetCompany });
    return response.data;
  },

  async chat(message: string, conversationId?: string, jobId?: string): Promise<any> {
    const response = await apiClient.post('/ai/chat', { message, conversationId, jobId });
    return response.data;
  },

  async getConversations(): Promise<AiConversation[]> {
    const response = await apiClient.get('/ai/conversations');
    return response.data;
  },

  async getConversation(id: string): Promise<AiConversation> {
    const response = await apiClient.get(`/ai/conversations/${id}`);
    return response.data;
  },

  async deleteConversation(id: string): Promise<any> {
    const response = await apiClient.delete(`/ai/conversations/${id}`);
    return response.data;
  },

  /**
   * Streams chat tokens chunk-by-chunk using raw fetch and reading chunks from response body.
   */
  async streamChat(
    message: string,
    onChunk: (chunk: string) => void,
    conversationId?: string,
    jobId?: string,
  ): Promise<any> {
    const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    let url = `${API_BASE_URL}/ai/chat/stream?message=${encodeURIComponent(message)}`;
    if (conversationId) url += `&conversationId=${encodeURIComponent(conversationId)}`;
    if (jobId) url += `&jobId=${encodeURIComponent(jobId)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`SSE request failed: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('ReadableStream not supported on this platform');
    }

    const decoder = new TextDecoder();
    let done = false;
    let buffer = '';

    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      if (value) {
        buffer += decoder.decode(value, { stream: !done });
        const lines = buffer.split('\n');
        // Keep the last partial line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          const cleanLine = line.trim();
          if (cleanLine.startsWith('data:')) {
            try {
              const data = JSON.parse(cleanLine.replace('data:', '').trim());
              if (data.chunk) {
                onChunk(data.chunk);
              }
              if (data.done) {
                return data.conversation;
              }
            } catch (e) {
              // Ignore partial JSON parsing errors
            }
          }
        }
      }
    }
  }
};
