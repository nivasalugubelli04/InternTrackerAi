import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AiService } from '../../ai/services/ai.service';
import type { AppConfig } from '../../config/configuration';
import { PrismaService } from '../../prisma/prisma.service';

export interface ProjectData {
  id: string;
  title: string;
  description: string;
  technologies: string[];
  githubUrl?: string;
  demoUrl?: string;
  impact?: string;
}

@Injectable()
export class ProjectAnalysisService {
  private readonly logger = new Logger(ProjectAnalysisService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<AppConfig, true>,
    private readonly aiService: AiService,
  ) {}

  /**
   * Evaluates a specific project, extracts demonstrated skills/tech, flags gaps, and saves analysis.
   */
  async analyzeProject(userId: string, projectId: string): Promise<any> {
    this.logger.log(`Analyzing project ${projectId} for user ${userId}`);

    // 1. Fetch user portfolio
    const portfolio = await this.prisma.portfolio.findUnique({
      where: { userId },
    });
    if (!portfolio) throw new NotFoundException('Portfolio not found');

    const content = portfolio.contentJson as any;
    const projects: ProjectData[] = content?.projects || [];
    const project = projects.find((p) => p.id === projectId);
    if (!project) throw new NotFoundException('Project not found inside portfolio');

    // 2. AI or Fallback analysis
    let analysisResult: any;
    const aiConfig = this.configService.get<any>('ai');
    const isAiEnabled = aiConfig?.enabled ?? true;

    if (isAiEnabled) {
      analysisResult = await this.runAiProjectAnalysis(project);
    } else {
      analysisResult = this.runDeterministicProjectAnalysis(project);
    }

    // 3. Save or update analysis in DB
    const analysis = await this.prisma.projectAnalysis.upsert({
      where: { userId_projectId: { userId, projectId } },
      create: {
        userId,
        projectId,
        skills: analysisResult.skills,
        complexity: analysisResult.complexity,
        gaps: analysisResult.gaps,
        recommendations: analysisResult.recommendations,
        explanation: analysisResult.explanation,
      },
      update: {
        skills: analysisResult.skills,
        complexity: analysisResult.complexity,
        gaps: analysisResult.gaps,
        recommendations: analysisResult.recommendations,
        explanation: analysisResult.explanation,
      },
    });

    // 4. Map extracted skills to SkillEvidence in DB
    await this.syncProjectSkillsToEvidence(userId, projectId, project, analysisResult.skills);

    return analysis;
  }

  /**
   * Identifies overly similar or duplicate projects (e.g. multiple simple list/todo apps).
   */
  async checkSimilarityAndDuplication(userId: string): Promise<any[]> {
    const portfolio = await this.prisma.portfolio.findUnique({ where: { userId } });
    if (!portfolio) return [];

    const content = portfolio.contentJson as any;
    const projects: ProjectData[] = content?.projects || [];
    if (projects.length <= 1) return [];

    const issues: any[] = [];

    // Simple deterministic similarity heuristic checking description / stack overlap
    for (let i = 0; i < projects.length; i++) {
      for (let j = i + 1; j < projects.length; j++) {
        const p1 = projects[i];
        const p2 = projects[j];
        if (!p1 || !p2) continue;

        const textOverlap = this.calculateTextOverlap(p1.description, p2.description);
        const techOverlap = this.calculateSetOverlap(p1.technologies, p2.technologies);

        if (textOverlap > 0.7 || (techOverlap > 0.8 && textOverlap > 0.5)) {
          issues.push({
            projectIds: [p1.id, p2.id],
            projectTitles: [p1.title, p2.title],
            severity: textOverlap > 0.85 ? 'HIGH' : 'MEDIUM',
            warning: `High duplication risk between "${p1.title}" and "${p2.title}". Consider combining or diversifying.`,
          });
        }
      }
    }

    return issues;
  }

