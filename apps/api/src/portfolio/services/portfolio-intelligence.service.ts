import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AiService } from '../../ai/services/ai.service';
import { CareerEventsService } from '../../career-center/services/career-events.service';
import type { AppConfig } from '../../config/configuration';
import { PrismaService } from '../../prisma/prisma.service';

import { EvidenceGraphService } from './evidence-graph.service';

// Standard required skills map for role alignment fallback
const ROLE_SKILLS_FALLBACK: Record<string, string[]> = {
  'software engineer': ['JavaScript', 'TypeScript', 'Node.js', 'PostgreSQL', 'Docker', 'AWS'],
  'backend developer': [
    'JavaScript',
    'TypeScript',
    'Node.js',
    'PostgreSQL',
    'Docker',
    'AWS',
    'Python',
  ],
  'frontend developer': ['React', 'JavaScript', 'TypeScript', 'HTML', 'CSS'],
  'full stack developer': ['React', 'JavaScript', 'TypeScript', 'Node.js', 'PostgreSQL', 'Docker'],
  'data scientist': ['Python', 'SQL', 'Machine Learning', 'Pandas'],
  'ml engineer': ['Python', 'Machine Learning', 'SQL', 'Deep Learning'],
  'devops engineer': ['Docker', 'Kubernetes', 'AWS', 'Bash', 'Terraform'],
};

@Injectable()
export class PortfolioIntelligenceService {
  private readonly logger = new Logger(PortfolioIntelligenceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<AppConfig, true>,
    private readonly evidenceGraph: EvidenceGraphService,
    private readonly aiService: AiService,
    private readonly eventsService: CareerEventsService,
  ) {}

  /**
   * Main orchestrator of portfolio assessment, role alignment, and brand insights.
   */
  async getPortfolioIntelligence(userId: string): Promise<any> {
    this.logger.log(`Evaluating Portfolio Intelligence parameters for user ${userId}`);

    // 1. Fetch dependencies
    const portfolio = await this.prisma.portfolio.findUnique({ where: { userId } });
    const careerPref = await this.prisma.careerPreference.findUnique({ where: { userId } });
    const resume = await this.prisma.resume.findFirst({ where: { userId } });

    // Build evidence graph
    const graph = await this.evidenceGraph.getEvidenceGraph(userId);

    // 2. Compute Target Role Alignment
    const alignment = await this.computeRoleAlignment(careerPref, graph);

    // 3. Compute Portfolio Health
    const health = this.computePortfolioHealth(portfolio, graph, alignment);

    // 4. Compute Personal Brand Insights
    const brand = await this.computeBrandInsights(userId, portfolio, careerPref, resume);

    // 5. Cache assessment results in database
    await this.prisma.portfolioAssessment.upsert({
      where: { userId },
      create: {
        userId,
        healthScore: health.overallScore,
        alignmentScore: alignment.alignmentScore,
        metrics: health,
        alignmentDetails: alignment,
      },
      update: {
        healthScore: health.overallScore,
        alignmentScore: alignment.alignmentScore,
        metrics: health,
        alignmentDetails: alignment,
      },
    });

    // 6. Generate action alerts via Priority Engine Sync
    await this.syncGapsToActions(userId, alignment);

    return {
      health,
      alignment,
      brand,
    };
  }

  // ── Helper Assessment Logic ──────────────────────────────────────────────

  private async computeRoleAlignment(careerPref: any, graph: any[]): Promise<any> {
    const roles = careerPref?.preferredRoles || ['Software Engineer'];
    const primaryRole = roles[0] || 'Software Engineer';

    // Retrieve required skills
    const requiredSkillNames = (ROLE_SKILLS_FALLBACK[primaryRole.toLowerCase()] ||
      ROLE_SKILLS_FALLBACK['software engineer']) as string[];

    const strong: string[] = [];
    const growing: string[] = [];
    const missing: string[] = [];

    for (const reqSkill of requiredSkillNames) {
      const match = graph.find((g) => g.skillName.toLowerCase() === reqSkill.toLowerCase());

      if (!match) {
        missing.push(reqSkill);
      } else {
        const type = match.strengthLevel;
        if (
          type === 'PROJECT' ||
          type === 'EXPERIENCE' ||
          type === 'ASSESSED' ||
          type === 'VALIDATED'
        ) {
          strong.push(reqSkill);
        } else {
          growing.push(reqSkill);
        }
      }
    }

    const total = requiredSkillNames.length;
    const score =
      total > 0 ? Math.round(((strong.length * 1.0 + growing.length * 0.5) / total) * 100) : 100;

    return {
      targetRole: primaryRole,
      alignmentScore: score,
      requiredSkills: requiredSkillNames,
      strong,
      growing,
      missing,
    };
  }

