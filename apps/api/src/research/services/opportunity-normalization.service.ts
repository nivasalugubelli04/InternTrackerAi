import { createHash } from 'crypto';

import { Injectable, Logger } from '@nestjs/common';
import { OpportunityCategory, SourceTrustLevel } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { NormalizedOpportunity, RawOpportunityPayload } from '../interfaces/research.interfaces';

@Injectable()
export class OpportunityNormalizationService {
  private readonly logger = new Logger(OpportunityNormalizationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Normalizes, sanitizes, and computes deduplication hashes for raw opportunity data.
   */
  normalizeOpportunity(
    payload: RawOpportunityPayload,
    sourceTrust: SourceTrustLevel = SourceTrustLevel.VERIFIED_OFFICIAL,
  ): NormalizedOpportunity {
    this.logger.log(`Normalizing raw opportunity: ${payload.jobTitle || 'Unknown'}`);
    const companyName = (payload.companyName || 'Unknown Company').trim();
    const companySlug = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const jobTitle = (payload.jobTitle || 'Career Opportunity').trim();
    const category = payload.category || this.inferCategory(jobTitle, payload.description);

    // Normalize work mode
    let workMode: 'REMOTE' | 'HYBRID' | 'ONSITE' = 'ONSITE';
    const locLower = (payload.location || '').toLowerCase();
    const descLower = (payload.description || '').toLowerCase();
    if (
      locLower.includes('remote') ||
      descLower.includes('remote') ||
      payload.workMode === 'REMOTE'
    ) {
      workMode = 'REMOTE';
    } else if (
      locLower.includes('hybrid') ||
      descLower.includes('hybrid') ||
      payload.workMode === 'HYBRID'
    ) {
      workMode = 'HYBRID';
    }

    // Extract technical skills if not explicitly provided
    const skills =
      payload.skills && payload.skills.length > 0
        ? payload.skills
        : this.extractSkills(payload.description + ' ' + (payload.requirements || []).join(' '));

    // Deduplication Hash (SHA-256 of companySlug + normalizedTitle + cleanUrl)
    const cleanUrl = (payload.applicationUrl || '').split('?')[0]?.toLowerCase() || '';
    const hashPayload = `${companySlug}:${jobTitle.toLowerCase()}:${cleanUrl}`;
    const hash = createHash('sha256').update(hashPayload).digest('hex');

    const postedDate = payload.postedDate ? new Date(payload.postedDate) : new Date();
    const deadline = payload.deadline ? new Date(payload.deadline) : undefined;

    return {
      hash,
      companyName,
      companySlug,
      jobTitle,
      category,
      department: payload.department?.trim(),
      location:
        payload.location?.trim() || (workMode === 'REMOTE' ? 'Remote' : 'Various Locations'),
      workMode,
      stipend: payload.stipend,
      salary: payload.salary,
      duration: payload.duration?.trim(),
      description: payload.description.trim(),
      requirements: payload.requirements || [],
      skills,
      applicationUrl: payload.applicationUrl.trim(),
      postedDate,
      deadline,
      sourceTrust,
    };
  }

  /**
   * Checks if an opportunity already exists or is a close duplicate.
   */
  async isDuplicate(normalized: NormalizedOpportunity): Promise<{
    isDuplicate: boolean;
    existingJobId?: string;
  }> {
    // 1. Check exact hash match on JobPosting
    const exactMatch = await this.prisma.jobPosting.findUnique({
      where: { hash: normalized.hash },
      select: { id: true },
    });

    if (exactMatch) {
      return { isDuplicate: true, existingJobId: exactMatch.id };
    }

    // 2. Check title + company match
    const fuzzyMatch = await this.prisma.jobPosting.findFirst({
      where: {
        title: { equals: normalized.jobTitle, mode: 'insensitive' },
        company: { slug: normalized.companySlug },
        status: 'ACTIVE',
      },
      select: { id: true },
    });

    if (fuzzyMatch) {
      return { isDuplicate: true, existingJobId: fuzzyMatch.id };
    }

    return { isDuplicate: false };
  }

  /**
   * Infers OpportunityCategory from title and description keywords.
   */
  inferCategory(title: string, description: string): OpportunityCategory {
    const text = `${title} ${description}`.toLowerCase();

    if (
      text.includes('hackathon') ||
      text.includes('coding challenge') ||
      text.includes('datathon')
    ) {
      return OpportunityCategory.HACKATHON;
    }
    if (text.includes('open source') || text.includes('gsoc') || text.includes('fellowship')) {
      return text.includes('fellowship')
        ? OpportunityCategory.FELLOWSHIP
        : OpportunityCategory.OPEN_SOURCE;
    }
    if (text.includes('graduate') || text.includes('rotational') || text.includes('new grad')) {
      return OpportunityCategory.GRADUATE_PROGRAM;
    }
    if (text.includes('apprentice')) {
      return OpportunityCategory.APPRENTICESHIP;
    }
    if (
      text.includes('entry level') ||
      text.includes('junior') ||
      text.includes('associate engineer')
    ) {
      return OpportunityCategory.ENTRY_LEVEL_JOB;
    }
    if (text.includes('summit') || text.includes('conference') || text.includes('webinar')) {
      return OpportunityCategory.TECHNICAL_EVENT;
    }

    return OpportunityCategory.INTERNSHIP;
  }

  /**
   * Extracts recognized technical skills from opportunity text.
   */
  private extractSkills(text: string): string[] {
    const commonKeywords = [
      'Python',
      'PyTorch',
      'TensorFlow',
      'TypeScript',
      'JavaScript',
      'React',
      'Node.js',
      'NestJS',
      'PostgreSQL',
      'Docker',
      'Kubernetes',
      'AWS',
      'GCP',
      'Azure',
      'C++',
      'Java',
      'Go',
      'Rust',
      'GraphQL',
      'REST API',
      'Machine Learning',
      'NLP',
      'LLM',
      'SQL',
      'Git',
      'CI/CD',
      'Linux',
      'Microservices',
      'TailwindCSS',
    ];

    const textLower = text.toLowerCase();
    return commonKeywords.filter((kw) => textLower.includes(kw.toLowerCase()));
  }
}
