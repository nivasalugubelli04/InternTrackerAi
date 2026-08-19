import { Injectable, Inject, Logger } from '@nestjs/common';

import { dailyLearningPlanPrompt } from '../../ai/prompts/roadmap-template';
import { AIProvider, AI_PROVIDER_TOKEN } from '../../ai/providers/ai-provider.interface';
import { PrismaService } from '../../prisma/prisma.service';

import { SkillGapEngineService } from './skill-gap-engine.service';

export interface DailyLearningBlock {
  category: 'CONCEPT' | 'PRACTICE' | 'PROJECT' | 'INTERVIEW';
  title: string;
  durationMinutes: number;
  action: string;
  skillName?: string;
  isCompleted?: boolean;
}

export interface DailyPlanResult {
  date: string;
  dailyGoalTitle: string;
  totalMinutes: number;
  completedMinutes: number;
  streakDays: number;
  blocks: DailyLearningBlock[];
}

@Injectable()
export class DailyPlanService {
  private readonly logger = new Logger(DailyPlanService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly skillGapEngine: SkillGapEngineService,
    @Inject(AI_PROVIDER_TOKEN) private readonly aiProvider: AIProvider,
  ) {}

  /**
   * Generates today's budgeted learning plan.
   */
  async getDailyPlan(userId: string, customMinutes?: number): Promise<DailyPlanResult> {
    // 1. Determine daily time budget
    let budgetMinutes = customMinutes;
    if (!budgetMinutes) {
      const pref = await this.prisma.careerCenterPreference.findUnique({
        where: { userId },
      });
      budgetMinutes = pref?.dailyTimeBudget || 30;
    }

    // 2. Fetch skill gap signals
    const gapAnalysis = await this.skillGapEngine.analyzeSkillGap(userId);
    const prioritySkill = gapAnalysis.missingSkills[0]?.name || 'Data Structures';
    const recentWeakness = gapAnalysis.highImpactSkills[0]?.name || 'SQL Joins';

    let dailyGoalTitle = `Targeted ${budgetMinutes}-minute skill building session`;
    let blocks: DailyLearningBlock[] = [];

    // 3. Try AI Plan Generation
    try {
      let prompt = dailyLearningPlanPrompt.userPromptTemplate;
      prompt = prompt
        .replace('{{targetRole}}', gapAnalysis.targetRole)
        .replace(/\{\{dailyTimeBudgetMinutes\}\}/g, String(budgetMinutes))
        .replace('{{currentMilestone}}', `Mastering ${prioritySkill}`)
        .replace('{{prioritySkills}}', prioritySkill)
        .replace('{{recentWeakness}}', recentWeakness);

      const res = await this.aiProvider.generateText(prompt, dailyLearningPlanPrompt.systemPrompt);
      const parsed = JSON.parse(res.text);

      if (parsed.blocks && Array.isArray(parsed.blocks)) {
        dailyGoalTitle = parsed.dailyGoalTitle || dailyGoalTitle;
        blocks = parsed.blocks;
      }
    } catch (e) {
      this.logger.warn(`AI Daily Plan generation offline, using fallback: ${e}`);
    }

    // Fallback block construction if LLM returned empty/failed
    if (blocks.length === 0) {
      const conceptTime = Math.round(budgetMinutes * 0.4);
      const practiceTime = Math.round(budgetMinutes * 0.4);
      const interviewTime = budgetMinutes - conceptTime - practiceTime;

      blocks = [
        {
          category: 'CONCEPT',
          title: `Study Concept: ${prioritySkill}`,
          durationMinutes: conceptTime,
          action: `Review key syntax and design patterns for ${prioritySkill}.`,
          skillName: prioritySkill,
        },
        {
          category: 'PRACTICE',
          title: `Interactive Practice: ${prioritySkill}`,
          durationMinutes: practiceTime,
          action: `Solve 2 adaptive practice exercises.`,
          skillName: prioritySkill,
        },
      ];

      if (interviewTime > 0) {
        blocks.push({
          category: 'INTERVIEW',
          title: `Mock Interview Check`,
          durationMinutes: interviewTime,
          action: `Review 1 STAR behavioral answer or system design topic.`,
          skillName: recentWeakness,
        });
      }
    }

    const todayStr = new Date().toISOString().split('T')[0] || '';

    return {
      date: todayStr,
      dailyGoalTitle,
      totalMinutes: budgetMinutes,
      completedMinutes: 0,
      streakDays: 3, // Mock streak indicator for career command center
      blocks,
    };
  }
}
