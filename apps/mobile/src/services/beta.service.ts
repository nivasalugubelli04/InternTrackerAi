import api from './api';

export interface SubmitFeedbackPayload {
  type: 'BUG' | 'FEATURE_REQUEST' | 'GENERAL' | 'MATCH_QUALITY' | 'AI_QUALITY';
  category?: string;
  title?: string;
  message: string;
  severity?: string;
  rating?: number;
  resourceId?: string;
  metadata?: Record<string, any>;
}

export interface ContextualRatingPayload {
  feature: string;
  rating: number; // 1 for helpful, -1 for not helpful, or 1-5
  comment?: string;
  resourceId?: string;
  context?: Record<string, any>;
}

export interface ReportBugPayload {
  title: string;
  description: string;
  expectedBehavior?: string;
  affectedFeature?: string;
  severity?: string;
  route?: string;
  screenshotUrl?: string;
}

export interface BetaOnboardingState {
  id: string;
  userId: string;
  isWelcomed: boolean;
  hasExploredFeatures: boolean;
  feedbackDismissed: boolean;
  isActivated: boolean;
  activationScore: number;
  completedSteps: string[];
}

export const betaService = {
  async submitFeedback(payload: SubmitFeedbackPayload) {
    const { data } = await api.post('/beta/feedback', payload);
    return data;
  },

  async submitContextualRating(payload: ContextualRatingPayload) {
    const { data } = await api.post('/beta/feedback/contextual', payload);
    return data;
  },

  async reportBug(payload: ReportBugPayload) {
    const { data } = await api.post('/beta/bugs', payload);
    return data;
  },

  async trackEvent(eventName: string, properties?: Record<string, any>) {
    try {
      await api.post('/beta/analytics/events', {
        eventName,
        properties,
        deviceCategory: 'mobile',
        appVersion: '1.0.0-beta',
      });
    } catch {
      // Analytics failures should never interrupt UI
    }
  },

  async getOnboardingState(): Promise<BetaOnboardingState> {
    const { data } = await api.get('/beta/onboarding');
    return data;
  },

  async updateOnboardingState(payload: Partial<BetaOnboardingState>): Promise<BetaOnboardingState> {
    const { data } = await api.patch('/beta/onboarding', payload);
    return data;
  },

  async getActivationStatus() {
    const { data } = await api.get('/beta/activation');
    return data;
  },
};
