import apiClient from './api';

export interface CareerActionItem {
  id: string;
  actionType: string;
  entityType: string;
  entityId: string | null;
  priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: string;
  title: string;
  description: string;
  expiresAt: string | null;
}

export interface CareerOverviewSummary {
  targetRole: string;
  careerGoal: string;
  profileCompletion: number;
  topSkills: string[];
  currentSkillDevelopment: string[];
  applicationCount: number;
  interviewCount: number;
  offerCount: number;
  learningProgress: number;
  simulationPerformance: number | null;
}

export interface CareerReadiness {
  profile: 'READY' | 'DEVELOPING' | 'NEEDS ATTENTION' | 'INSUFFICIENT DATA';
  resume: 'READY' | 'DEVELOPING' | 'NEEDS ATTENTION' | 'INSUFFICIENT DATA';
  skills: 'READY' | 'DEVELOPING' | 'NEEDS ATTENTION' | 'INSUFFICIENT DATA';
  applications: 'READY' | 'DEVELOPING' | 'NEEDS ATTENTION' | 'INSUFFICIENT DATA';
  interviews: 'READY' | 'DEVELOPING' | 'NEEDS ATTENTION' | 'INSUFFICIENT DATA';
  learning: 'READY' | 'DEVELOPING' | 'NEEDS ATTENTION' | 'INSUFFICIENT DATA';
  methodology: Record<string, string>;
}

export interface TimelineEvent {
  id: string;
  eventType: string;
  category: string;
  timestamp: string;
  title: string;
  description: string;
  metadata?: any;
}

export interface DashboardPayload {
  summary: CareerOverviewSummary;
  actions: CareerActionItem[];
  opportunities: any[];
  applications: any;
  interviews: any[];
  assessments: any[];
  learning: any;
  skills: any[];
  readiness: CareerReadiness;
  notifications: any;
}

export const careerCenterService = {
  async getDashboard(): Promise<DashboardPayload> {
    const response = await apiClient.get('/career-center');
    return response.data;
  },

  async getTimeline(categories?: string): Promise<TimelineEvent[]> {
    const response = await apiClient.get('/career-center/timeline', {
      params: { categories },
    });
    return response.data;
  },

  async getReadiness(): Promise<CareerReadiness> {
    const response = await apiClient.get('/career-center/readiness');
    return response.data;
  },

  async completeAction(id: string): Promise<any> {
    const response = await apiClient.post(`/career-center/actions/${id}/complete`);
    return response.data;
  },

  async dismissAction(id: string): Promise<any> {
    const response = await apiClient.post(`/career-center/actions/${id}/dismiss`);
    return response.data;
  },

  async snoozeAction(id: string, snoozeHours = 24): Promise<any> {
    const response = await apiClient.post(`/career-center/actions/${id}/snooze`, {
      snoozeHours,
    });
    return response.data;
  },

  async updateDailyPlan(timeBudget?: number, careerMode?: string): Promise<CareerActionItem[]> {
    const response = await apiClient.post('/career-center/daily-plan', {
      timeBudget,
      careerMode,
    });
    return response.data;
  },

  async getDailyBrief(): Promise<string> {
    const response = await apiClient.post('/career-ai/daily-brief');
    return response.data;
  },

  async getActionPlan(timeBudget?: number): Promise<string> {
    const response = await apiClient.post('/career-ai/action-plan', {
      timeBudget,
    });
    return response.data;
  },

  async chat(message: string, conversationId?: string, jobId?: string): Promise<any> {
    const response = await apiClient.post('/career-ai/chat', {
      message,
      conversationId,
      jobId,
    });
    return response.data;
  },
};
