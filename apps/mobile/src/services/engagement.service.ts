import api from './api';

export interface NextBestStep {
  stepKey: string;
  title: string;
  description: string;
  actionLabel: string;
  targetRoute: string;
  estimatedMinutes: number;
  priority: string;
  impactExplanation: string;
}

export interface ActivationProgressData {
  isActivated: boolean;
  activationScore: number;
  timeToValueSec?: number | null;
  completedMilestones: string[];
  nextBestStep: NextBestStep | null;
}

export interface DailyFocusCardData {
  id: string;
  title: string;
  reason: string;
  actionLabel: string;
  targetRoute: string;
  priority: string;
  matchScore?: number | null;
  deadline?: string | null;
  isCompleted: boolean;
  date: string;
}

export interface WeeklyCareerSummaryData {
  period: string;
  headline: string;
  highlights: string[];
  applicationsCount: number;
  newMatchesCount: number;
  tasksCompletedCount: number;
  skillProgressCount: number;
  upcomingDeadlines: Array<{
    title: string;
    company: string;
    deadline: string;
  }>;
  recommendedFocus: string;
  keyInsight: string;
  nextBestAction: NextBestStep;
}

export const engagementService = {
  async getActivationProgress(): Promise<ActivationProgressData> {
    const { data } = await api.get('/engagement/activation-progress');
    return data;
  },

  async getDailyFocus(): Promise<DailyFocusCardData> {
    const { data } = await api.get('/engagement/daily-focus');
    return data;
  },

  async completeDailyFocus(id: string) {
    const { data } = await api.post(`/engagement/daily-focus/${id}/complete`);
    return data;
  },

  async getWeeklySummary(): Promise<WeeklyCareerSummaryData> {
    const { data } = await api.get('/engagement/weekly-summary');
    return data;
  },

  async recordAction(payload: {
    actionType: 'OPENED' | 'CLICKED' | 'COMPLETED' | 'DISMISSED';
    featureArea: string;
    signalId?: string;
    notificationId?: string;
    details?: Record<string, any>;
  }) {
    try {
      await api.post('/engagement/actions/record', payload);
    } catch {
      // Non-blocking telemetry
    }
  },
};
