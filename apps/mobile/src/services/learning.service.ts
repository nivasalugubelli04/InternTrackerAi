import api from './api';

export interface AdaptiveRoadmapPhase {
  phase: number;
  title: string;
  estimatedHours: number;
  skillsCovered: string[];
  milestones: Array<{
    title: string;
    description: string;
    estimatedMinutes: number;
    tasks: string[];
    isCompleted?: boolean;
  }>;
}

export interface AdaptiveRoadmapData {
  id: string;
  targetRole: string;
  timelineDays: number;
  currentPhase: number;
  overallProgress: number;
  version: number;
  summary: string;
  phases: AdaptiveRoadmapPhase[];
}

export interface CareerReadinessData {
  overallReadiness: number;
  skillReadiness: number;
  portfolioReadiness: number;
  resumeReadiness: number;
  interviewReadiness: number;
  applicationReadiness: number;
  goalAlignment: number;
  narrativeSummary: string;
  keyStrengths: string[];
  topImprovementActions: string[];
}

export interface SkillGapData {
  targetRole: string;
  totalRequiredSkills: number;
  overallCoveragePercentage: number;
  strongSkills: Array<{ id: string; name: string; proficiency: string; confidence: number }>;
  moderateSkills: Array<{ id: string; name: string; proficiency: string; confidence: number }>;
  missingSkills: Array<{
    id: string;
    name: string;
    importance: string;
    impactScore: number;
    reason: string;
  }>;
  highImpactSkills: Array<{
    id: string;
    name: string;
    opportunitiesUnlockedCount: number;
    reason: string;
  }>;
}

export interface DailyLearningBlock {
  category: 'CONCEPT' | 'PRACTICE' | 'PROJECT' | 'INTERVIEW';
  title: string;
  durationMinutes: number;
  action: string;
  skillName?: string;
  isCompleted?: boolean;
}

export interface DailyPlanData {
  date: string;
  dailyGoalTitle: string;
  totalMinutes: number;
  completedMinutes: number;
  streakDays: number;
  blocks: DailyLearningBlock[];
}

export interface ProjectRecommendationData {
  id: string;
  title: string;
  description: string;
  targetRole: string;
  difficulty: string;
  estimatedHours: number;
  targetSkillNames: string[];
  repoTemplateUrl?: string;
  status: string;
}

export class LearningService {
  static async getAdaptiveRoadmap(): Promise<AdaptiveRoadmapData> {
    const res = await api.get<AdaptiveRoadmapData>('/api/v1/learning/adaptive-roadmap');
    return res.data;
  }

  static async generateAdaptiveRoadmap(
    targetRole?: string,
    timelineDays?: number,
    reason?: string,
  ): Promise<AdaptiveRoadmapData> {
    const res = await api.post<AdaptiveRoadmapData>('/api/v1/learning/adaptive-roadmap/generate', {
      targetRole,
      timelineDays,
      reason,
    });
    return res.data;
  }

  static async getCareerReadiness(): Promise<CareerReadinessData> {
    const res = await api.get<CareerReadinessData>('/api/v1/learning/readiness');
    return res.data;
  }

  static async getSkillGaps(targetRole?: string): Promise<SkillGapData> {
    const res = await api.get<SkillGapData>('/api/v1/learning/skill-gaps', {
      params: { targetRole },
    });
    return res.data;
  }

  static async getDailyPlan(minutes?: number): Promise<DailyPlanData> {
    const res = await api.get<DailyPlanData>('/api/v1/learning/daily-plan', {
      params: { minutes },
    });
    return res.data;
  }

  static async getRecommendedProjects(): Promise<ProjectRecommendationData[]> {
    const res = await api.get<ProjectRecommendationData[]>('/api/v1/learning/projects/recommended');
    return res.data;
  }

  static async completeProject(
    projectId: string,
    repoUrl?: string,
  ): Promise<ProjectRecommendationData> {
    const res = await api.post<ProjectRecommendationData>(
      `/api/v1/learning/projects/${projectId}/complete`,
      { repoUrl },
    );
    return res.data;
  }

  static async queryAiCoach(
    query: string,
    intent: 'EXPLAIN' | 'EXAMPLE' | 'QUESTION' | 'HINT' | 'TEST_ME' | 'NEXT_STEP' = 'EXPLAIN',
    skillId?: string,
  ) {
    const res = await api.post('/api/v1/learning/ai/coach', { query, intent, skillId });
    return res.data;
  }
}

export default LearningService;
