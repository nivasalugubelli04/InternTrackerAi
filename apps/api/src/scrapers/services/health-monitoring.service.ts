import { Injectable, Logger } from '@nestjs/common';
import { ScrapeJobStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class HealthMonitoringService {
  private readonly logger = new Logger(HealthMonitoringService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new ScrapeJob record at the start of execution.
   */
  async startScrapeJob(companyId: string): Promise<string> {
    const job = await this.prisma.scrapeJob.create({
      data: {
        companyId,
        startedAt: new Date(),
        status: ScrapeJobStatus.RUNNING,
      },
    });
    return job.id;
  }

  /**
   * Finalizes a ScrapeJob record upon completion or failure.
   */
  async finishScrapeJob(
    scrapeJobId: string,
    status: ScrapeJobStatus,
    metrics: {
      jobsFound: number;
      jobsAdded: number;
      jobsUpdated: number;
      jobsRemoved?: number;
      durationMs: number;
      errorMessage?: string;
    },
  ): Promise<void> {
    try {
      await this.prisma.scrapeJob.update({
        where: { id: scrapeJobId },
        data: {
          completedAt: new Date(),
          status,
          jobsFound: metrics.jobsFound,
          jobsAdded: metrics.jobsAdded,
          jobsUpdated: metrics.jobsUpdated,
          jobsRemoved: metrics.jobsRemoved || 0,
          durationMs: metrics.durationMs,
          errorMessage: metrics.errorMessage || null,
        },
      });
    } catch (err) {
      this.logger.error(
        `Failed to update ScrapeJob ${scrapeJobId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * Recalculates and updates telemetry in ParserHealth.
   */
  async recordParserHealth(
    companyId: string,
    parserName: string,
    isSuccess: boolean,
    durationMs: number,
  ): Promise<void> {
    try {
      const existing = await this.prisma.parserHealth.findUnique({
        where: { companyId },
      });

      const now = new Date();

      if (!existing) {
        await this.prisma.parserHealth.create({
          data: {
            companyId,
            parserName,
            successRate: isSuccess ? 100.0 : 0.0,
            lastSuccess: isSuccess ? now : null,
            lastFailure: isSuccess ? null : now,
            averageRuntime: durationMs,
          },
        });
      } else {
        const newAverageRuntime = Math.round((existing.averageRuntime + durationMs) / 2);
        // Compute moving average for success rate
        const currentRate = existing.successRate;
        const newRate = isSuccess
          ? Math.min(100, currentRate * 0.9 + 10)
          : Math.max(0, currentRate * 0.9);

        await this.prisma.parserHealth.update({
          where: { companyId },
          data: {
            parserName,
            successRate: parseFloat(newRate.toFixed(2)),
            averageRuntime: newAverageRuntime,
            ...(isSuccess ? { lastSuccess: now } : { lastFailure: now }),
            updatedAt: now,
          },
        });
      }
    } catch (err) {
      this.logger.error(
        `Failed to record ParserHealth for company ${companyId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * Retrieves overall scraper health status.
   */
  async getOverallStatus() {
    const totalCompanies = await this.prisma.company.count({ where: { isActive: true } });
    const healthRecords = await this.prisma.parserHealth.findMany();
    const recentScrapeJobs = await this.prisma.scrapeJob.findMany({
      orderBy: { startedAt: 'desc' },
      take: 50,
    });

    const averageSuccessRate = healthRecords.length
      ? healthRecords.reduce((acc, h) => acc + h.successRate, 0) / healthRecords.length
      : 100.0;

    return {
      activeCompaniesCount: totalCompanies,
      parsersTrackedCount: healthRecords.length,
      averageSuccessRate: parseFloat(averageSuccessRate.toFixed(2)),
      recentJobsCount: recentScrapeJobs.length,
      healthRecords,
    };
  }
}
