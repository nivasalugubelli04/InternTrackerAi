import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';

import { projectRecommendationPrompt } from '../../ai/prompts/roadmap-template';
import { AIProvider, AI_PROVIDER_TOKEN } from '../../ai/providers/ai-provider.interface';
import { PrismaService } from '../../prisma/prisma.service';

import { SkillGapEngineService } from './skill-gap-engine.service';

@Injectable()
export class ProjectRecommendationService {
  private readonly logger = new Logger(ProjectRecommendationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly skillGapEngine: SkillGapEngineService,
    @Inject(AI_PROVIDER_TOKEN) private readonly aiProvider: AIProvider,
  ) {}

  /**
   * Recommends portfolio projects targeting missing high-impact skills.
   */
  async getRecommendedProjects(userId: string): Promise<any[]> {
    // 1. Fetch existing recommendations from DB
    const existing = await this.prisma.projectRecommendation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (existing.length >= 2) {
      return existing;
    }

    // 2. Otherwise generate new project recommendations using SkillGapEngine
    const gapAnalysis = await this.skillGapEngine.analyzeSkillGap(userId);
    const missingSkills = gapAnalysis.missingSkills.map((s) => s.name);
    const roleName = gapAnalysis.targetRole;

    let projectDefs: Array<{
      title: string;
      description: string;
      difficulty: string;
      estimatedHours: number;
      targetSkillNames: string[];
    }> = [];

    try {
      let prompt = projectRecommendationPrompt.userPromptTemplate;
      prompt = prompt
        .replace('{{targetRole}}', roleName)
        .replace('{{missingSkills}}', missingSkills.join(', ') || 'REST APIs, Database Design')
        .replace('{{currentSkillLevel}}', 'Developing');

      const res = await this.aiProvider.generateText(
        prompt,
        projectRecommendationPrompt.systemPrompt,
      );
      const parsed = JSON.parse(res.text);

      if (parsed.projects && Array.isArray(parsed.projects)) {
        projectDefs = parsed.projects;
      }
    } catch (e) {
      this.logger.warn(`AI Project recommendation offline, using fallback: ${e}`);
    }

    if (projectDefs.length === 0) {
      projectDefs = [
        {
          title: `${roleName} Portfolio Platform API`,
          description: `Build an end-to-end REST API with authentication, database indexing, and automated CI/CD deployment demonstrating ${missingSkills.slice(0, 2).join(' & ') || 'Core Microservices'}.`,
          difficulty: 'INTERMEDIATE',
          estimatedHours: 12,
          targetSkillNames:
            missingSkills.slice(0, 3).length > 0
              ? missingSkills.slice(0, 3)
              : ['Node.js', 'PostgreSQL', 'Docker'],
        },
        {
          title: `Real-time Analytics Dashboard`,
          description: `Construct a responsive analytics dashboard with state synchronization and data visualization demonstrating production-ready architecture.`,
          difficulty: 'INTERMEDIATE',
          estimatedHours: 15,
          targetSkillNames: ['React', 'TypeScript', 'WebSockets'],
        },
      ];
    }

    // Save to database
    const createdList = [];
    for (const p of projectDefs) {
      const created = await this.prisma.projectRecommendation.create({
        data: {
          userId,
          title: p.title,
          description: p.description,
          targetRole: roleName,
          difficulty: p.difficulty || 'INTERMEDIATE',
          estimatedHours: p.estimatedHours || 10,
          targetSkillNames: p.targetSkillNames || [],
          targetSkillIds: [],
          status: 'RECOMMENDED',
        },
      });
      createdList.push(created);
    }

    return createdList;
  }

  /**
   * Marks a project completed and creates skill evidence points for associated skills.
   */
  async completeProject(userId: string, projectId: string, repoUrl?: string): Promise<any> {
    const project = await this.prisma.projectRecommendation.findUnique({
      where: { id: projectId },
    });
    if (!project || project.userId !== userId) {
      throw new NotFoundException('Project recommendation not found');
    }

    const updated = await this.prisma.projectRecommendation.update({
      where: { id: projectId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        repoTemplateUrl: repoUrl || project.repoTemplateUrl,
      },
    });

    // Create skill evidence points for all target skills
    for (const skillName of project.targetSkillNames) {
      const skillRecord = await this.prisma.skill.findFirst({
        where: { name: { equals: skillName, mode: 'insensitive' } },
      });

      if (skillRecord) {
        await this.prisma.skillEvidence.create({
          data: {
            userId,
            skillId: skillRecord.id,
            evidenceType: 'PROJECT',
            referenceId: updated.id,
            score: 100.0,
            description: `Successfully completed project "${project.title}" demonstrating ${skillName}.`,
          },
        });

        // Increment user skill confidence
        const userSkill = await this.prisma.userSkill.findUnique({
          where: { userId_skillId: { userId, skillId: skillRecord.id } },
        });

        if (userSkill) {
          await this.prisma.userSkill.update({
            where: { userId_skillId: { userId, skillId: skillRecord.id } },
            data: {
              confidenceScore: Math.min((userSkill.confidenceScore || 0.5) + 0.2, 1.0),
              evidenceCount: (userSkill.evidenceCount || 0) + 1,
              lastEvaluatedAt: new Date(),
            },
          });
        }
      }
    }

    return updated;
  }
}