  private computePortfolioHealth(portfolio: any, graph: any[], alignment: any): any {
    const content = portfolio?.contentJson;
    const projects = content?.projects || [];

    // Calculate dimensions
    // 1. Skill Coverage: user has evidence for required skills
    const coverageScore = alignment.alignmentScore;

    // 2. Technical Depth: based on project complexities
    let depthScore = 40;
    const projectCount = projects.length;
    if (projectCount > 0) {
      const advancedCount = projects.filter(
        (p: any) =>
          (p.description + p.title).toLowerCase().includes('architecture') ||
          (p.description + p.title).toLowerCase().includes('scale') ||
          p.technologies?.length > 6,
      ).length;
      depthScore = Math.min(100, 50 + projectCount * 10 + advancedCount * 20);
    }

    // 3. Documentation/Readme score
    let docScore = 30;
    if (projectCount > 0) {
      const docsCount = projects.filter((p: any) => p.description?.length > 150).length;
      docScore = Math.round((docsCount / projectCount) * 100);
    }

    // 4. Evidence Recency (active practice or project additions within 90 days)
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const hasRecent = graph.some((g) =>
      g.nodes.some((n: any) => new Date(n.date) >= ninetyDaysAgo && n.evidenceType !== 'DECLARED'),
    );
    const recencyScore = hasRecent ? 100 : 50;

    // Average health dimensions
    const overallScore = Math.round((coverageScore + depthScore + docScore + recencyScore) / 4);

    return {
      overallScore,
      coverageScore,
      depthScore,
      docScore,
      recencyScore,
    };
  }

  private async computeBrandInsights(
    userId: string,
    portfolio: any,
    careerPref: any,
    resume: any,
  ): Promise<any> {
    const aiConfig = this.configService.get<any>('ai');
    const isAiEnabled = aiConfig?.enabled ?? true;

    const role = careerPref?.preferredRoles?.[0] || 'Software Engineer';
    const content = portfolio?.contentJson;
    const projects = content?.projects || [];
    const techStack = projects.flatMap((p: any) => p.technologies || []);

    if (isAiEnabled) {
      try {
        const provider = (this.aiService as any).aiProvider;
        const systemPrompt =
          'You are a Personal Branding AI Expert. Review user projects, target role, and resume alignment to output a structured branding identity and consistency suggestions.';
        const prompt = `Target Role: ${role}. Portfolio Stack: ${techStack.join(', ')}. Resume Summary: ${resume?.summary || 'None'}`;

        const brandData = await provider.generateStructuredOutput(
          prompt,
          {
            type: 'object',
            properties: {
              brandIdentity: { type: 'string' },
              brandConsistency: {
                type: 'object',
                properties: {
                  isConsistent: { type: 'boolean' },
                  gaps: { type: 'array', items: { type: 'string' } },
                  suggestions: { type: 'array', items: { type: 'string' } },
                },
                required: ['isConsistent', 'gaps', 'suggestions'],
              },
            },
            required: ['brandIdentity', 'brandConsistency'],
          },
          systemPrompt,
        );

        await this.prisma.brandInsight.upsert({
          where: { userId },
          create: {
            userId,
            brandIdentity: brandData.brandIdentity,
            brandConsistency: brandData.brandConsistency,
          },
          update: {
            brandIdentity: brandData.brandIdentity,
            brandConsistency: brandData.brandConsistency,
          },
        });

        return brandData;
      } catch (err) {
        return this.getDeterministicBrandInsights(role, techStack);
      }
    }

    return this.getDeterministicBrandInsights(role, techStack);
  }

  private getDeterministicBrandInsights(role: string, techStack: string[]): any {
    const isConsistent = techStack.length > 0;
    const suggestions: string[] = [];
    const gaps: string[] = [];

    if (techStack.length === 0) {
      gaps.push('No project implementations declared.');
      suggestions.push('Add projects highlighting key backend or frontend technologies.');
    } else {
      suggestions.push(
        'Diversify your project architecture to include containerization configurations.',
      );
    }

    const brandIdentity = `Your professional brand is positioned toward ${role} utilizing core technologies including ${techStack.slice(0, 3).join(', ') || 'modern libraries'}.`;

    return {
      brandIdentity,
      brandConsistency: {
        isConsistent,
        gaps,
        suggestions,
      },
    };
  }

  private async syncGapsToActions(userId: string, alignment: any): Promise<void> {
    // If there are missing target role skills, publish a PORTFOLIO_GAP career event
    for (const missingSkill of alignment.missing) {
      await this.eventsService
        .publish({
          userId,
          eventType: 'PORTFOLIO_GAP',
          source: 'Portfolio Intelligence',
          entityType: 'UserSkill',
          entityId: missingSkill,
          importance: 'HIGH',
          metadata: {
            skillName: missingSkill,
            roleName: alignment.targetRole,
          },
        })
        .catch((e) => this.logger.warn(`Could not publish portfolio gap event: ${e.message}`));
    }
  }
}
