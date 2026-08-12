import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ScrapeJobStatus } from '@prisma/client';
import type { Job } from 'bullmq';

import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../../prisma/prisma.service';
import { ScraperManager } from '../../scrapers/scraper.manager';
import { DeduplicationService } from '../../scrapers/services/deduplication.service';
import { HealthMonitoringService } from '../../scrapers/services/health-monitoring.service';
import { NormalizerService } from '../../scrapers/services/normalizer.service';
import { SCRAPE_QUEUE } from '../queue.constants';

export interface ScrapeJobPayload {
  companyId: string;
}

@Processor(SCRAPE_QUEUE)
export class ScrapeProcessor extends WorkerHost {
  private readonly logger = new Logger(ScrapeProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scraperManager: ScraperManager,
    private readonly normalizerService: NormalizerService,
    private readonly deduplicationService: DeduplicationService,
    private readonly healthMonitoringService: HealthMonitoringService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async process(job: Job<ScrapeJobPayload>): Promise<any> {
    const { companyId } = job.data;
    const startTime = Date.now();

    this.logger.log(`Starting scrape job ${job.id} for company ${companyId}`);

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new Error(`Company with ID ${companyId} not found.`);
    }

    if (!company.isActive) {
      this.logger.warn(`Company ${company.name} is inactive. Skipping scrape.`);
      return { skipped: true, reason: 'Company inactive' };
    }

    const scrapeJobId = await this.healthMonitoringService.startScrapeJob(companyId);
    const adapter = this.scraperManager.getAdapterForCompany(company);

    try {
      this.logger.log(`Executing adapter ${adapter.name} for company ${company.name}`);
      const timeoutMs = this.configService.get<number>('scrapers.timeoutMs') ?? 60000;

      const scrapePromise = adapter.scrape(company);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error(`Scrape adapter timeout after ${timeoutMs}ms`)),
          timeoutMs,
        );
      });

      const scrapedResult = await Promise.race([scrapePromise, timeoutPromise]);

      const normalizedJobs = scrapedResult.jobs.map((j) =>
        this.normalizerService.normalize(company.id, j, adapter.parserType),
      );

      const dedupResult = await this.deduplicationService.processJobPostings(
        company.id,
        normalizedJobs,
      );

      if (scrapedResult.rawPayloads && scrapedResult.rawPayloads.length > 0) {
        await this.deduplicationService.saveRawJobPosting(
          company.id,
          scrapedResult.rawPayloads,
          scrapedResult.htmlSnapshotUrl,
          scrapedResult.parserVersion,
        );
      }

      const durationMs = Date.now() - startTime;

      await this.healthMonitoringService.finishScrapeJob(scrapeJobId, ScrapeJobStatus.COMPLETED, {
        jobsFound: scrapedResult.jobs.length,
        jobsAdded: dedupResult.added,
        jobsUpdated: dedupResult.updated,
        durationMs,
      });

      await this.healthMonitoringService.recordParserHealth(
        companyId,
        adapter.name,
        true,
        durationMs,
      );

      await this.prisma.company.update({
        where: { id: companyId },
        data: { lastCheckedAt: new Date() },
      });

      return {
        success: true,
        jobsFound: scrapedResult.jobs.length,
        added: dedupResult.added,
        updated: dedupResult.updated,
        unchanged: dedupResult.unchanged,
        durationMs,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const durationMs = Date.now() - startTime;

      this.logger.error(
        `Scrape failed for company ${company.name} (${companyId}): ${errorMessage}`,
      );

      await this.healthMonitoringService.finishScrapeJob(scrapeJobId, ScrapeJobStatus.FAILED, {
        jobsFound: 0,
        jobsAdded: 0,
        jobsUpdated: 0,
        durationMs,
        errorMessage,
      });

      await this.healthMonitoringService.recordParserHealth(
        companyId,
        adapter.name,
        false,
        durationMs,
      );

      throw err;
    }
  }
}
