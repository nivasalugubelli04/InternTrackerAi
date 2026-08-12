/**
 * Phase 8 — Opportunities API Service
 *
 * Wraps all /api/v1/opportunities endpoints.
 * Uses the shared apiClient (JWT-authenticated Axios instance).
 */

import { apiClient } from './api';

export type DeadlineUrgency = 'URGENT' | 'SOON' | 'NORMAL' | 'UNKNOWN';
export type SortOption =
  | 'best_match'
  | 'newest'
  | 'deadline_soon'
  | 'highest_stipend'
  | 'company_priority';

export type WorkMode = 'REMOTE' | 'HYBRID' | 'ONSITE';
export type DismissReason =
  | 'NOT_RELEVANT'
  | 'WRONG_LOCATION'
  | 'MISSING_SKILLS'
  | 'ALREADY_APPLIED'
  | 'NOT_INTERESTED'
  | 'OTHER';

export type InteractionType =
  | 'VIEW'
  | 'SAVE'
  | 'UNSAVE'
  | 'DISMISS'
  | 'APPLY_CLICK'
  | 'AI_COPILOT_OPEN'
  | 'SEARCH'
  | 'FILTER';

export interface MatchScore {
  overallScore: number;
  skillScore: number;
  educationScore: number;
  locationScore: number;
  cgpaScore: number;
  companyPreferenceScore: number;
  stipendScore: number;
  experienceScore: number;
}

export interface MatchReason {
  reasonType: string;
  description: string;
  weight: number;
}

export interface RecommendationInfo {
  rank: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  recommendationType: string;
  isViewed: boolean;
  isSaved: boolean;
  isDismissed: boolean;
  reasons: MatchReason[];
}

export interface CompanyInfo {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  website: string | null;
  careerPageUrl: string | null;
  industry: string | null;
  description: string | null;
  headquarters: string | null;
  companySize: string | null;
}

export interface Opportunity {
  id: string;
  title: string;
  department: string | null;
  employmentType: string | null;
  experienceLevel: string | null;
  location: string | null;
  workMode: WorkMode | null;
  stipend: number | null;
  salary: number | null;
  duration: string | null;
  description: string | null;
  requirements: string[];
  responsibilities: string[];
  benefits: string[];
  applicationUrl: string;
  postedDate: string | null;
  deadline: string | null;
  deadlineUrgency: DeadlineUrgency;
  status: string;
  createdAt: string;
  company: CompanyInfo;
  matchScore: MatchScore | null;
  recommendation: RecommendationInfo | null;
  isSaved: boolean;
  isDismissed: boolean;
}

export interface FeedResponse {
  data: Opportunity[];
  meta: {
    hasMore: boolean;
    nextCursor: string | null;
    limit: number;
  };
}

export interface DashboardStats {
  newCount: number;
  highMatchCount: number;
  savedCount: number;
}

export interface OpportunitiesQueryParams {
  q?: string;
  companyId?: string;
  location?: string;
  state?: string;
  industry?: string;
  skills?: string;
  workMode?: WorkMode;
  employmentType?: string;
  minStipend?: number;
  maxStipend?: number;
  minMatchScore?: number;
  trackedCompaniesOnly?: boolean;
  postedAfter?: string;
  postedBefore?: string;
  deadlineBefore?: string;
  sort?: SortOption;
  cursor?: string;
  limit?: number;
}

export interface FilterOptions {
  locations: string[];
  industries: string[];
  workModes: WorkMode[];
}

export const opportunitiesService = {
  // ── Home Dashboard ───────────────────────────────────────────────────────────

  async getDashboardStats(): Promise<DashboardStats> {
    const res = await apiClient.get<DashboardStats>('/opportunities/stats');
    return res.data;
  },

  // ── Home Sections ─────────────────────────────────────────────────────────────

  async getTopMatches(limit = 10): Promise<Opportunity[]> {
    const res = await apiClient.get<Opportunity[]>('/opportunities/top-matches', {
      params: { limit },
    });
    return res.data;
  },

  async getNewOpportunities(limit = 10): Promise<Opportunity[]> {
    const res = await apiClient.get<Opportunity[]>('/opportunities/new', { params: { limit } });
    return res.data;
  },

  async getClosingSoon(limit = 10): Promise<Opportunity[]> {
    const res = await apiClient.get<Opportunity[]>('/opportunities/closing-soon', {
      params: { limit },
    });
    return res.data;
  },

  async getTrackedCompanyOpportunities(limit = 20): Promise<Opportunity[]> {
    const res = await apiClient.get<Opportunity[]>('/opportunities/tracked-companies', {
      params: { limit },
    });
    return res.data;
  },

  // ── Main Feed ─────────────────────────────────────────────────────────────────

  async getFeed(params: OpportunitiesQueryParams = {}): Promise<FeedResponse> {
    const res = await apiClient.get<FeedResponse>('/opportunities', { params });
    return res.data;
  },

  // ── Saved ────────────────────────────────────────────────────────────────────

  async getSaved(): Promise<Opportunity[]> {
    const res = await apiClient.get<Opportunity[]>('/opportunities/saved');
    return res.data;
  },

  // ── Search ────────────────────────────────────────────────────────────────────

  async search(q: string, limit = 20): Promise<{ data: Opportunity[]; meta: { total: number } }> {
    const res = await apiClient.get('/opportunities/search', { params: { q, limit } });
    return res.data;
  },

  // ── Filters ───────────────────────────────────────────────────────────────────

  async getFilterOptions(): Promise<FilterOptions> {
    const res = await apiClient.get<FilterOptions>('/opportunities/filters');
    return res.data;
  },

  // ── Detail ────────────────────────────────────────────────────────────────────

  async getById(id: string): Promise<Opportunity> {
    const res = await apiClient.get<Opportunity>(`/opportunities/${id}`);
    return res.data;
  },

  // ── Save / Unsave ─────────────────────────────────────────────────────────────

  async save(jobId: string): Promise<{ saved: boolean; savedAt: string }> {
    const res = await apiClient.post(`/opportunities/${jobId}/save`);
    return res.data;
  },

  async unsave(jobId: string): Promise<{ saved: boolean }> {
    const res = await apiClient.delete(`/opportunities/${jobId}/save`);
    return res.data;
  },

  // ── Dismiss ───────────────────────────────────────────────────────────────────

  async dismiss(jobId: string, reason: DismissReason = 'NOT_INTERESTED'): Promise<{ dismissed: boolean }> {
    const res = await apiClient.post(`/opportunities/${jobId}/dismiss`, { reason });
    return res.data;
  },

  // ── Interactions ──────────────────────────────────────────────────────────────

  async trackInteraction(
    interactionType: InteractionType,
    jobId?: string,
    extras?: { query?: string; filtersJson?: Record<string, unknown> },
  ): Promise<void> {
    try {
      await apiClient.post('/opportunities/interaction', {
        interactionType,
        jobId,
        ...extras,
      });
    } catch {
      // Analytics tracking is non-critical; swallow errors silently
    }
  },
};
