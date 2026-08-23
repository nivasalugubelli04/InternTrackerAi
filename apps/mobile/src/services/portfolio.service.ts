import apiClient from './api';

export interface PortfolioHealth {
  overallScore: number;
  coverageScore: number;
  depthScore: number;
  docScore: number;
  recencyScore: number;
}

export interface RoleAlignment {
  targetRole: string;
  alignmentScore: number;
  requiredSkills: string[];
  strong: string[];
  growing: string[];
  missing: string[];
}

export interface BrandConsistency {
  isConsistent: boolean;
  gaps: string[];
  suggestions: string[];
}

export interface BrandInsights {
  brandIdentity: string;
  brandConsistency: BrandConsistency;
}

export interface PortfolioIntelligencePayload {
  health: PortfolioHealth;
  alignment: RoleAlignment;
  brand: BrandInsights;
}

export interface EvidenceNode {
  id: string;
  evidenceType: string;
  title: string;
  score?: number;
  date: string;
  description?: string;
}

export interface SkillEvidenceNode {
  skillId: string;
  skillName: string;
  category: string;
  confidenceScore: number;
  strengthLevel: string;
  explanation: string;
  nodes: EvidenceNode[];
}

export const portfolioService = {
  async getPortfolio(): Promise<any> {
    const response = await apiClient.get('/portfolio');
    return response.data;
  },

  async getIntelligence(): Promise<PortfolioIntelligencePayload> {
    const response = await apiClient.get('/portfolio/intelligence');
    return response.data;
  },

  async getEvidence(): Promise<SkillEvidenceNode[]> {
    const response = await apiClient.get('/portfolio/evidence');
    return response.data;
  },

  async getEvidenceMap(): Promise<any> {
    const response = await apiClient.get('/portfolio/evidence-map');
    return response.data;
  },

  async analyzeProject(id: string): Promise<any> {
    const response = await apiClient.post(`/portfolio/projects/${id}/analyze`);
    return response.data;
  },

  async generateCaseStudy(projectId: string): Promise<any> {
    const response = await apiClient.post('/portfolio/case-study/generate', { projectId });
    return response.data;
  },

  async generateHeadline(style = 'PROFESSIONAL'): Promise<any> {
    const response = await apiClient.post('/portfolio/headline/generate', { style });
    return response.data;
  },

  async generateAbout(style = 'PROFESSIONAL'): Promise<any> {
    const response = await apiClient.post('/portfolio/about/generate', { style });
    return response.data;
  },
};
