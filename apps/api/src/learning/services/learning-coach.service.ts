import { Injectable, Inject, NotFoundException } from '@nestjs/common';

import { learningCoachExplainPrompt } from '../../ai/prompts/roadmap-template';
import { AIProvider, AI_PROVIDER_TOKEN } from '../../ai/providers/ai-provider.interface';
import { PrismaService } from '../../prisma/prisma.service';

export type CoachIntent = 'EXPLAIN' | 'EXAMPLE' | 'QUESTION' | 'HINT' | 'TEST_ME' | 'NEXT_STEP';

@Injectable()
export class LearningCoachService {
  constructor(
    @Inject(AI_PROVIDER_TOKEN) private readonly aiProvider: AIProvider,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Universal AI Coach query handler supporting quick action intents.
   */
  async queryCoach(
    userId: string,
    query: string,
    intent: CoachIntent = 'EXPLAIN',
    skillId?: string,
  ): Promise<{ response: string; intent: CoachIntent; suggestedAction?: string }> {
    let skillName = 'Core Engineering';
    let userProficiency = 'Developing';

    if (skillId) {
      const skill = await this.prisma.skill.findUnique({ where: { id: skillId } });
      if (skill) skillName = skill.name;

      const userSkill = await this.prisma.userSkill.findUnique({
        where: { userId_skillId: { userId, skillId } },
      });
      if (userSkill) userProficiency = userSkill.proficiency;
    }

    const activeGoal = await this.prisma.learningGoal.findFirst({
      where: { userId, status: 'ACTIVE' },
    });
    const targetRole = activeGoal?.targetRole || 'Software Engineer';

    let prompt = '';
    let systemInstruction =
      'You are an adaptive AI Learning Coach for internship candidates. Be encouraging, precise, and practical. DO NOT award or invent degrees or certificates.';

    switch (intent) {
      case 'EXAMPLE':
        prompt = `Target Role: ${targetRole}\nSkill: ${skillName}\nConcept/Query: ${query}\nProvide a practical industry code or architectural example demonstrating this concept cleanly.`;
        break;
      case 'QUESTION':
      case 'TEST_ME':
        prompt = `Target Role: ${targetRole}\nSkill: ${skillName}\nGenerate 1 diagnostic multiple choice question with 4 options and the correct answer explained.`;
        break;
      case 'HINT':
        prompt = `Skill: ${skillName}\nCandidate Problem: ${query}\nProvide a progressive 2-bullet hint without revealing the exact solution directly.`;
        break;
      case 'NEXT_STEP':
        prompt = `Target Role: ${targetRole}\nCurrent Mastery: ${skillName} (${userProficiency})\nRecommend the next 2 logical learning topics or project milestones to build next.`;
        break;
      case 'EXPLAIN':
      default:
        prompt = learningCoachExplainPrompt.userPromptTemplate
          .replace('{{skillName}}', skillName)
          .replace('{{conceptName}}', query)
          .replace('{{userProficiency}}', userProficiency)
          .replace('{{targetRole}}', targetRole);
        systemInstruction = learningCoachExplainPrompt.systemPrompt;
        break;
    }

    try {
      const result = await this.aiProvider.generateText(prompt, systemInstruction);
      return {
        response: result.text,
        intent,
        suggestedAction:
          intent === 'EXPLAIN' ? 'Try a practice question' : 'Continue learning roadmap',
      };
    } catch {
      return {
        response: `Here is a core overview for ${query || skillName}: Focus on understanding data structures, clean API interfaces, and system edge cases.`,
        intent,
        suggestedAction: 'Review daily study plan',
      };
    }
  }

  /**
   * Explains a specific skill concept personalized to user's active goal.
   */
  async explainConcept(userId: string, skillId: string, conceptName: string): Promise<string> {
    const res = await this.queryCoach(userId, conceptName, 'EXPLAIN', skillId);
    return res.response;
  }

  /**
   * Generates a study revision plan for weak skill areas.
   */
  async generateRevisionPlan(_userId: string, targetRoleId: string): Promise<string[]> {
    const role = await this.prisma.role.findUnique({
      where: { id: targetRoleId },
    });
    if (!role) throw new NotFoundException(`Role not found`);

    const prompt = `
      User Target Role: ${role.name}
      Please generate a list of 3 study plan milestones in JSON format.
      Return output as JSON: { "tasks": ["Task 1", "Task 2"] }
    `;

    try {
      const result = await this.aiProvider.generateText(prompt, 'You are a study scheduler coach.');
      const parsed = JSON.parse(result.text);
      return parsed.tasks || [];
    } catch {
      return [
        'Review database indexes and query optimization.',
        'Implement clean architecture in your next coding practice.',
        'Review core design pattern paradigms.',
      ];
    }
  }
}
