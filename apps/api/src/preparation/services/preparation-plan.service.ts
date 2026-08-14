import { Injectable, Logger } from '@nestjs/common';
import { PreparationTaskStatus } from '@prisma/client';

import { preparationPlanPrompt } from '../../ai/prompts/preparation-template';
import { AiService } from '../../ai/services/ai.service';
import { PrismaService } from '../../prisma/prisma.service';

import { ReadinessScoreService } from './readiness-score.service';
import { SkillGapPrioritizationService } from './skill-gap-prioritization.service';

@Injectable()
export class PreparationPlanService {
  private readonly logger = new Logger(PreparationPlanService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly skillGapService: SkillGapPrioritizationService,
    private readonly readinessService: ReadinessScoreService,
  ) {}

  async generatePreparationPlan(userId: string, jobId: string) {
    // 1. Check if plan already exists
    const existingPlan = await this.prisma.preparationPlan.findUnique({
      where: { userId_jobId: { userId, jobId } },
      include: { tasks: true },
    });

    if (existingPlan) {
      return existingPlan;
    }

    // 2. Fetch context
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userSkills: { include: { skill: true } },
      },
    });

    const job = await this.prisma.jobPosting.findUnique({
      where: { id: jobId },
    });

    const goal = await this.prisma.careerGoal.findFirst({
      where: { userId },
    });

    if (!user || !job) {
      throw new Error('User or Job not found');
    }

    // 3. Get Prioritized Skill Gaps
    const missingSkills = await this.skillGapService.prioritizeMissingSkills(userId, jobId);

    // 4. Generate AI Plan
    // Note: To truly integrate with the PromptManager in AiService, we would register this prompt template.
    // For now, we will call AiService directly or use the underlying AI Provider if AiService is strict.
    // Let's use the underlying generateCompletion logic from AiService.
    const promptInputs = {
      jobRequirements: JSON.stringify(job.requirements),
      userSkills: JSON.stringify(user.userSkills.map((s) => s.skill.name)),
      missingSkills: JSON.stringify(missingSkills),
      careerGoal: JSON.stringify(
        goal ? { hoursPerWeek: goal.hoursPerWeek, targetDate: goal.targetDate } : {},
      ),
    };

    // Replace templates manually if AiService doesn't have a public compile method for one-off prompts.
    const system = preparationPlanPrompt.systemPrompt;
    let userPrompt = preparationPlanPrompt.userPromptTemplate;
    for (const [key, value] of Object.entries(promptInputs)) {
      userPrompt = userPrompt.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }

    // Call AiProvider via AiService
    // We can use aiService['aiProvider'].generateCompletion if private, or expose it.
    // Actually, AiService has `promptManager` and expects registered templates.
    // Let's assume we can call aiService.generateCompletion directly if we bypass AiService cache, or better yet
    // I will just use the AiService if I can.

    // Using a safer approach:
    // Any logic calling the raw AI provider is fine, but I'll add `generateCustomCompletion` to AiService or use standard.
    // Assuming AiService doesn't have it, I'll use the raw provider. But wait, I'm injecting AiService.
    // Let's look at `AiService` in `src/ai/services/ai.service.ts` again.

    // For now, I'll use the existing `analyzeResume` approach or similar.
    let aiResultText = '';
    try {
      // Access private provider for this new feature safely (TypeScript ignores private at runtime)
      const provider = (this.aiService as any).aiProvider;
      aiResultText = await provider.generateCompletion(system, userPrompt, { temperature: 0.7 });
    } catch (e) {
      this.logger.error('AI Plan generation failed', e);
      throw new Error('Failed to generate preparation plan');
    }

    let parsedPlan;
    try {
      parsedPlan = JSON.parse(aiResultText);
    } catch (e) {
      this.logger.error('Failed to parse AI output', aiResultText);
      throw new Error('AI output was not valid JSON');
    }

    // 5. Save to DB
    const plan = await this.prisma.preparationPlan.create({
      data: {
        userId,
        jobId,
        planSummary: parsedPlan.planSummary,
        tasks: {
          create: (parsedPlan.tasks || []).map((t: any) => ({
            title: t.title,
            description: t.description,
            category: t.category || 'TECHNICAL',
            priority: t.priority || 'MEDIUM',
            status: PreparationTaskStatus.TODO,
          })),
        },
      },
      include: { tasks: true },
    });

    // 6. Update Readiness Score
    const readiness = await this.readinessService.calculateReadinessScore(userId, jobId);
    await this.prisma.preparationPlan.update({
      where: { id: plan.id },
      data: {
        overallReadiness: readiness.overallReadiness,
        skillsReadiness: readiness.skillsReadiness,
        resumeReadiness: readiness.resumeReadiness,
        technicalReadiness: readiness.technicalReadiness,
        behavioralReadiness: readiness.behavioralReadiness,
      },
    });

    return plan;
  }

  async getPreparationPlan(planId: string, userId: string) {
    const plan = await this.prisma.preparationPlan.findUnique({
      where: { id: planId },
      include: { tasks: { orderBy: { createdAt: 'asc' } } },
    });

    if (!plan || plan.userId !== userId) {
      throw new Error('Plan not found');
    }

    return plan;
  }
}
