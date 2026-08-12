import { Injectable } from '@nestjs/common';
import type { Company } from '@prisma/client';
import { ParserType } from '@prisma/client';

import type { CollectedJob, CollectedJobResult } from '../interfaces/ats-adapter.interface';

import { BaseAtsAdapter } from './base.adapter';

@Injectable()
export class GreenhouseAdapter extends BaseAtsAdapter {
  readonly name = 'GreenhouseAdapter';
  readonly parserType = ParserType.GREENHOUSE;

  supports(company: Company): boolean {
    if (company.parserType === ParserType.GREENHOUSE) return true;
    return !!(company.careerPageUrl && company.careerPageUrl.includes('greenhouse.io'));
  }

  async scrape(company: Company): Promise<CollectedJobResult> {
    const boardToken = this.extractBoardToken(company.careerPageUrl, company.slug);
    const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs?content=true`;

    this.logger.log(`Fetching Greenhouse jobs from: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'InternTrackerAI-Scraper/1.0',
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(
        `Greenhouse API request failed with status ${response.status}: ${response.statusText}`,
      );
    }

    const data = (await response.json()) as { jobs?: any[] };
    const rawJobs = data.jobs || [];

    const jobs: CollectedJob[] = rawJobs.map((rawJob) => {
      const locationName = rawJob.location?.name ?? '';
      const departmentName =
        rawJob.departments && rawJob.departments.length > 0
          ? rawJob.departments[0].name
          : undefined;

      return {
        externalJobId: String(rawJob.id),
        title: this.cleanText(rawJob.title) || 'Untitled Position',
        department: this.cleanText(departmentName),
        location: this.cleanText(locationName),
        workMode: this.inferWorkMode(`${rawJob.title} ${locationName}`),
        experienceLevel: this.inferExperienceLevel(rawJob.title),
        description: rawJob.content,
        applicationUrl: rawJob.absolute_url || `${company.careerPageUrl}#${rawJob.id}`,
        postedDate: rawJob.updated_at ? new Date(rawJob.updated_at) : undefined,
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
