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
  graduationRequirement: number | null;
  experienceRequirement: number | null;
  employmentType: string | null;
  internshipType: string | null;
  eligibility: string | null;
  applicationDeadline: Date | null;
  postedAt: Date;
  source: string;
  sourceUrl: string;
  company: {
    id: string;
    name: string;
    industry: string | null;
    logoUrl: string | null;
  };
  industry: string | null;
  roleCategory: string;
  status: string;
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
    const descText = `${job.description ?? ''} ${respText} ${reqText}`;
    const descKeywords = this.keywordNormalizer.extractKeywordsFromText(descText);

    const requiredSkills = this.keywordNormalizer.normalizeKeywords([
      ...titleKeywords,
      ...reqKeywords,
    ]);

    const descriptionKeywords = this.keywordNormalizer.normalizeKeywords(descKeywords);

    // Extract minimum CGPA
    const minCgpa = this.extractMinCgpa(descText);

    // Extract graduation requirement (batch year)
    const graduationRequirement = this.extractGraduationRequirement(descText);

    // Extract experience requirement (years)
    const experienceRequirement = this.extractExperienceRequirement(descText);

    const roleCategory = this.extractRoleCategory(job.title ?? '');

    const stipend = job.stipend ?? job.salary ?? null;

    return {
      jobId: job.id,
      title: job.title,
      companyId: job.companyId,
      companyName: job.company.name,
      department: job.department ?? null,
      experienceLevel: job.experienceLevel ?? null,
      location: job.location ?? null,
      workMode: job.workMode ?? null,
      stipend,
      duration: job.duration ?? null,
      requiredSkills,
      preferredSkills: descriptionKeywords.filter((s) => !requiredSkills.includes(s)),
      descriptionKeywords,
      minCgpa,
      graduationRequirement,
      experienceRequirement,
      employmentType: job.employmentType ?? null,
      internshipType:
        job.employmentType?.toLowerCase().includes('intern') ||
        job.title?.toLowerCase().includes('intern')
          ? 'Internship'
          : 'Job',
      eligibility: job.requirements?.length > 0 ? job.requirements.join(', ') : 'Not Specified',
      applicationDeadline: job.deadline ?? null,
      postedAt: job.postedDate ?? job.createdAt ?? new Date(),
      source: job.source ?? 'GENERIC_HTML',
      sourceUrl: job.applicationUrl,
      company: {
        id: job.company.id,
        name: job.company.name,
        industry: job.company.industry ?? null,
        logoUrl: job.company.logoUrl ?? null,
      },
      industry: job.company.industry ?? null,
      roleCategory,
      status: job.status,
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

  private extractGraduationRequirement(text: string): number | null {
    if (!text) return null;
    const gradMatch = text.match(
      /(?:graduating|graduation|batch of|class of|graduates|grads|grad)\s*(?:in|of|:)?\s*(202[3-9]|2030)/i,
    );
    if (gradMatch?.[1]) {
      return parseInt(gradMatch[1], 10);
    }
    return null;
  }

  private extractExperienceRequirement(text: string): number | null {
    if (!text) return 0;
    const expMatch = text.match(
      /([0-9]+)\s*(?:\+|to|-)?\s*[0-9]*\s*(?:year|yr)s?\s*(?:of)?\s*(?:experience|exp)/i,
    );
    if (expMatch?.[1]) {
      return parseInt(expMatch[1], 10);
    }
    if (/fresher|entry-level|no experience/i.test(text)) {
      return 0;
    }
    return null;
  }

  private extractRoleCategory(title: string): string {
    const lowerTitle = title.toLowerCase();
    if (
      lowerTitle.includes('machine learning') ||
      lowerTitle.includes('ml') ||
      lowerTitle.includes('deep learning') ||
      lowerTitle.includes('ai') ||
      lowerTitle.includes('nlp')
    ) {
      return 'AI / Machine Learning';
    }
    if (
      lowerTitle.includes('data scientist') ||
      lowerTitle.includes('data science') ||
      lowerTitle.includes('data analyst') ||
      lowerTitle.includes('analytics')
    ) {
      return 'Data Science & Analytics';
    }
    if (
      lowerTitle.includes('frontend') ||
      lowerTitle.includes('front-end') ||
      lowerTitle.includes('react') ||
      lowerTitle.includes('angular') ||
      lowerTitle.includes('vue')
    ) {
      return 'Frontend Engineering';
    }
    if (
      lowerTitle.includes('backend') ||
      lowerTitle.includes('back-end') ||
      lowerTitle.includes('node') ||
      lowerTitle.includes('python') ||
      lowerTitle.includes('java')
    ) {
      return 'Backend Engineering';
    }
    if (
      lowerTitle.includes('fullstack') ||
      lowerTitle.includes('full stack') ||
      lowerTitle.includes('full-stack')
    ) {
      return 'Full-Stack Engineering';
    }
    if (
      lowerTitle.includes('devops') ||
      lowerTitle.includes('cloud') ||
      lowerTitle.includes('aws') ||
      lowerTitle.includes('sre') ||
      lowerTitle.includes('infrastructure')
    ) {
      return 'Cloud & DevOps';
    }
    if (
      lowerTitle.includes('mobile') ||
      lowerTitle.includes('android') ||
      lowerTitle.includes('ios') ||
      lowerTitle.includes('react native')
    ) {
      return 'Mobile Engineering';
    }
    if (
      lowerTitle.includes('qa') ||
      lowerTitle.includes('test') ||
      lowerTitle.includes('testing') ||
      lowerTitle.includes('sdet')
    ) {
      return 'QA & Testing';
    }
    if (lowerTitle.includes('product manager') || lowerTitle.includes('pm')) {
      return 'Product Management';
    }
    return 'Software Engineering';
  }
}