  /**
   * Generates a structural case study draft based on project details.
   */
  async generateProjectCaseStudy(userId: string, projectId: string): Promise<any> {
    const portfolio = await this.prisma.portfolio.findUnique({ where: { userId } });
    if (!portfolio) throw new NotFoundException('Portfolio not found');

    const content = portfolio.contentJson as any;
    const projects: ProjectData[] = content?.projects || [];
    const project = projects.find((p) => p.id === projectId);
    if (!project) throw new NotFoundException('Project not found');

    const aiConfig = this.configService.get<any>('ai');
    const isAiEnabled = aiConfig?.enabled ?? true;

    if (isAiEnabled) {
      try {
        const provider = (this.aiService as any).aiProvider;
        const systemPrompt =
          'You are a career portfolio expert. Draft a detailed case study based on the project information provided. Ground it in the project facts.';
        const prompt = `Draft a project case study for "${project.title}". Stack: ${project.technologies.join(', ')}. Description: ${project.description}. Impact: ${project.impact || 'None declared'}.`;

        const study = await provider.generateStructuredOutput(
          prompt,
          {
            type: 'object',
            properties: {
              problem: { type: 'string' },
              approach: { type: 'string' },
              architecture: { type: 'string' },
              implementation: { type: 'string' },
              results: { type: 'string' },
              learnings: { type: 'string' },
            },
            required: ['problem', 'approach', 'results'],
          },
          systemPrompt,
        );
        return study;
      } catch (err) {
        return this.getDeterministicCaseStudy(project);
      }
    }

    return this.getDeterministicCaseStudy(project);
  }

  // ── Private Helper Pipeline Methods ──────────────────────────────────────

  private async runAiProjectAnalysis(project: ProjectData): Promise<any> {
    try {
      const provider = (this.aiService as any).aiProvider;
      const systemPrompt =
        'You are a Career Portfolio AI Agent. Analyze the project description and extract technologies/skills, complexity level, gaps (e.g. deployment, testing, security), and recommendations. Do not hallucinate.';
      const prompt = `Project Title: ${project.title}\nDescription: ${project.description}\nDeclared Stack: ${project.technologies.join(', ')}\nImpact: ${project.impact || 'None'}`;

      const res = await provider.generateStructuredOutput(
        prompt,
        {
          type: 'object',
          properties: {
            skills: { type: 'array', items: { type: 'string' } },
            complexity: { type: 'string', enum: ['BASIC', 'MEDIUM', 'ADVANCED'] },
            gaps: { type: 'array', items: { type: 'string' } },
            recommendations: { type: 'array', items: { type: 'string' } },
            explanation: { type: 'string' },
          },
          required: ['skills', 'complexity', 'gaps', 'recommendations', 'explanation'],
        },
        systemPrompt,
      );
      return res;
    } catch (e) {
      return this.runDeterministicProjectAnalysis(project);
    }
  }

  private runDeterministicProjectAnalysis(project: ProjectData): any {
    const text = (project.title + ' ' + project.description).toLowerCase();
    const skills: string[] = [...project.technologies];

    // Simple regex matching for common technologies
    const keywordMap: Record<string, string> = {
      python: 'Python',
      react: 'React',
      node: 'Node.js',
      typescript: 'TypeScript',
      javascript: 'JavaScript',
      docker: 'Docker',
      kubernetes: 'Kubernetes',
      postgres: 'PostgreSQL',
      prisma: 'Prisma',
      aws: 'AWS',
      graphql: 'GraphQL',
      jest: 'Jest',
    };

    for (const [key, value] of Object.entries(keywordMap)) {
      if (text.includes(key) && !skills.includes(value)) {
        skills.push(value);
      }
    }

    const gaps: string[] = [];
    const recommendations: string[] = [];

    if (!text.includes('test') && !text.includes('jest') && !text.includes('mocha')) {
      gaps.push('No automated testing suite or assertions declared.');
      recommendations.push('Consider writing unit tests using Jest/PyTest to prove code quality.');
    }

    if (
      !text.includes('docker') &&
      !text.includes('deploy') &&
      !text.includes('cloud') &&
      !text.includes('ci/cd')
    ) {
      gaps.push('Lacks production deployment configuration or containerized evidence.');
      recommendations.push(
        'Add a Dockerfile or deployment action script to prove cloud readiness.',
      );
    }

    if (!project.impact || project.impact.trim().length === 0) {
      gaps.push('Lacks measurable user impact or performance metrics.');
      recommendations.push('Incorporate measurable metrics (e.g. "reduced latency by 20%").');
    }

    let complexity = 'BASIC';
    if (skills.length > 5 || text.length > 300) complexity = 'MEDIUM';
    if (
      skills.length > 8 &&
      (text.includes('architecture') || text.includes('performance') || text.includes('scaling'))
    ) {
      complexity = 'ADVANCED';
    }

    const explanation = `This project demonstrates initial capabilities in ${skills.join(', ')}. Gaps identified include deployment and automated validation coverage.`;

    return {
      skills,
      complexity,
      gaps,
      recommendations,
      explanation,
    };
  }

