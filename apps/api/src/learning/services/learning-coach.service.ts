import { Injectable, Inject, NotFoundException } from '@nestjs/common';

import { AIProvider, AI_PROVIDER_TOKEN } from '../../ai/providers/ai-provider.interface';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LearningCoachService {
  constructor(
    @Inject(AI_PROVIDER_TOKEN) private readonly aiProvider: AIProvider,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Explains a specific skill concept personalized to the user's active goal
   * and current mastery level.
   */
  async explainConcept(userId: string, skillId: string, conceptName: string): Promise<string> {
    const skill = await this.prisma.skill.findUnique({
      where: { id: skillId },
    });
    if (!skill) throw new NotFoundException(`Skill not found`);

    const userSkills = await this.prisma.userSkill.findMany({
      where: { userId },
      select: { skillId: true },
    });
    const userHasSkill = userSkills.some((us) => us.skillId === skillId);

    const prompt = `
      Target Skill: ${skill.name}
      Concept to Explain: ${conceptName}
      User Level: ${userHasSkill ? 'Familiar' : 'Beginner'}

      Explain the concept clearly and concisely.
      Provide a practical backend/frontend example.
      Warning: Do not award, declare, or promise any certifications or professional validation.
    `;

    const result = await this.aiProvider.generateText(
      prompt,
      'You are an adaptive learning assistant coach.',
    );
    return result.text;
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
      Do not invent any course completion certificates.
      Return the output as a JSON string with format: { "tasks": ["Task 1", "Task 2"] }
    `;

    const result = await this.aiProvider.generateText(prompt, 'You are a study scheduler coach.');
    try {
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
