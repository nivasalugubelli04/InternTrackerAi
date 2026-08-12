import { Injectable } from '@nestjs/common';
import type { Company } from '@prisma/client';
import { ParserType } from '@prisma/client';

import type { CollectedJob, CollectedJobResult } from '../interfaces/ats-adapter.interface';

import { BaseAtsAdapter } from './base.adapter';

@Injectable()
export class LeverAdapter extends BaseAtsAdapter {
  readonly name = 'LeverAdapter';
  readonly parserType = ParserType.LEVER;

  supports(company: Company): boolean {
    if (company.parserType === ParserType.LEVER) return true;
    return !!(company.careerPageUrl && company.careerPageUrl.includes('lever.co'));
  }

  async scrape(company: Company): Promise<CollectedJobResult> {
    const siteToken = this.extractBoardToken(company.careerPageUrl, company.slug);
    const apiUrl = `https://api.lever.co/v0/postings/${siteToken}?mode=json`;

    this.logger.log(`Fetching Lever jobs from: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'InternTrackerAI-Scraper/1.0',
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(
        `Lever API request failed with status ${response.status}: ${response.statusText}`,
      );
    }

    const rawJobs = (await response.json()) as any[];

    const jobs: CollectedJob[] = (Array.isArray(rawJobs) ? rawJobs : []).map((rawJob) => {
      const locationName = rawJob.categories?.location ?? '';
      const departmentName = rawJob.categories?.department ?? rawJob.categories?.team;
      const employmentType = rawJob.categories?.commitment;

      return {
        externalJobId: String(rawJob.id),
        title: this.cleanText(rawJob.text) || 'Untitled Position',
        department: this.cleanText(departmentName),
        employmentType: this.cleanText(employmentType),
        location: this.cleanText(locationName),
        workMode: this.inferWorkMode(`${rawJob.text} ${locationName}`),
        experienceLevel: this.inferExperienceLevel(rawJob.text),
        description: rawJob.descriptionPlain || rawJob.description,
        applicationUrl:
          rawJob.hostedUrl || rawJob.applyUrl || `${company.careerPageUrl}#${rawJob.id}`,
        postedDate: rawJob.createdAt ? new Date(rawJob.createdAt) : undefined,
        rawJson: rawJob,
      };
    });

    return {
      jobs,
      rawPayloads: rawJobs,
      parserVersion: '1.0.0',
    };
  }
}
