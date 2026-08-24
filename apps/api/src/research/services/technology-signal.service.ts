import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { TechnologyDemandTrend } from '../interfaces/research.interfaces';

@Injectable()
export class TechnologySignalService {
  private readonly logger = new Logger(TechnologySignalService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Records skill occurrences extracted from an ingested opportunity.
   */
  async ingestSkillSignals(skills: string[], jobTitle: string) {
    if (!skills || skills.length === 0) return;
    this.logger.log(`Ingesting ${skills.length} skills for ${jobTitle}`);

    for (const rawSkill of skills) {
      const skillName = rawSkill.trim();
      if (!skillName) continue;

      const existing = await this.prisma.technologySignal.findUnique({
        where: { skillName },
      });

      if (existing) {
        const newCount = existing.frequencyCount + 1;
        const trend: 'INCREASING' | 'STABLE' | 'EMERGING' | 'DECLINING' =
          newCount >= 10 ? 'INCREASING' : newCount >= 3 ? 'STABLE' : 'EMERGING';

        const titles = Array.from(new Set([...existing.sampleJobTitles, jobTitle])).slice(0, 3);

        await this.prisma.technologySignal.update({
          where: { skillName },
          data: {
            frequencyCount: newCount,
            demandTrend: trend,
            sourceCount: existing.sourceCount + 1,
            sampleJobTitles: titles,
            lastDetectedAt: new Date(),
          },
        });
      } else {
        await this.prisma.technologySignal.create({
          data: {
            skillName,
            frequencyCount: 1,
            demandTrend: 'EMERGING',
            sourceCount: 1,
            sampleJobTitles: [jobTitle],
            lastDetectedAt: new Date(),
          },
        });
      }
    }
  }

  /**
   * Returns top trending technology signals.
   */
  async getTrendingSignals(limit = 10): Promise<TechnologyDemandTrend[]> {
    const signals = await this.prisma.technologySignal.findMany({
      orderBy: { frequencyCount: 'desc' },
      take: limit,
    });

    return signals.map((s: any) => ({
      skillName: s.skillName,
      category: s.category,
      frequencyCount: s.frequencyCount,
      demandTrend: s.demandTrend || 'STABLE',
      sourceCount: s.sourceCount,
      sampleJobTitles: s.sampleJobTitles,
    }));
  }
}
