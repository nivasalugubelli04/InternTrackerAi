import { useQuery, useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import api from './api';

export enum ApplicationStatus {
  DISCOVERED = 'DISCOVERED',
  SAVED = 'SAVED',
  APPLIED = 'APPLIED',
  ASSESSMENT = 'ASSESSMENT',
  INTERVIEW = 'INTERVIEW',
  OFFER = 'OFFER',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
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
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  job?: { company?: { logoUrl?: string } };
  events?: ApplicationEvent[];
}

export interface ApplicationStats {
  totalApplications: number;
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
}

const QUERY_KEY = 'applications';

export const applicationsApi = {
  create: async (data: Partial<Application>) => {
    const response = await api.post<Application>('/applications', data);
    return response.data;
  },
  
  findAll: async (params: { status?: ApplicationStatus; cursor?: string; limit?: number }) => {
    const response = await api.get<{ data: Application[]; nextCursor?: string }>('/applications', { params });
    return response.data;
  },

  getStats: async () => {
    const response = await api.get<ApplicationStats>('/applications/stats');
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
    },
  });
};

export const useUpdateApplication = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Application> }) => applicationsApi.update(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
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
    },
  });
};
