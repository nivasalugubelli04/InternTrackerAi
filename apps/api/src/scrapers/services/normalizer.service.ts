import { createHash } from 'crypto';

import { Injectable } from '@nestjs/common';
import type { ParserType } from '@prisma/client';
import { WorkMode } from '@prisma/client';

import type { CollectedJob } from '../interfaces/ats-adapter.interface';

export interface NormalizedJobData {
  companyId: string;
  externalJobId?: string | undefined;
  title: string;
  department?: string | undefined;
  employmentType?: string | undefined;
  experienceLevel?: string | undefined;
  location?: string | undefined;
  workMode?: WorkMode | undefined;
  stipend?: number | undefined;
  salary?: number | undefined;
  duration?: string | undefined;
  description?: string | undefined;
  requirements: string[];
  responsibilities: string[];
  benefits: string[];
  applicationUrl: string;
  postedDate?: Date | undefined;
  deadline?: Date | undefined;
  source: ParserType;
  hash: string;
}

@Injectable()
export class NormalizerService {
  /**
   * Normalizes raw collected job into standard NormalizedJobData structure.
   */
  normalize(companyId: string, job: CollectedJob, parserType: ParserType): NormalizedJobData {
    const title = this.normalizeTitle(job.title);
    const location = this.normalizeLocation(job.location);
    const workMode = job.workMode || this.detectWorkMode(title, location);
    const experienceLevel = job.experienceLevel || this.detectExperienceLevel(title);
    const employmentType = this.normalizeEmploymentType(job.employmentType, title);
    const canonicalUrl = this.normalizeUrl(job.applicationUrl);

    const hash = this.generateStableHash(
      companyId,
      title,
      location,
      canonicalUrl,
      job.externalJobId,
    );

    return {
      companyId,
      ...(job.externalJobId ? { externalJobId: job.externalJobId } : {}),
      title,
      ...(job.department ? { department: job.department.trim() } : {}),
      employmentType,
      experienceLevel,
      ...(location ? { location } : {}),
      ...(workMode ? { workMode } : {}),
      ...(job.stipend !== undefined ? { stipend: job.stipend } : {}),
      ...(job.salary !== undefined ? { salary: job.salary } : {}),
      ...(job.duration ? { duration: job.duration } : {}),
      ...(job.description ? { description: job.description } : {}),
      requirements: job.requirements || [],
      responsibilities: job.responsibilities || [],
      benefits: job.benefits || [],
      applicationUrl: canonicalUrl,
      ...(job.postedDate ? { postedDate: job.postedDate } : {}),
      ...(job.deadline ? { deadline: job.deadline } : {}),
      source: parserType,
      hash,
    };
  }

  /**
   * Generates SHA-256 stable content hash for deduplication.
   */
  public generateStableHash(
    companyId: string,
    title: string,
    location: string | undefined,
    applicationUrl: string,
    externalJobId?: string,
  ): string {
    const rawString = `${companyId}:${externalJobId || ''}:${title.toLowerCase()}:${(location || '').toLowerCase()}:${applicationUrl.toLowerCase()}`;
    return createHash('sha256').update(rawString).digest('hex');
  }

  private normalizeTitle(title: string): string {
    return title.replace(/\s+/g, ' ').trim();
  }

  private normalizeLocation(location?: string): string | undefined {
    if (!location) return undefined;
    return location.replace(/\s+/g, ' ').trim();
  }

  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      // Strip tracking query parameters
      parsed.searchParams.delete('utm_source');
      parsed.searchParams.delete('utm_medium');
      parsed.searchParams.delete('utm_campaign');
      parsed.searchParams.delete('gh_jid');
      return parsed.toString();
    } catch {
      return url.trim();
    }
  }

  private detectWorkMode(title: string, location?: string): WorkMode | undefined {
    const combined = `${title} ${location || ''}`.toLowerCase();
    if (combined.includes('remote') || combined.includes('work from home')) return WorkMode.REMOTE;
    if (combined.includes('hybrid')) return WorkMode.HYBRID;
    if (combined.includes('onsite') || combined.includes('on-site')) return WorkMode.ONSITE;
    return undefined;
  }

  private detectExperienceLevel(title: string): string {
    const lower = title.toLowerCase();
    if (lower.includes('intern') || lower.includes('co-op') || lower.includes('fellow'))
      return 'Internship';
    if (lower.includes('junior') || lower.includes('entry') || lower.includes('graduate'))
      return 'Entry Level';
    return 'Internship / Entry Level';
  }

  private normalizeEmploymentType(type?: string, title?: string): string {
    if (type) return type.trim();
    const lowerTitle = (title || '').toLowerCase();
    if (lowerTitle.includes('intern') || lowerTitle.includes('co-op')) return 'Internship';
    return 'Full-time';
  }
}
