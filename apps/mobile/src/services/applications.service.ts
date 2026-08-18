import { useQuery, useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import api from './api';

export enum ApplicationStatus {
  DISCOVERED = 'DISCOVERED',
  SAVED = 'SAVED',
  APPLICATION_STARTED = 'APPLICATION_STARTED',
  APPLIED = 'APPLIED',
  ASSESSMENT = 'ASSESSMENT',
  INTERVIEW = 'INTERVIEW',
  FINAL_ROUND = 'FINAL_ROUND',
  OFFER = 'OFFER',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
  EXPIRED = 'EXPIRED',
}

export interface ApplicationEvent {
  id: string;
  applicationId: string;
  fromStatus?: ApplicationStatus;
  toStatus: ApplicationStatus;
  note?: string;
  createdAt: string;
}

export interface Application {
  id: string;
  userId: string;
  jobId: string;
  status: ApplicationStatus;
  appliedAt?: string;
  applicationUrl?: string;
  companyNameSnapshot?: string;
  jobTitleSnapshot?: string;
  locationSnapshot?: string;
  notes?: string;
  salaryExpectation?: number;
  source?: string;
  nextAction?: string;
  nextActionDate?: string;
  priorityScore: number;
  priorityLabel: string;
  resumeVersionId?: string;
  coverLetterText?: string;
  portfolioUrl?: string;
  transcriptUrl?: string;
  rejectionReason?: string;
  rejectionFeedback?: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  job?: {
    company?: { logoUrl?: string; name: string };
    deadline?: string;
    matchScores?: Array<{ overallScore: number; skillScore?: number }>;
  };
  resumeVersion?: { versionName: string };
  documents?: Array<{ id: string; name: string; fileUrl: string }>;
  events?: ApplicationEvent[];
  // Dynamic fields
  interviews?: any[];
  assessments?: any[];
  offers?: any[];
}

export interface ApplicationStats {
  totalApplications: number;
  active: number;
  applied: number;
  assessments: number;
  interviews: number;
  offers: number;
  rejected: number;
  withdrawn: number;
  saved: number;
  discovered: number;
  interviewRate: number;
  successRate: number;
  avgResponseTimeDays?: number;
}

const QUERY_KEY = 'applications';

export const applicationsApi = {
  create: async (data: Partial<Application>) => {
    const response = await api.post<Application>('/applications', data);
    return response.data;
  },

  findAll: async (params: { status?: ApplicationStatus; cursor?: string; limit?: number }) => {
    const response = await api.get<{ data: Application[]; nextCursor?: string }>('/applications', {
      params,
    });
    return response.data;
  },

  getStats: async () => {
    const response = await api.get<ApplicationStats>('/applications/analytics');
    return response.data;
  },

  findOne: async (id: string) => {
    const response = await api.get<Application>(`/applications/${id}`);
    return response.data;
  },

  getTimeline: async (id: string) => {
    const response = await api.get<ApplicationEvent[]>(`/applications/${id}/timeline`);
    return response.data;
  },

  update: async (id: string, data: Partial<Application>) => {
    const response = await api.patch<Application>(`/applications/${id}`, data);
    return response.data;
  },

  changeStatus: async (id: string, status: ApplicationStatus, note?: string) => {
    const response = await api.patch<Application>(`/applications/${id}/status`, { status, note });
    return response.data;
  },

  remove: async (id: string) => {
    await api.delete(`/applications/${id}`);
  },

  getActions: async () => {
    const response = await api.get<any[]>('/applications/actions');
    return response.data;
  },

  analyze: async (id: string) => {
    const response = await api.post<any>(`/applications/${id}/ai/analyze`);
    return response.data;
  },

  generateCoverLetter: async (id: string) => {
    const response = await api.post<{ content: string }>(`/applications/${id}/ai/cover-letter`);
    return response.data;
  },

  getFollowUpDraft: async (id: string) => {
    const response = await api.post<{ subject: string; body: string }>(
      `/applications/${id}/follow-up`,
    );
    return response.data;
  },
};

// React Query Hooks
export const useApplications = (status?: ApplicationStatus) => {
  return useInfiniteQuery({
    queryKey: [QUERY_KEY, 'list', status],
    queryFn: ({ pageParam }) => applicationsApi.findAll({ status, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
};

export const useApplicationStats = () => {
  return useQuery({
    queryKey: [QUERY_KEY, 'stats'],
    queryFn: applicationsApi.getStats,
  });
};

export const useApplicationDetail = (id: string) => {
  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: () => applicationsApi.findOne(id),
    enabled: !!id,
  });
};

export const useApplicationTimeline = (id: string) => {
  return useQuery({
    queryKey: [QUERY_KEY, 'timeline', id],
    queryFn: () => applicationsApi.getTimeline(id),
    enabled: !!id,
  });
};

export const useCreateApplication = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: applicationsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['career-center'] });
    },
  });
};

export const useUpdateApplication = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Application> }) =>
      applicationsApi.update(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['career-center'] });
      queryClient.setQueryData([QUERY_KEY, 'detail', variables.id], data);
    },
  });
};

export const useChangeApplicationStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: ApplicationStatus; note?: string }) =>
      applicationsApi.changeStatus(id, status, note),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['career-center'] });
      queryClient.setQueryData([QUERY_KEY, 'detail', variables.id], data);
    },
  });
};

export const useDeleteApplication = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: applicationsApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['career-center'] });
    },
  });
};

export const useApplicationActions = () => {
  return useQuery({
    queryKey: [QUERY_KEY, 'actions'],
    queryFn: applicationsApi.getActions,
  });
};

export const useAnalyzeApplication = () => {
  return useMutation({
    mutationFn: (id: string) => applicationsApi.analyze(id),
  });
};

export const useGenerateCoverLetter = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => applicationsApi.generateCoverLetter(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'detail', id] });
    },
  });
};

export const useGetFollowUpDraft = () => {
  return useMutation({
    mutationFn: (id: string) => applicationsApi.getFollowUpDraft(id),
  });
};
