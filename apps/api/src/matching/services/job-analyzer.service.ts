import { Injectable, NotFoundException } from '@nestjs/common';
import type { WorkMode } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { KeywordNormalizerService } from './keyword-normalizer.service';

export interface NormalizedJob {
  jobId: string;
  title: string;
  companyId: string;
  companyName: string;
  department: string | null;
  experienceLevel: string | null;
  location: string | null;
  workMode: WorkMode | null;
  stipend: number | null;
  duration: string | null;
  requiredSkills: string[];
  preferredSkills: string[];
  descriptionKeywords: string[];
  minCgpa: number | null;
}

@Injectable()
export class JobAnalyzerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly keywordNormalizer: KeywordNormalizerService,
  ) {}

  /**
   * Fetches and normalizes job posting data for matching.
   */
  async analyzeJob(jobId: string): Promise<NormalizedJob> {
    const job = await this.prisma.jobPosting.findUnique({
      where: { id: jobId },
      include: { company: true },
    });

    if (!job) {
      throw new NotFoundException(`Job posting with ID ${jobId} not found`);
    }

    return this.normalizeJobData(job);
  }

  /**
   * Normalizes pre-fetched job object directly.
   */
  normalizeJobData(job: any): NormalizedJob {
    const titleKeywords = this.keywordNormalizer.extractKeywordsFromText(job.title ?? '');
    const reqText = (job.requirements ?? []).join(' ');
    const reqKeywords = this.keywordNormalizer.extractKeywordsFromText(reqText);

    const respText = (job.responsibilities ?? []).join(' ');
    const descText = `${job.description ?? ''} ${respText}`;
    const descKeywords = this.keywordNormalizer.extractKeywordsFromText(descText);

    const requiredSkills = this.keywordNormalizer.normalizeKeywords([
      ...titleKeywords,
      ...reqKeywords,
    ]);

    const descriptionKeywords = this.keywordNormalizer.normalizeKeywords(descKeywords);

    // Extract potential minimum CGPA requirement from text
    const minCgpa = this.extractMinCgpa(`${job.description ?? ''} ${reqText}`);

    return {
      jobId: job.id,
      title: job.title,
      companyId: job.companyId,
      companyName: job.company.name,
      department: job.department ?? null,
      experienceLevel: job.experienceLevel ?? null,
      location: job.location ?? null,
      workMode: job.workMode ?? null,
      stipend: job.stipend ?? job.salary ?? null,
      duration: job.duration ?? null,
      requiredSkills,
      preferredSkills: descriptionKeywords.filter((s) => !requiredSkills.includes(s)),
      descriptionKeywords,
      minCgpa,
    };
  }

  private extractMinCgpa(text: string): number | null {
    if (!text) return null;
    const cgpaMatch = text.match(/(?:cgpa|gpa|cutoff)\s*(?:of|:)?\s*([0-9]\.[0-9]{1,2}|[0-9])/i);
    if (cgpaMatch?.[1]) {
      const val = parseFloat(cgpaMatch[1]);
      if (val >= 0 && val <= 10) return val;
    }
    return null;
  }
}
