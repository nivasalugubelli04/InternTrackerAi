import { FreshnessStatus, OpportunityCategory, SourceTrustLevel } from '@prisma/client';

export type OpportunityReadinessLevel =
  'READY' | 'NEEDS_PREPARATION' | 'PARTIALLY_READY' | 'LOW_ALIGNMENT';

export interface RawOpportunityPayload {
  externalId?: string;
  sourceName: string;
  companyName: string;
  jobTitle: string;
  category?: OpportunityCategory;
  department?: string;
  location?: string;
  workMode?: 'REMOTE' | 'HYBRID' | 'ONSITE';
  stipend?: number;
  salary?: number;
  duration?: string;
  description: string;
  requirements?: string[];
  skills?: string[];
  applicationUrl: string;
  postedDate?: Date | string;
  deadline?: Date | string;
}

export interface NormalizedOpportunity {
  hash: string;
  companyName: string;
  companySlug: string;
  jobTitle: string;
  category: OpportunityCategory;
  department?: string | undefined;
  location?: string | undefined;
  workMode?: 'REMOTE' | 'HYBRID' | 'ONSITE' | undefined;
  stipend?: number | undefined;
  salary?: number | undefined;
  duration?: string | undefined;
  description: string;
  requirements: string[];
  skills: string[];
  applicationUrl: string;
  postedDate?: Date | undefined;
  deadline?: Date | undefined;
  sourceTrust: SourceTrustLevel;
}

export interface RelevanceScoreBreakdown {
  overallScore: number; // 0 - 100
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
  deadline?: Date | null;
  applicationUrl: string;
  freshnessStatus: FreshnessStatus;
  sourceName: string;
  sourceTrust: SourceTrustLevel;
  relevance: RelevanceScoreBreakdown;
  isSaved?: boolean;
  isFollowedCompany?: boolean;
  whyMatchedExplanation?: string;
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
    deadline?: Date | null;
    matchScore: number;
  }>;
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
