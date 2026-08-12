import { Injectable } from '@nestjs/common';
import type { Company } from '@prisma/client';
import { ParserType } from '@prisma/client';
import { chromium } from 'playwright';

import type { CollectedJob, CollectedJobResult } from '../interfaces/ats-adapter.interface';

import { BaseAtsAdapter } from './base.adapter';

@Injectable()
export class WorkdayAdapter extends BaseAtsAdapter {
  readonly name = 'WorkdayAdapter';
  readonly parserType = ParserType.WORKDAY;

  supports(company: Company): boolean {
    if (company.parserType === ParserType.WORKDAY) return true;
    return !!(
      company.careerPageUrl &&
      (company.careerPageUrl.includes('myworkdayjobs.com') ||
        company.careerPageUrl.includes('workday.com'))
    );
  }

  async scrape(company: Company): Promise<CollectedJobResult> {
    const careerUrl = company.careerPageUrl;
    if (!careerUrl) {
      throw new Error(`Company ${company.name} has no career page URL for Workday scraping.`);
    }

    // Try Workday CXS JSON API first
    try {
      const apiResult = await this.tryWorkdayApi(careerUrl, company);
      if (apiResult && apiResult.jobs.length > 0) {
        return apiResult;
      }
    } catch (err) {
      this.logger.warn(
        `Workday CXS API failed for ${company.name}, falling back to Playwright rendering: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    // Fallback to Playwright DOM scraping
    return this.scrapeWithPlaywright(careerUrl, company);
  }

  private async tryWorkdayApi(
    careerUrl: string,
    _company: Company,
  ): Promise<CollectedJobResult | null> {
    const urlObj = new URL(careerUrl);
    const host = urlObj.host;
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    const boardName = pathParts[0] || 'careers';
    const tenant = host.split('.')[0];

    const apiUrl = `https://${host}/wday/cxs/${tenant}/${boardName}/jobs`;
    this.logger.log(`Trying Workday CXS API endpoint: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        appliedFacets: {},
        limit: 50,
        offset: 0,
        searchText: '',
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as { jobPostings?: any[] };
    const rawJobs = data.jobPostings || [];

    const jobs: CollectedJob[] = rawJobs.map((rawJob) => {
      const title = rawJob.title || 'Untitled Position';
      const externalJobId = rawJob.bulletFields?.[0] || rawJob.jobPostingId || rawJob.externalPath;
      const location = rawJob.locationsText || rawJob.location || '';
      const fullUrl = rawJob.externalPath ? `https://${host}${rawJob.externalPath}` : careerUrl;

      return {
        externalJobId: String(externalJobId),
        title: this.cleanText(title) || 'Untitled Position',
        location: this.cleanText(location),
        workMode: this.inferWorkMode(`${title} ${location}`),
        experienceLevel: this.inferExperienceLevel(title),
        postedDate: rawJob.postedOn ? new Date(rawJob.postedOn) : undefined,
        applicationUrl: fullUrl,
        rawJson: rawJob,
      };
    });

    return {
      jobs,
      rawPayloads: rawJobs,
      parserVersion: '1.0.0',
    };
  }

  private async scrapeWithPlaywright(
    careerUrl: string,
    _company: Company,
  ): Promise<CollectedJobResult> {
    this.logger.log(`Launching Playwright for Workday career page: ${careerUrl}`);
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.goto(careerUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);

      const jobElements = await page.$$('[data-automation-id="jobTitle"], a[href*="/job/"]');

      const jobs: CollectedJob[] = [];
      const rawPayloads: any[] = [];

      for (const el of jobElements) {
        const titleText = (await el.textContent())?.trim();
        const href = await el.getAttribute('href');

        if (titleText && titleText.length > 2) {
          const fullUrl = href
            ? href.startsWith('http')
              ? href
              : new URL(href, careerUrl).toString()
            : careerUrl;
          const workMode = this.inferWorkMode(titleText);
          jobs.push({
            title: this.cleanText(titleText) || 'Untitled Position',
            location: 'Workday Location',
            ...(workMode ? { workMode } : {}),
            experienceLevel: this.inferExperienceLevel(titleText),
            applicationUrl: fullUrl,
            rawJson: { title: titleText, href },
          });
          rawPayloads.push({ title: titleText, href });
        }
      }

      return {
        jobs,
        htmlSnapshotUrl: careerUrl,
        rawPayloads,
        parserVersion: '1.0.0-playwright',
      };
    } finally {
      await browser.close();
    }
  }
}
