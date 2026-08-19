import api from './api';

export const interviewsService = {
  getHistory: async () => {
    const { data } = await api.get('/interviews');
    return data;
  },

  getReadiness: async (jobId?: string) => {
    const url = jobId ? `/interviews/${jobId}/readiness` : '/interviews/readiness';
    const { data } = await api.get(url);
    return data;
  },

  getPreparationWorkspace: async (jobId: string) => {
    const { data } = await api.get(`/interviews/${jobId}/preparation`);
    return data;
  },

  startInterview: async (jobId: string, type: string = 'MIXED', mode: string = 'FULL_MOCK') => {
    const { data } = await api.post('/interviews/start', { jobId, type, mode });
    return data;
  },

  getSession: async (sessionId: string) => {
    const { data } = await api.get(`/interviews/sessions/${sessionId}`);
    return data;
  },

  submitAnswer: async (sessionId: string, questionId: string, answer: string) => {
    const { data } = await api.post(`/interviews/sessions/${sessionId}/answer`, {
      questionId,
      answer,
    });
    return data;
  },

  getHint: async (sessionId: string, questionId: string, level: number = 1) => {
    const { data } = await api.post(`/interviews/sessions/${sessionId}/hint`, {
      questionId,
      level,
    });
    return data;
  },

  finishSession: async (sessionId: string) => {
    const { data } = await api.post(`/interviews/sessions/${sessionId}/finish`);
    return data;
  },

  getSessionReport: async (sessionId: string) => {
    const { data } = await api.get(`/interviews/sessions/${sessionId}/report`);
    return data;
  },

  chatWithCoach: async (jobId: string, message: string) => {
    const { data } = await api.post(`/interviews/${jobId}/ai/coach`, { message });
    return data;
  },
};
