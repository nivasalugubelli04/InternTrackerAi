import apiClient from './api';

export interface TimeAllocation {
  learningPercent: number;
  projectsPercent: number;
  applicationsPercent: number;
  interviewPrepPercent: number;
  networkingPercent: number;
}

export interface SimulationVariables {
  skillInvestment?: {
    skillName: string;
    targetProficiency?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
    weeklyHours: number;
    durationWeeks: number;
  };
  applicationStrategy?: {
    additionalWeeklyApplications: number;
    minimumMatchScore?: number;
    targetCompanyTiers?: string[];
  };
  projectStrategy?: {
    projectTitle: string;
    deployToPublic: boolean;
    weeklyHours: number;
    targetTechStack: string[];
  };
  portfolioStrategy?: {
    documentAllProjects: boolean;
    linkLiveDemos: boolean;
    addCaseStudies: boolean;
  };
  interviewPrep?: {
    focusArea: 'DSA' | 'SYSTEM_DESIGN' | 'BEHAVIORAL' | 'ROLE_SPECIFIC' | 'BALANCED';
    weeklyMockSessions: number;
    weeklyPracticeHours: number;
  };
}

export interface DimensionScore {
  score: number;
  delta: number;
  direction: string;
  summary: string;
}

export interface ScenarioResult {
  id?: string;
  scenarioKey: string;
  title: string;
  scenarioType: string;
  variables: SimulationVariables;
  timeAllocation: TimeAllocation;
  isRealistic: boolean;
  constraintViolations: string[];
  impactAssessment: {
    dimensions: Record<string, DimensionScore>;
    overallImpactScore: number;
    benefits: string[];
    tradeOffs: string[];
    risks: Array<{
      riskType: string;
      severity: string;
      description: string;
      mitigation: string;
    }>;
    sensitivityFactors: Array<{
      variable: string;
      leverage: string;
      impactExplanation: string;
    }>;
  };
  assumptions: string[];
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LIMITED';
  confidenceReason: string;
  isRecommended: boolean;
  aiNarrative?: string | null;
  opportunityForecasts?: Array<{
    companyName: string;
    jobTitle: string;
    currentMatchScore: number;
    forecastedMatchScore: number;
    readinessTrend: 'STRONGER' | 'STABLE' | 'NEEDS_IMPROVEMENT';
    keyPositiveFactors: string[];
    remainingGaps: string[];
  }>;
  careerPathComparisons?: Array<{
    pathTitle: string;
    currentAlignmentScore: number;
    simulatedAlignmentScore: number;
    skillGapsToClose: string[];
    transferableSkills: string[];
    estimatedWeeksToReadiness: number;
    tradeOffs: string[];
  }>;
  proposedPlan?: any;
}

export interface SimulationSessionResponse {
  simulation: {
    id: string;
    title: string;
    description: string;
    timeHorizon: string;
    targetPathTitle: string;
    confidenceLevel: 'HIGH' | 'MEDIUM' | 'LIMITED';
    confidenceReason: string;
    status: string;
    createdAt: string;
  };
  baseline: any;
  scenarios: ScenarioResult[];
  comparison: {
    simulationId: string;
    bestOptionKey: string;
    recommendationReason: string;
    comparisonMatrix: {
      scenarios: Array<{
        key: string;
        title: string;
        isRecommended: boolean;
        confidenceLevel: string;
        overallScore: number;
        utilizationPercentage: number;
        dimensionScores: Record<string, { score: number; direction: string }>;
        topBenefit: string;
        topTradeOff: string;
        topRisk: string;
      }>;
    };
  };
}

class SimulationService {
  async createSimulation(dto?: {
    title?: string;
    timeHorizon?: string;
    targetPathTitle?: string;
    customVariables?: SimulationVariables;
    customTimeAllocation?: Partial<TimeAllocation>;
  }): Promise<SimulationSessionResponse> {
    const response = await apiClient.post('/simulations', dto || {});
    return response.data;
  }

  async getUserSimulations(): Promise<any[]> {
    const response = await apiClient.get('/simulations');
    return response.data;
  }

  async getSimulationById(id: string): Promise<any> {
    const response = await apiClient.get(`/simulations/${id}`);
    return response.data;
  }

  async addScenario(
    simulationId: string,
    dto: {
      title: string;
      scenarioType?: string;
      variables: SimulationVariables;
      timeAllocation?: Partial<TimeAllocation>;
      assumptions?: string[];
    },
  ): Promise<ScenarioResult> {
    const response = await apiClient.post(`/simulations/${simulationId}/scenarios`, dto);
    return response.data;
  }

  async activateScenario(simulationId: string, scenarioId: string): Promise<any> {
    const response = await apiClient.post(`/simulations/${simulationId}/activate/${scenarioId}`);
    return response.data;
  }
}

export const simulationService = new SimulationService();
