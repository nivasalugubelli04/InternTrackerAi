import api from './api';

export const resumeBuilderService = {
  tailorBulletPoints: async (jobId: string, experienceId: string) => {
    const { data } = await api.post(`/resume-builder/tailor/${jobId}`, { experienceId });
    return data;
  },

  generateResume: async (jobId: string | null, resumeData: any) => {
    const { data } = await api.post('/resume-builder/generate', { jobId, resumeData });
    return data;
  },

  getMyResumes: async () => {
    const { data } = await api.get('/resume-builder');
    return data;
  },

  getDownloadUrl: (resumeId: string) => {
    // Return the full URL for downloading (assuming API base URL)
    return `${api.defaults.baseURL}/resume-builder/download/${resumeId}`;
  }
};
