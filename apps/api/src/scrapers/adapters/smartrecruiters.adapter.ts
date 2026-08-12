import { Injectable } from '@nestjs/common';
import type { Company } from '@prisma/client';
import { ParserType } from '@prisma/client';

import type { CollectedJob, CollectedJobResult } from '../interfaces/ats-adapter.interface';

import { BaseAtsAdapter } from './base.adapter';

@Injectable()
export class SmartRecruitersAdapter extends BaseAtsAdapter {
  readonly name = 'SmartRecruitersAdapter';
  readonly parserType = ParserType.SMARTRECRUITERS;

  supports(company: Company): boolean {
    if (company.parserType === ParserType.SMARTRECRUITERS) return true;
    return !!(company.careerPageUrl && company.careerPageUrl.includes('smartrecruiters.com'));
  }

  async scrape(company: Company): Promise<CollectedJobResult> {
    const companyToken = this.extractBoardToken(company.careerPageUrl, company.slug);
    const apiUrl = `https://api.smartrecruiters.com/v1/companies/${companyToken}/postings?limit=100`;

    this.logger.log(`Fetching SmartRecruiters jobs from: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'InternTrackerAI-Scraper/1.0',
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(
        `SmartRecruiters API request failed with status ${response.status}: ${response.statusText}`,
      );
    }

    const data = (await response.json()) as { content?: any[] };
    const rawJobs = data.content || [];

    const jobs: CollectedJob[] = rawJobs.map((rawJob) => {
      const loc = rawJob.location || {};
      const locationName = [loc.city, loc.region, loc.country].filter(Boolean).join(', ');

      return {
        externalJobId: String(rawJob.id || rawJob.refNumber),
        title: this.cleanText(rawJob.name) || 'Untitled Position',
        department: this.cleanText(rawJob.department?.label),
        employmentType: this.cleanText(rawJob.typeOfEmployment?.label),
        location: this.cleanText(locationName),
        workMode: this.inferWorkMode(`${rawJob.name} ${locationName}`),
        experienceLevel: this.inferExperienceLevel(rawJob.name),
        applicationUrl: `https://jobs.smartrecruiters.com/${companyToken}/${rawJob.id}`,
        postedDate: rawJob.releasedDate ? new Date(rawJob.releasedDate) : undefined,
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
