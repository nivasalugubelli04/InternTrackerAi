import { Injectable } from '@nestjs/common';
import type { Company } from '@prisma/client';
import { ParserType } from '@prisma/client';

import type { CollectedJob, CollectedJobResult } from '../interfaces/ats-adapter.interface';

import { BaseAtsAdapter } from './base.adapter';

@Injectable()
export class AshbyAdapter extends BaseAtsAdapter {
  readonly name = 'AshbyAdapter';
  readonly parserType = ParserType.ASHBY;

  supports(company: Company): boolean {
    if (company.parserType === ParserType.ASHBY) return true;
    return !!(
      company.careerPageUrl &&
      (company.careerPageUrl.includes('ashbyhq.com') ||
        company.careerPageUrl.includes('jobs.ashbyhq.com'))
    );
  }

  async scrape(company: Company): Promise<CollectedJobResult> {
    const boardToken = this.extractBoardToken(company.careerPageUrl, company.slug);
    const apiUrl = `https://api.ashbyhq.com/posting-api/job-board/${boardToken}?includeCompensation=true`;

    this.logger.log(`Fetching Ashby jobs from: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'InternTrackerAI-Scraper/1.0',
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(
        `Ashby API request failed with status ${response.status}: ${response.statusText}`,
      );
    }

    const data = (await response.json()) as { jobs?: any[] };
    const rawJobs = data.jobs || [];

    const jobs: CollectedJob[] = rawJobs.map((rawJob) => {
      const locationName = rawJob.locationName || rawJob.location || '';
      const departmentName = rawJob.departmentName || rawJob.department;

      return {
        externalJobId: String(rawJob.id),
        title: this.cleanText(rawJob.title) || 'Untitled Position',
        department: this.cleanText(departmentName),
        employmentType: this.cleanText(rawJob.employmentType),
        location: this.cleanText(locationName),
        workMode: this.inferWorkMode(`${rawJob.title} ${locationName}`),
        experienceLevel: this.inferExperienceLevel(rawJob.title),
        description: rawJob.descriptionHtml || rawJob.descriptionPlain || rawJob.description,
        applicationUrl:
          rawJob.jobUrl || rawJob.applyUrl || `https://jobs.ashbyhq.com/${boardToken}/${rawJob.id}`,
        postedDate: rawJob.publishedAt ? new Date(rawJob.publishedAt) : undefined,
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
