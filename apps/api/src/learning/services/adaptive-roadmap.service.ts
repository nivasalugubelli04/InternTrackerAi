import { Injectable, Inject, Logger } from '@nestjs/common';

import { personalizedRoadmapPrompt } from '../../ai/prompts/roadmap-template';
import { AIProvider, AI_PROVIDER_TOKEN } from '../../ai/providers/ai-provider.interface';
import { PrismaService } from '../../prisma/prisma.service';

import { SkillGapEngineService } from './skill-gap-engine.service';

export interface RoadmapPhase {
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

export interface AdaptiveRoadmapResult {
  id: string;
  targetRole: string;
  timelineDays: number;
  currentPhase: number;
  overallProgress: number;
  version: number;
  summary: string;
  phases: RoadmapPhase[];
}

@Injectable()
export class AdaptiveRoadmapService {
  private readonly logger = new Logger(AdaptiveRoadmapService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly skillGapEngine: SkillGapEngineService,
    @Inject(AI_PROVIDER_TOKEN) private readonly aiProvider: AIProvider,
  ) {}

  /**
   * Generates or adapts a 7-phase Career Roadmap based on user profile, skill gaps,
   * timeline, and opportunity/interview data.
   */
  async generateOrAdaptRoadmap(
    userId: string,
    targetRole?: string,
    timelineDays: number = 60,
    reason?: string,
  ): Promise<AdaptiveRoadmapResult> {
    // 1. Analyze skill gaps
    const gapAnalysis = await this.skillGapEngine.analyzeSkillGap(userId, targetRole);
    const roleName = gapAnalysis.targetRole;

    const missingSkillNames = gapAnalysis.missingSkills.map((s) => s.name);
    const strongSkillNames = gapAnalysis.strongSkills.map((s) => s.name);
    const highImpactSkillNames = gapAnalysis.highImpactSkills.map((s) => s.name);

    let roadmapStructure: { summary: string; phases: RoadmapPhase[] };

    // 2. Try LLM Generation
    try {
      let prompt = personalizedRoadmapPrompt.userPromptTemplate;
      prompt = prompt
        .replace('{{targetRole}}', roleName)
        .replace(/\{\{timelineDays\}\}/g, String(timelineDays))
        .replace(
          '{{targetSkills}}',
          missingSkillNames.concat(strongSkillNames).slice(0, 10).join(', ') ||
            'Core Technical Skills',
        )
        .replace('{{strongSkills}}', strongSkillNames.join(', ') || 'Foundational Programming')
        .replace('{{missingSkills}}', missingSkillNames.join(', ') || 'Advanced Role Topics')
        .replace('{{interviewWeakAreas}}', highImpactSkillNames.join(', ') || 'System Architecture')
        .replace(
          '{{opportunitySignals}}',
          highImpactSkillNames.map((s) => `${s} (High Match Demand)`).join(', ') ||
            'High Opportunity Demand',
        );

      const res = await this.aiProvider.generateText(
        prompt,
        personalizedRoadmapPrompt.systemPrompt,
      );
      const parsed = JSON.parse(res.text);

      if (parsed.phases && Array.isArray(parsed.phases) && parsed.phases.length > 0) {
        roadmapStructure = {
          summary:
            parsed.summary || `Personalized ${timelineDays}-day career roadmap for ${roleName}.`,
          phases: parsed.phases,
        };
      } else {
        throw new Error('Invalid LLM roadmap payload format');
      }
    } catch (e) {
      this.logger.warn(
        `AI Roadmap generation unavailable/failed. Using deterministic fallback engine: ${e}`,
      );
      roadmapStructure = this.buildDeterministicRoadmap(
        roleName,
        timelineDays,
        missingSkillNames,
        strongSkillNames,
      );
    }

    // 3. Persist to database
    const existingRoadmap = await this.prisma.learningRoadmap.findFirst({
      where: { userId },
      orderBy: { version: 'desc' },
    });

    let savedRoadmap;
    if (existingRoadmap) {
      // Archive current version
      await this.prisma.learningRoadmapVersion.create({
        data: {
          roadmapId: existingRoadmap.id,
          version: existingRoadmap.version,
          reason: reason || `Adapted for timeline change or updated skill gaps`,
          roadmapJson: existingRoadmap.roadmapJson as any,
        },
      });

      savedRoadmap = await this.prisma.learningRoadmap.update({
        where: { id: existingRoadmap.id },
        data: {
          targetRole: roleName,
          timelineDays,
          version: existingRoadmap.version + 1,
          roadmapJson: roadmapStructure as any,
        },
      });
    } else {
      savedRoadmap = await this.prisma.learningRoadmap.create({
        data: {
          userId,
          targetRole: roleName,
          timelineDays,
          version: 1,
          roadmapJson: roadmapStructure as any,
        },
      });
    }

    return {
      id: savedRoadmap.id,
      targetRole: savedRoadmap.targetRole,
      timelineDays: savedRoadmap.timelineDays,
      currentPhase: savedRoadmap.currentPhase,
      overallProgress: savedRoadmap.overallProgress,
      version: savedRoadmap.version,
      summary: roadmapStructure.summary,
      phases: roadmapStructure.phases,
    };
  }

