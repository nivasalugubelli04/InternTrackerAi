import { Injectable } from '@nestjs/common';
import type { Company } from '@prisma/client';
import { ParserType } from '@prisma/client';
import * as cheerio from 'cheerio';
import { chromium } from 'playwright';

import type { CollectedJob, CollectedJobResult } from '../interfaces/ats-adapter.interface';

import { BaseAtsAdapter } from './base.adapter';

@Injectable()
export class GenericHtmlAdapter extends BaseAtsAdapter {
  readonly name = 'GenericHtmlAdapter';
  readonly parserType = ParserType.GENERIC_HTML;

  supports(_company: Company): boolean {
    // Acts as default fallback adapter
    return true;
  }

  async scrape(company: Company): Promise<CollectedJobResult> {
    const careerUrl = company.careerPageUrl || company.website;
    if (!careerUrl) {
      throw new Error(`Company ${company.name} has no career page URL or website.`);
    }

    this.logger.log(`Executing Generic HTML scraper for ${company.name} at ${careerUrl}`);

    // First attempt lightweight fetch + cheerio parsing
    try {
      const result = await this.scrapeWithCheerio(careerUrl, company);
      if (result.jobs.length > 0) {
        return result;
      }
    } catch (err) {
      this.logger.warn(
        `Cheerio scrape failed for ${company.name}, falling back to Playwright: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    // Fallback to headless Playwright browser rendering
    return this.scrapeWithPlaywright(careerUrl, company);
  }

  private async scrapeWithCheerio(
    careerUrl: string,
    _company: Company,
  ): Promise<CollectedJobResult> {
    const response = await fetch(careerUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP fetch failed with status ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const jobs: CollectedJob[] = [];
    const rawPayloads: any[] = [];

    // Find links likely to be job listings
    $('a').each((_, el) => {
      const text = $(el).text().trim();
      const href = $(el).attr('href');

      if (text && href && this.isLikelyJobListing(text, href)) {
        const fullUrl = href.startsWith('http') ? href : new URL(href, careerUrl).toString();

        jobs.push({
          title: this.cleanText(text) || 'Untitled Position',
          location: 'See Details',
          workMode: this.inferWorkMode(text),
          experienceLevel: this.inferExperienceLevel(text),
          applicationUrl: fullUrl,
          rawJson: { title: text, href },
        });
        rawPayloads.push({ title: text, href });
      }
    });

    return {
      jobs,
      rawPayloads,
      parserVersion: '1.0.0-cheerio',
    };
  }

  private async scrapeWithPlaywright(
    careerUrl: string,
    _company: Company,
  ): Promise<CollectedJobResult> {
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.goto(careerUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);

      const links = await page.$$eval('a', (elements) =>
        elements.map((el) => ({
          text: el.textContent?.trim() || '',
          href: el.getAttribute('href') || '',
        })),
      );

      const jobs: CollectedJob[] = [];
      const rawPayloads: any[] = [];

      for (const link of links) {
        if (link.text && link.href && this.isLikelyJobListing(link.text, link.href)) {
          const fullUrl = link.href.startsWith('http')
            ? link.href
            : new URL(link.href, careerUrl).toString();

          jobs.push({
            title: this.cleanText(link.text) || 'Untitled Position',
            location: 'See Details',
            workMode: this.inferWorkMode(link.text),
            experienceLevel: this.inferExperienceLevel(link.text),
            applicationUrl: fullUrl,
            rawJson: link,
          });
          rawPayloads.push(link);
        }
      }

      return {
        jobs,
        rawPayloads,
        parserVersion: '1.0.0-playwright',
      };
    } finally {
      await browser.close();
    }
  }

  private isLikelyJobListing(text: string, href: string): boolean {
    const lowerText = text.toLowerCase();
    const lowerHref = href.toLowerCase();

    // Ignore generic non-job navigation links
    if (
      lowerText.includes('home') ||
      lowerText.includes('about us') ||
      lowerText.includes('contact') ||
      lowerText.includes('privacy') ||
      lowerText.includes('terms') ||
      lowerText.includes('login') ||
      lowerText.includes('sign in')
    ) {
      return false;
    }

    const jobKeywords = [
      'intern',
      'co-op',
      'engineer',
      'developer',
      'analyst',
      'designer',
      'manager',
      'associate',
      'specialist',
      'apprentice',
      'fellow',
    ];
    const urlKeywords = ['/job/', '/jobs/', '/career/', '/careers/', '/position/', '/posting/'];

    const matchesText = jobKeywords.some((kw) => lowerText.includes(kw));
    const matchesHref = urlKeywords.some((kw) => lowerHref.includes(kw));

    return matchesText || matchesHref;
  }
}
