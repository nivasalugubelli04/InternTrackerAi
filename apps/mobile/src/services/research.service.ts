import apiClient from './api.client';

export type OpportunityCategory =
  | 'INTERNSHIP'
  | 'ENTRY_LEVEL_JOB'
  | 'GRADUATE_PROGRAM'
  | 'APPRENTICESHIP'
  | 'FELLOWSHIP'
  | 'HACKATHON'
  | 'OPEN_SOURCE'
  | 'TECHNICAL_EVENT'
  | 'CAREER_PROGRAM'
  | 'OTHER';

export type FreshnessStatus =
  'NEW' | 'RECENT' | 'ACTIVE' | 'DEADLINE_SOON' | 'POSSIBLY_EXPIRED' | 'EXPIRED' | 'ARCHIVED';

export type OpportunityReadinessLevel =
  'READY' | 'NEEDS_PREPARATION' | 'PARTIALLY_READY' | 'LOW_ALIGNMENT';

export interface RelevanceScoreBreakdown {
  overallScore: number;
  roleAlignmentScore: number;
  skillOverlapScore: number;
  skillGapClosingScore: number;
  projectRelevanceScore: number;
  locationWorkModeScore: number;
  readinessLevel: OpportunityReadinessLevel;
  matchingStrengths: string[];
  criticalGaps: string[];
  relevantProjects: string[];
  recommendedPreparation: string[];
}

export interface DiscoveredOpportunityItem {
  id: string;
  jobTitle: string;
  companyName: string;
  companyLogoUrl?: string | null;
  category: OpportunityCategory;
  location?: string | null;
  workMode?: string | null;
  stipend?: number | null;
  deadline?: string | null;
  applicationUrl: string;
  freshnessStatus: FreshnessStatus;
  sourceName: string;
  sourceTrust: string;
  relevance: RelevanceScoreBreakdown;
  isSaved?: boolean;
  isFollowedCompany?: boolean;
  whyMatchedExplanation?: string;
}

export interface TechnologyDemandTrend {
  skillName: string;
  category: string;
  frequencyCount: number;
  demandTrend: 'INCREASING' | 'STABLE' | 'EMERGING' | 'DECLINING';
  sourceCount: number;
  sampleJobTitles: string[];
}

export interface ResearchFeedResponse {
  topMatches: DiscoveredOpportunityItem[];
  newForYou: DiscoveredOpportunityItem[];
  deadlineSoon: DiscoveredOpportunityItem[];
  fromFollowedCompanies: DiscoveredOpportunityItem[];
  buildReadinessFirst: DiscoveredOpportunityItem[];
  trendingSignals: TechnologyDemandTrend[];
  totalDiscovered: number;
}

export interface CompanyIntelligenceProfile {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  industry?: string | null;
  headquarters?: string | null;
  companySize?: string | null;
  description?: string | null;
  activeOpportunityCount: number;
  hiringVelocity: 'ACCELERATING' | 'STEADY' | 'SELECTIVE';
  topRequiredSkills: Array<{ name: string; count: number }>;
  userApplicationCount: number;
  isFollowed: boolean;
  latestOpportunities: Array<{
    id: string;
    title: string;
    deadline?: string | null;
    matchScore: number;
  }>;
}

export interface ResearchWatchlist {
  id: string;
  title: string;
  description?: string | null;
  targetRoles: string[];
  categories: OpportunityCategory[];
  minMatchScore: number;
  isAlertEnabled: boolean;
  items: Array<{
    id: string;
    opportunityTitle: string;
    companyName: string;
    matchScore: number;
    notes?: string | null;
  }>;
  _count?: { items: number };
}

class ResearchClientService {
  async getPersonalizedFeed(): Promise<ResearchFeedResponse> {
    const res = await apiClient.get<ResearchFeedResponse>('/research/feed');
    return res.data;
  }

  async triggerRefresh(): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.post<{ success: boolean; message: string }>('/research/refresh');
    return res.data;
  }

  async getSources(): Promise<any[]> {
    const res = await apiClient.get<any[]>('/research/sources');
    return res.data;
  }

  async getTrendingSignals(limit = 8): Promise<TechnologyDemandTrend[]> {
    const res = await apiClient.get<TechnologyDemandTrend[]>(`/research/signals?limit=${limit}`);
    return res.data;
  }

  async getFollowedCompanies(): Promise<any[]> {
    const res = await apiClient.get<any[]>('/research/companies/followed');
    return res.data;
  }

  async getCompanyProfile(companyId: string): Promise<CompanyIntelligenceProfile> {
    const res = await apiClient.get<CompanyIntelligenceProfile>(`/research/companies/${companyId}`);
    return res.data;
  }

  async followCompany(
    companyId: string,
    minMatchAlert = 75,
    notes?: string,
  ): Promise<{ success: boolean }> {
    const res = await apiClient.post<{ success: boolean }>(
      `/research/companies/${companyId}/follow`,
      {
        minMatchAlert,
        notes,
      },
    );
    return res.data;
  }

  async unfollowCompany(companyId: string): Promise<{ success: boolean }> {
    const res = await apiClient.delete<{ success: boolean }>(
      `/research/companies/${companyId}/follow`,
    );
    return res.data;
  }

  async getWatchlists(): Promise<ResearchWatchlist[]> {
    const res = await apiClient.get<ResearchWatchlist[]>('/research/watchlists');
    return res.data;
  }

  async createWatchlist(dto: {
    title: string;
    description?: string;
    targetRoles?: string[];
    categories?: OpportunityCategory[];
    minMatchScore?: number;
  }): Promise<ResearchWatchlist> {
    const res = await apiClient.post<ResearchWatchlist>('/research/watchlists', dto);
    return res.data;
  }

  async addWatchlistItem(
    watchlistId: string,
    payload: {
      opportunityTitle: string;
      companyName: string;
      matchScore?: number;
      jobPostingId?: string;
      notes?: string;
    },
  ): Promise<any> {
    const res = await apiClient.post(`/research/watchlists/${watchlistId}/items`, payload);
    return res.data;
  }

  async createPreparationAction(payload: {
    opportunityTitle: string;
    companyName: string;
    suggestedTask: string;
    estimatedMinutes?: number;
  }): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.post<{ success: boolean; message: string }>(
      '/research/prepare',
      payload,
    );
    return res.data;
  }
}

export const researchService = new ResearchClientService();