  /**
   * Retrieves active roadmap for user.
   */
  async getActiveRoadmap(userId: string): Promise<AdaptiveRoadmapResult> {
    const roadmap = await this.prisma.learningRoadmap.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });

    if (!roadmap) {
      // Generate default 60-day roadmap if none exists
      return this.generateOrAdaptRoadmap(
        userId,
        'Software Engineer',
        60,
        'Initial roadmap creation',
      );
    }

    const rJson = roadmap.roadmapJson as any;
    return {
      id: roadmap.id,
      targetRole: roadmap.targetRole,
      timelineDays: roadmap.timelineDays,
      currentPhase: roadmap.currentPhase,
      overallProgress: roadmap.overallProgress,
      version: roadmap.version,
      summary: rJson.summary || `Personalized ${roadmap.timelineDays}-day career roadmap.`,
      phases: rJson.phases || [],
    };
  }

  /**
   * Deterministic 7-phase fallback roadmap generator.
   */
  private buildDeterministicRoadmap(
    targetRole: string,
    timelineDays: number,
    missingSkills: string[],
    strongSkills: string[],
  ): { summary: string; phases: RoadmapPhase[] } {
    const hoursMultiplier = timelineDays <= 30 ? 0.6 : timelineDays >= 90 ? 1.4 : 1.0;

    const primaryMissing = missingSkills.slice(0, 3).join(', ') || 'Core Algorithms & SQL';
    const secondaryMissing = missingSkills.slice(3, 6).join(', ') || 'System Design & REST APIs';

    return {
      summary: `Tailored ${timelineDays}-day technical preparation plan targeting ${targetRole} internship roles.`,
      phases: [
        {
          phase: 1,
          title: 'Foundation & Prerequisites',
          estimatedHours: Math.round(10 * hoursMultiplier),
          skillsCovered:
            strongSkills.length > 0 ? strongSkills.slice(0, 2) : ['Data Structures', 'Git Basics'],
          milestones: [
            {
              title: 'Core Fundamentals Audit',
              description: 'Review foundational language concepts and modern developer tooling.',
              estimatedMinutes: 120,
              tasks: ['Set up development environment', 'Solve 3 practice coding problems'],
            },
          ],
        },
        {
          phase: 2,
          title: 'Core Skills Mastery',
          estimatedHours: Math.round(20 * hoursMultiplier),
          skillsCovered: missingSkills.slice(0, 2),
          milestones: [
            {
              title: `Mastery: ${primaryMissing}`,
              description: `Deep dive into key concepts and practical patterns for ${primaryMissing}.`,
              estimatedMinutes: 240,
              tasks: ['Complete guided exercises', 'Implement core features'],
            },
          ],
        },
        {
          phase: 3,
          title: 'Advanced Domain Skills',
          estimatedHours: Math.round(15 * hoursMultiplier),
          skillsCovered: missingSkills.slice(2, 4),
          milestones: [
            {
              title: `Advanced Concepts: ${secondaryMissing}`,
              description:
                'Build production-ready understanding of scalable patterns and integration.',
              estimatedMinutes: 180,
              tasks: [
                'Review architecture best practices',
                'Build micro-component practice exercise',
              ],
            },
          ],
        },
        {
          phase: 4,
          title: 'Portfolio Project Building',
          estimatedHours: Math.round(25 * hoursMultiplier),
          skillsCovered: missingSkills.concat(strongSkills).slice(0, 4),
          milestones: [
            {
              title: 'Full-Stack Portfolio Project',
              description: 'Design and build an end-to-end project highlighting your new skills.',
              estimatedMinutes: 360,
              tasks: ['Architect system components', 'Publish repository and documentation'],
            },
          ],
        },
        {
          phase: 5,
          title: 'Interview Intelligence & Mock Practice',
          estimatedHours: Math.round(12 * hoursMultiplier),
          skillsCovered: ['Technical Reasoning', 'STAR Communication'],
          milestones: [
            {
              title: 'Adaptive AI Mock Interviews',
              description:
                'Simulate technical and STAR behavioral interview rounds with instant feedback.',
              estimatedMinutes: 120,
              tasks: ['Complete 2 AI Mock Sessions', 'Review detailed feedback and model answers'],
            },
          ],
        },
        {
          phase: 6,
          title: 'Application Readiness & Copilot Outreach',
          estimatedHours: Math.round(8 * hoursMultiplier),
          skillsCovered: ['Resume Tailoring', 'Cover Letter Optimization'],
          milestones: [
            {
              title: 'Application Optimization',
              description: 'Align resume keywords and projects with top target internship matches.',
              estimatedMinutes: 90,
              tasks: ['Tailor resume for top 5 target roles', 'Draft application copilot notes'],
            },
          ],
        },
        {
          phase: 7,
          title: 'Internship Placement & Offer Stage',
          estimatedHours: Math.round(10 * hoursMultiplier),
          skillsCovered: ['Application Tracking', 'Follow-up Management'],
          milestones: [
            {
              title: 'Active Lifecycle Tracking',
              description: 'Manage interview invitations, coding assessments, and offer decisions.',
              estimatedMinutes: 60,
              tasks: ['Update application status board', 'Complete daily priority actions'],
            },
          ],
        },
      ],
    };
  }
}
