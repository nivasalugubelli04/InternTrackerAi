import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

export interface ScraperTelemetry {
  companyId: string;
  companyName: string;
  status: 'HEALTHY' | 'DEGRADED' | 'FAILING' | 'BLOCKED' | 'STALE' | 'DISABLED' | 'UNKNOWN';
  lastRun: Date | null;
  lastSuccess: Date | null;
  successRate: number;
  avgDurationMs: number;
  jobsFound: number;
  jobsParsed: number;
  duplicateRate: number;
  lastError: string | null;
}

@Injectable()
export class ScraperObserverService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Evaluates scraper health status metrics and maps each active scraper.
   */
  async getScrapersStatus(): Promise<ScraperTelemetry[]> {
    const activeCompanies = await this.prisma.company.findMany({
      where: { isActive: true },
      include: {
        parserHealth: true,
        scrapeJobs: {
          orderBy: { startedAt: 'desc' },
          take: 5,
        },
      },
    });

    const now = new Date();
    const staleLimitMs = 24 * 60 * 60 * 1000; // 24 hours default threshold

    const telemetries: ScraperTelemetry[] = [];

    for (const company of activeCompanies) {
      const ph = company.parserHealth;
      const recentJobs = company.scrapeJobs;
      const lastJob = recentJobs[0] || null;

      const lastRun = lastJob?.startedAt || null;
      const lastSuccess = ph?.lastSuccess || null;
      const successRate = ph?.successRate ?? 100;
      const avgDurationMs = ph?.averageRuntime ?? 0;
      const jobsFound = lastJob?.jobsFound ?? 0;
      const jobsParsed = lastJob?.jobsAdded ?? 0;
      let duplicateRate = 0.0;
      const lastError = lastJob?.errorMessage || null;

      if (lastJob && lastJob.jobsFound > 0) {
        // Simple duplicates rate calculation
        const duplicates = lastJob.jobsFound - lastJob.jobsAdded;
        duplicateRate = parseFloat(((duplicates / lastJob.jobsFound) * 100).toFixed(2));
      }

      // Status mapping rules
      let status: ScraperTelemetry['status'] = 'HEALTHY';

      if (!lastJob) {
        status = 'UNKNOWN';
      } else {
        const isStale = lastSuccess && now.getTime() - lastSuccess.getTime() > staleLimitMs;
        const failedScrapesCount = recentJobs.filter((j) => j.status === 'FAILED').length;

        if (
          lastJob.errorMessage?.toLowerCase().includes('block') ||
          lastJob.errorMessage?.toLowerCase().includes('captcha')
        ) {
          status = 'BLOCKED';
        } else if (successRate < 50 || failedScrapesCount >= 4) {
          status = 'FAILING';
        } else if (successRate < 85 || failedScrapesCount >= 2) {
          status = 'DEGRADED';
        } else if (isStale) {
          status = 'STALE';
        }
      }

      telemetries.push({
        companyId: company.id,
        companyName: company.name,
        status,
        lastRun,
        lastSuccess,
        successRate,
        avgDurationMs,
        jobsFound,
        jobsParsed,
        duplicateRate,
        lastError,
      });
    }

    return telemetries;
  }

  /**
   * Scans parser anomalies and checks for DOM structure changes.
   * If parsing error rates spike, reports degradation warning.
   */
  async detectParserAnomalies(
    companyId: string,
  ): Promise<{ isAnomaly: boolean; details?: string }> {
    const recentFailedJobs = await this.prisma.scrapeJob.findMany({
      where: {
        companyId,
        status: 'FAILED',
      },
      orderBy: { startedAt: 'desc' },
      take: 5,
    });

    if (recentFailedJobs.length >= 3) {
      // Analyze error messages
      const errorsList = recentFailedJobs.map((j) => j.errorMessage || '');
      const domErrorCount = errorsList.filter(
        (e) =>
          e.includes('missing') ||
          e.includes('DOM') ||
          e.includes('selector') ||
          e.includes('undefined') ||
          e.includes('cannot read property'),
      ).length;

      if (domErrorCount >= 2) {
        return {
          isAnomaly: true,
          details: `Possible HTML Schema change or selector disappearance detected. Errors encountered: ${errorsList.join('; ')}`,
        };
      }
    }

    return { isAnomaly: false };
  }
}
