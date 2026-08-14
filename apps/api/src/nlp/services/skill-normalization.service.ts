import { Injectable, OnModuleInit } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SkillNormalizationService implements OnModuleInit {
  // Simple in-memory cache to avoid DB lookups for every skill
  private aliasMap = new Map<string, string>();

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.refreshCache();
  }

  async refreshCache() {
    const skills = await this.prisma.normalizedSkill.findMany();
    this.aliasMap.clear();

    for (const skill of skills) {
      this.aliasMap.set(skill.canonicalName.toLowerCase(), skill.canonicalName);
      for (const alias of skill.aliases) {
        this.aliasMap.set(alias.toLowerCase(), skill.canonicalName);
      }
    }

    // Seed some defaults if empty
    if (this.aliasMap.size === 0) {
      await this.seedDefaults();
      await this.refreshCache();
    }
  }

  normalize(rawSkill: string): string {
    const lower = rawSkill.trim().toLowerCase();
    return this.aliasMap.get(lower) || rawSkill.trim();
  }

  normalizeList(skills: string[]): string[] {
    const normalized = skills.map((s) => this.normalize(s));
    return [...new Set(normalized)]; // deduplicate
  }

  private async seedDefaults() {
    const defaults = [
      { canonical: 'JavaScript', aliases: ['JS'] },
      { canonical: 'TypeScript', aliases: ['TS'] },
      { canonical: 'React', aliases: ['ReactJS', 'React.js'] },
      { canonical: 'Node.js', aliases: ['NodeJS', 'Node'] },
      { canonical: 'PostgreSQL', aliases: ['Postgres'] },
      { canonical: 'Machine Learning', aliases: ['ML'] },
      { canonical: 'Deep Learning', aliases: ['DL'] },
      { canonical: 'Computer Vision', aliases: ['CV'] },
      { canonical: 'AWS', aliases: ['AWS Cloud', 'Amazon Web Services'] },
    ];

    for (const item of defaults) {
      await this.prisma.normalizedSkill.upsert({
        where: { canonicalName: item.canonical },
        update: { aliases: item.aliases },
        create: { canonicalName: item.canonical, aliases: item.aliases },
      });
    }
  }
}
