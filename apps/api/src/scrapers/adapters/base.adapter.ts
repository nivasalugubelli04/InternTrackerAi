import { Logger } from '@nestjs/common';
import type { Company, ParserType } from '@prisma/client';
import { WorkMode } from '@prisma/client';

import type { AtsAdapter, CollectedJobResult } from '../interfaces/ats-adapter.interface';

export abstract class BaseAtsAdapter implements AtsAdapter {
  protected readonly logger = new Logger(this.constructor.name);
  abstract readonly name: string;
  abstract readonly parserType: ParserType;

  abstract supports(company: Company): boolean;
  abstract scrape(company: Company): Promise<CollectedJobResult>;

  /**
   * Helper to extract board token from career URL or slug.
   * e.g. https://boards.greenhouse.io/airbnb -> airbnb
   */
  protected extractBoardToken(url: string | null | undefined, companySlug: string): string {
    if (!url) return companySlug.toLowerCase();

    try {
      const parsedUrl = new URL(url);
      const segments = parsedUrl.pathname.split('/').filter(Boolean);
      const lastSegment = segments[segments.length - 1];
      if (lastSegment) {
        return lastSegment.toLowerCase();
      }
    } catch {
      // If not a valid URL, fallback to slug
    }
    return companySlug.toLowerCase();
  }

  /**
   * Infer WorkMode from title, location, or description text.
   */
  protected inferWorkMode(text: string): WorkMode | undefined {
    const lower = text.toLowerCase();
    if (lower.includes('remote') || lower.includes('work from home')) {
      return WorkMode.REMOTE;
    }
    if (lower.includes('hybrid')) {
      return WorkMode.HYBRID;
    }
    if (lower.includes('onsite') || lower.includes('on-site') || lower.includes('in-office')) {
      return WorkMode.ONSITE;
    }
    return undefined;
  }

  /**
   * Infer Experience Level from title or description.
   */
  protected inferExperienceLevel(text: string): string {
    const lower = text.toLowerCase();
    if (lower.includes('intern') || lower.includes('co-op') || lower.includes('student')) {
      return 'Internship';
    }
    if (
      lower.includes('junior') ||
      lower.includes('entry') ||
      lower.includes('graduate') ||
      lower.includes('associate')
    ) {
      return 'Entry Level';
    }
    return 'Entry Level / Internship';
  }

  /**
   * Clean string content (strip excessive whitespace).
   */
  protected cleanText(text: string | null | undefined): string | undefined {
    if (!text) return undefined;
    const cleaned = text.replace(/\s+/g, ' ').trim();
    return cleaned.length > 0 ? cleaned : undefined;
  }
}
