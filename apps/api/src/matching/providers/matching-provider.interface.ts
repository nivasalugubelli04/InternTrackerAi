import type { NormalizedJob } from '../services/job-analyzer.service';
import type { NormalizedProfile } from '../services/profile-analyzer.service';

export interface MatchReasonData {
  reasonType: string;
  description: string;
  weight: number;
}

export interface MatchResult {
  overallScore: number;
  skillScore: number;
  educationScore: number;
  locationScore: number;
  cgpaScore: number;
  companyPreferenceScore: number;
  stipendScore: number;
  experienceScore: number;
  matchedSkills: string[];
  matchedRoles: string[];
  matchedLocations: string[];
  matchedCompanies: string[];
  confidenceScore: number;
  reasons: MatchReasonData[];
}

export const MATCHING_PROVIDER = 'MATCHING_PROVIDER';

export interface IMatchingProvider {
  calculateMatch(profile: NormalizedProfile, job: NormalizedJob): Promise<MatchResult>;
}
