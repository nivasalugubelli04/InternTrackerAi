import { InjectQueue } from '@nestjs/bullmq';
import type { OnApplicationBootstrap } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';

import { PrismaService } from '../../prisma/prisma.service';
import { SCRAPE_QUEUE } from '../queue.constants';

@Injectable()
export class ScrapeSchedulerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ScrapeSchedulerService.name);

  constructor(
    @InjectQueue(SCRAPE_QUEUE) private readonly scrapeQueue: Queue,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    const intervalMs = this.configService.get<number>('scrapers.intervalMs', 21600000);
    this.logger.log(
      `Registering repeatable scraping schedule every ${intervalMs / 1000 / 60} minutes.`,
    );

    await this.scrapeQueue.add(
      'periodic-scrape-trigger',
      { triggerAll: true },
      {
        repeat: {
          every: intervalMs,
        },
        removeOnComplete: true,
      },
    );
  }

  /**
   * Triggers scrape job for a specific company by ID.
   */
  async triggerScrapeCompany(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new Error(`Company ${companyId} not found.`);
    }

    const job = await this.scrapeQueue.add(
      `scrape-${company.slug}`,
      { companyId: company.id },
      {
        jobId: `scrape-${company.id}-${new Date().toISOString().split('T')[0]}`,
        attempts: this.configService.get<number>('scrapers.retryCount', 3),
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    );

    this.logger.log(`Pushed manual scrape job ${job.id} for company ${company.name}`);
    return { jobId: job.id, companyId: company.id, status: 'QUEUED' };
  }

  /**
   * Triggers scrape jobs for all active companies in the system.
   */
  async triggerScrapeAllCompanies() {
    const companies = await this.prisma.company.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true },
    });

    this.logger.log(`Queuing scrape jobs for ${companies.length} active companies.`);

    const queuedJobs = [];
    for (const company of companies) {
      const job = await this.scrapeQueue.add(
        `scrape-${company.slug}`,
        { companyId: company.id },
        {
          jobId: `scrape-${company.id}-${new Date().toISOString().split('T')[0]}`,
          attempts: this.configService.get<number>('scrapers.retryCount', 3),
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: 100,
          removeOnFail: 200,
        },
      );
      queuedJobs.push({ jobId: job.id, companyId: company.id, companyName: company.name });
    }

    return {
      queuedCount: queuedJobs.length,
      jobs: queuedJobs,
    };
  }
}