  private async syncProjectSkillsToEvidence(
    userId: string,
    projectId: string,
    project: ProjectData,
    skills: string[],
  ) {
    // 1. Fetch available skills from DB to avoid inventing fake ones
    const dbSkills = await this.prisma.skill.findMany({
      where: { name: { in: skills, mode: 'insensitive' } },
    });

    for (const s of dbSkills) {
      // Connect to UserSkill if not already associated
      const hasSkill = await this.prisma.userSkill.findUnique({
        where: { userId_skillId: { userId, skillId: s.id } },
      });

      if (!hasSkill) {
        await this.prisma.userSkill
          .create({
            data: {
              userId,
              skillId: s.id,
              proficiency: 'BEGINNER',
              confidenceScore: 0.5,
            },
          })
          .catch(() => {});
      }

      // Upsert SkillEvidence entry mapping this project to this skill
      await this.prisma.skillEvidence
        .upsert({
          where: { id: `proj-ev-${projectId}-${s.id}` }, // Generate deterministic Uuid mapping to prevent duplicate evidences
          create: {
            id: `proj-ev-${projectId}-${s.id}`,
            userId,
            skillId: s.id,
            evidenceType: 'PROJECT',
            referenceId: projectId,
            score: 100.0,
            description: `Demonstrated in project "${project.title}": ${project.description.substring(0, 100)}...`,
          },
          update: {
            description: `Demonstrated in project "${project.title}": ${project.description.substring(0, 100)}...`,
          },
        })
        .catch(() => {});
    }
  }

  private calculateTextOverlap(desc1: string, desc2: string): number {
    const w1 = new Set(desc1.toLowerCase().split(/\s+/));
    const w2 = new Set(desc2.toLowerCase().split(/\s+/));
    return this.calculateSetOverlap(Array.from(w1), Array.from(w2));
  }

  private calculateSetOverlap(arr1: string[], arr2: string[]): number {
    if (arr1.length === 0 || arr2.length === 0) return 0;
    const s1 = new Set(arr1.map((x) => x.toLowerCase()));
    const s2 = new Set(arr2.map((x) => x.toLowerCase()));
    const intersection = new Set([...s1].filter((x) => s2.has(x)));
    return intersection.size / Math.min(s1.size, s2.size);
  }

  private getDeterministicCaseStudy(project: ProjectData): any {
    return {
      problem: `The user identified a gap in existing solutions related to the domain of "${project.title}".`,
      approach: `A system was designed using ${project.technologies.join(', ')} to build an implementation capable of addressing key features.`,
      architecture:
        'The architecture utilized model configurations linking decoupled client/server components.',
      implementation:
        'Code structures were configured following modular layout guidelines and verified accordingly.',
      results:
        project.impact ||
        'The project deployed successfully, proving core technological concept functions.',
      learnings: `Refining architectural workflows using ${project.technologies[0] || 'modern tech stacks'} provided key insights.`,
    };
  }
}
