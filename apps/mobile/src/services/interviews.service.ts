import api from './api';

export const interviewsService = {
  startInterview: async (jobId: string) => {
    const { data } = await api.post('/interviews/start', { jobId });
    return data;
  },

  getInterview: async (id: string) => {
    const { data } = await api.get(`/interviews/${id}`);
    return data;
  },

  submitAnswer: async (interviewId: string, questionId: string, answer: string) => {
    const { data } = await api.post(`/interviews/${interviewId}/answer`, { questionId, answer });
    return data;
  }
};
