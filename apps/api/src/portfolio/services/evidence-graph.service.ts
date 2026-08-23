import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

export interface EvidenceNode {
  id: string;
  evidenceType:
    'DECLARED' | 'LEARNING' | 'PRACTICED' | 'PROJECT' | 'EXPERIENCE' | 'ASSESSED' | 'VALIDATED';
  title: string;
  score?: number;
  date: Date;
  description?: string;
}

export interface SkillEvidenceNode {
  skillId: string;
  skillName: string;
  category: string;
  confidenceScore: number;
  strengthLevel:
    'DECLARED' | 'LEARNING' | 'PRACTICED' | 'PROJECT' | 'EXPERIENCE' | 'ASSESSED' | 'VALIDATED';
  explanation: string;
  nodes: EvidenceNode[];
}

@Injectable()
export class EvidenceGraphService {
  private readonly logger = new Logger(EvidenceGraphService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates the complete Skill Evidence Graph for a user.
   */
  async getEvidenceGraph(userId: string): Promise<SkillEvidenceNode[]> {
    this.logger.log(`Building Skill Evidence Graph for user ${userId}`);

    // 1. Fetch user's registered skills
    const userSkills = await this.prisma.userSkill.findMany({
      where: { userId },
      include: { skill: true },
    });

    // 2. Fetch all raw skill evidences
    const dbEvidences = await this.prisma.skillEvidence.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // 3. Assemble and classify each skill node
    const graph: SkillEvidenceNode[] = [];

    for (const us of userSkills) {
      const skillId = us.skillId;
      const skillName = us.skill.name;
      const category = us.skill.category;

      // Filter evidences matching this skill
      const matchingEvidences = dbEvidences.filter((e) => e.skillId === skillId);

      const nodes: EvidenceNode[] = matchingEvidences.map((e) => {
        // Map database evidenceType to Phase 39 Strength classification
        let strength: EvidenceNode['evidenceType'] = 'DECLARED';
        if (e.evidenceType === 'PROJECT') strength = 'PROJECT';
        else if (e.evidenceType === 'EXPERIENCE') strength = 'EXPERIENCE';
        else if (e.evidenceType === 'QUIZ') strength = 'LEARNING';
        else if (e.evidenceType === 'CODING_EXERCISE') strength = 'PRACTICED';
        else if (e.evidenceType === 'ASSESSMENT') strength = 'ASSESSED';
        else if (e.evidenceType === 'CERTIFICATE') strength = 'ASSESSED';
        else if (e.score >= 80) strength = 'VALIDATED';

        const node: EvidenceNode = {
          id: e.id,
          evidenceType: strength,
          title: this.getEvidenceTitle(e.evidenceType, skillName, e.score),
          score: e.score,
          date: e.createdAt,
        };

        if (e.description) {
          node.description = e.description;
        }

        return node;
      });

      // If no concrete evidence exists, add a fallback DECLARED node representing the user claiming the skill
      if (nodes.length === 0) {
        nodes.push({
          id: `declared-${skillId}`,
          evidenceType: 'DECLARED',
          title: `Self-declared ${skillName}`,
          date: us.addedAt || new Date(),
          description: `You declared proficiency in ${skillName} at level ${us.proficiency}.`,
        });
      }

      // Determine overall strength level (highest evidenceType)
      const strengthLevel = this.determineHighestStrength(nodes);

      // Calculate confidence score (0.0 to 1.0)
      const confidenceResult = this.calculateConfidence(nodes, us.decayWarning);

      // Sync computed confidence score and evidence count back to the UserSkill table for synchronization!
      await this.prisma.userSkill
        .update({
          where: { userId_skillId: { userId, skillId } },
          data: {
            confidenceScore: confidenceResult.score,
            evidenceCount: matchingEvidences.length,
            lastEvaluatedAt: new Date(),
          },
        })
        .catch((e) => this.logger.warn(`Could not sync UserSkill confidence score: ${e.message}`));

      graph.push({
        skillId,
        skillName,
        category,
        confidenceScore: confidenceResult.score,
        strengthLevel,
        explanation: confidenceResult.explanation,
        nodes,
      });
    }

    return graph;
  }

  // ── Helper Logic ──────────────────────────────────────────────────────────

  private getEvidenceTitle(type: string, skillName: string, score: number): string {
    switch (type) {
      case 'PROJECT':
        return `${skillName} Project Implementation`;
      case 'EXPERIENCE':
        return `Professional Experience utilizing ${skillName}`;
      case 'QUIZ':
        return `${skillName} Learning Course Module`;
      case 'CODING_EXERCISE':
        return `${skillName} Practice Completion`;
      case 'ASSESSMENT':
        return `${skillName} Competency Assessment (Scored: ${score}%)`;
      case 'CERTIFICATE':
        return `${skillName} Verified Certification`;
      default:
        return `Evidence verification for ${skillName}`;
    }
  }

  private determineHighestStrength(nodes: EvidenceNode[]): SkillEvidenceNode['strengthLevel'] {
    const order: Record<EvidenceNode['evidenceType'], number> = {
      VALIDATED: 6,
      ASSESSED: 5,
      EXPERIENCE: 4,
      PROJECT: 3,
      PRACTICED: 2,
      LEARNING: 1,
      DECLARED: 0,
    };

    let highest: SkillEvidenceNode['strengthLevel'] = 'DECLARED';
    for (const node of nodes) {
      if (order[node.evidenceType] > order[highest]) {
        highest = node.evidenceType;
      }
    }
    return highest;
  }

  private calculateConfidence(
    nodes: EvidenceNode[],
    decayWarning: boolean,
  ): { score: number; explanation: string } {
    if (nodes.length === 0) {
      return { score: 0.1, explanation: 'Self-declared only. No evidence exists.' };
    }

    let baseScore = 0.1;
    const reasons: string[] = [];

    // Evaluate strongest signal present
    const strengths = nodes.map((n) => n.evidenceType);

    if (strengths.includes('VALIDATED')) {
      baseScore = 0.95;
      reasons.push(
        'High scoring technical assessment or interview performance validated your skillset.',
      );
    } else if (strengths.includes('ASSESSED')) {
      baseScore = 0.85;
      reasons.push(
        'You completed verified competency testing or received professional certification.',
      );
    } else if (strengths.includes('EXPERIENCE')) {
      baseScore = 0.8;
      reasons.push('You demonstrated capability during real-world professional work experience.');
    } else if (strengths.includes('PROJECT')) {
      baseScore = 0.7;
      reasons.push('You built practical project evidence demonstrating active implementation.');
    } else if (strengths.includes('PRACTICED')) {
      baseScore = 0.5;
      reasons.push('You finished hands-on practice problems or coding exercises.');
    } else if (strengths.includes('LEARNING')) {
      baseScore = 0.35;
      reasons.push('You started or completed educational learning roadmap modules.');
    } else {
      reasons.push(
        'This is a self-declared claim with no supporting platforms exercises or projects.',
      );
    }

    // Boost score slightly for having multiple evidence items
    const concreteCount = nodes.filter((n) => n.evidenceType !== 'DECLARED').length;
    if (concreteCount > 1) {
      baseScore += Math.min(0.1, concreteCount * 0.02);
      reasons.push(`Supported by ${concreteCount} distinct evidence records.`);
    }

    // Check recency
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const hasRecent = nodes.some((n) => n.date >= ninetyDaysAgo && n.evidenceType !== 'DECLARED');
    if (hasRecent) {
      baseScore += 0.05;
      reasons.push('Recent evidence verified within the last 90 days.');
    }

    // Apply decay penalty if warning is flag-triggered
    if (decayWarning) {
      baseScore -= 0.15;
      reasons.push('Flagged decay warning due to lack of recent practice/assessment activity.');
    }

    const finalScore = Math.max(0.1, Math.min(1.0, Math.round(baseScore * 100) / 100));

    return {
      score: finalScore,
      explanation: reasons.join(' '),
    };
  }
}
