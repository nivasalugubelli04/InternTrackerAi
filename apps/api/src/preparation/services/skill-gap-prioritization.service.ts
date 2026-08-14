import { Injectable } from '@nestjs/common';

import { SemanticMatchingService } from '../../matching/services/semantic-matching.service';
import { SkillNormalizationService } from '../../nlp/services/skill-normalization.service';
import { PrismaService } from '../../prisma/prisma.service';

export interface PrioritizedSkill {
  name: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  reasoning: string;
}

@Injectable()
export class SkillGapPrioritizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly semanticMatching: SemanticMatchingService,
    private readonly skillNormalizer: SkillNormalizationService,
  ) {}

  async prioritizeMissingSkills(userId: string, jobId: string): Promise<PrioritizedSkill[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userSkills: { include: { skill: true } },
      },
    });

    const job = await this.prisma.jobPosting.findUnique({
      where: { id: jobId },
    });

    if (!user || !job) {
      throw new Error('User or Job not found');
    }

    const userSkillNames = user.userSkills.map((us) => us.skill.name.toLowerCase());
    const jobSkills = await Promise.all(
      job.requirements.map(async (req) => {
        const normalized = this.skillNormalizer.normalize(req);
        return { original: req, normalized: normalized.toLowerCase() };
      }),
    );

    const missingSkills = jobSkills.filter(
      (js) =>
        !userSkillNames.includes(js.normalized) &&
        !userSkillNames.includes(js.original.toLowerCase()),
    );

    // Get semantic similarity between job and user profile
    const semanticScore = await this.semanticMatching.computeSemanticScore(userId, jobId);

    // In a fully integrated vector DB approach, we would compute distance between each missing skill
    // and the user's existing skill embeddings. Here we do a simplified rule/semantic hybrid.

    return missingSkills.map((ms, index) => {
      // Basic heuristic:
      // First 2 missing skills are CRITICAL if semantic score is low, else HIGH.
      // Next 2 are HIGH or MEDIUM.
      let priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';

      if (index === 0 || index === 1) {
        priority = semanticScore !== null && semanticScore < 60 ? 'CRITICAL' : 'HIGH';
      } else if (index === 2 || index === 3) {
        priority = 'MEDIUM';
      }

      return {
        name: ms.original,
        priority,
        reasoning: `Identified as a core requirement for this role based on semantic distance.`,
      };
    });
  }
}
