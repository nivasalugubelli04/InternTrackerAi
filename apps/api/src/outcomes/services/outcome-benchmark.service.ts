/**
 * OutcomeBenchmarkService
 *
 * Computes and serves platform-wide benchmark values for key outcome metrics.
 *
 * Privacy Rules:
 *  - Benchmarks are only computed when total sample size ≥ 50 (OUTCOME_BENCHMARK_MIN_N).
 *  - Individual user data is never exposed — only aggregate statistics.
 *  - Benchmark values are stored in OutcomeBenchmark table.
 *  - User comparison returns: ABOVE_BENCHMARK | AT_BENCHMARK | BELOW_BENCHMARK | INSUFFICIENT_DATA
 *
 * Methodology:
 *  - Benchmark value = platform median for the metric
 *  - p25/p75 provide spread context
 *  - Compared against most recent 30-day window
 */
import { Injectable, Logger } from '@nestjs/common';
import { OutcomeConfidenceLevel } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

const BENCHMARK_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

export type BenchmarkComparison =
  | 'ABOVE_BENCHMARK'
  | 'AT_BENCHMARK'
  | 'BELOW_BENCHMARK'
  | 'INSUFFICIENT_DATA';

export interface BenchmarkResult {
  metricKey: string;
  benchmark: number | null;
  p25: number | null;
  p75: number | null;
  sampleSize: number;
  confidence: OutcomeConfidenceLevel;
  periodStart: Date;
  periodEnd: Date;
}

export interface UserBenchmarkComparison {
  metricKey: string;
  userValue: number | null;
  benchmark: number | null;
  comparison: BenchmarkComparison;
  confidence: OutcomeConfidenceLevel;
  note: string;
}

@Injectable()
export class OutcomeBenchmarkService {
  private readonly logger = new Logger(OutcomeBenchmarkService.name);
  private readonly minN: number;

  // Simple in-memory cache (refreshed by background job)
  private cache: { data: BenchmarkResult[]; cachedAt: number } | null = null;

  constructor(
    private readonly prisma: PrismaService,
  ) {
    this.minN = parseInt(process.env['OUTCOME_BENCHMARK_MIN_N'] ?? '50', 10);
  }

  private percentile(sorted: number[], p: number): number | null {
    if (sorted.length === 0) return null;
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(idx, sorted.length - 1))] ?? null;
  }

  /**
   * Recompute all platform benchmarks. Called by background job.
   */
  async recomputeAll(): Promise<void> {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 30);

    this.logger.log('Recomputing platform benchmarks...');

    // Collect all users who applied in last 30 days
    const activeUsers = await this.prisma.application.findMany({
      where: { appliedAt: { gte: start, lte: end } },
      select: { userId: true, status: true },
      distinct: ['userId'],
    });

    if (activeUsers.length < this.minN) {
      this.logger.warn(
        `Insufficient sample size for benchmarks: ${activeUsers.length} < ${this.minN}`,
      );
      return;
    }

    const activeUserIds = activeUsers.map((u) => u.userId);

    // Compute individual funnel metrics for all users
    const interviewRates: number[] = [];
    const offerRates: number[] = [];
    const timeToHire: number[] = [];

    // Batch process
    const BATCH_SIZE = 500;
    for (let i = 0; i < activeUserIds.length; i += BATCH_SIZE) {
      const batch = activeUserIds.slice(i, i + BATCH_SIZE);
      const appStats = await this.prisma.application.groupBy({
        by: ['userId', 'status'],
        where: { userId: { in: batch } },
        _count: true,
      });

      const userMap: Record<string, Record<string, number>> = {};
      for (const s of appStats) {
        if (!userMap[s.userId]) userMap[s.userId] = {};
        const userObj = userMap[s.userId];
        if (userObj) {
          userObj[s.status] = s._count;
        }
      }

      for (const statuses of Object.values(userMap)) {
        const apps = Object.values(statuses).reduce((a, b) => a + b, 0);
        const interviews = statuses['INTERVIEW'] ?? 0;
        const offers = statuses['OFFER'] ?? 0;
        if (apps > 0) interviewRates.push(interviews / apps);
        if (interviews > 0) offerRates.push(offers / interviews);
      }
    }

    // Time to hire
    const offers = await this.prisma.offer.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        acceptedAt: { not: null },
      },
      select: { createdAt: true, acceptedAt: true },
      take: 5000,
    });
    for (const o of offers) {
      if (o.acceptedAt) {
        const hours = Math.abs(o.acceptedAt.getTime() - o.createdAt.getTime()) / 3600000;
        timeToHire.push(hours);
      }
    }

    // Store benchmarks
    const metrics: Array<{ key: string; values: number[] }> = [
      { key: 'interviewConversionRate', values: interviewRates },
      { key: 'offerConversionRate', values: offerRates },
      { key: 'medianTimeToHireHours', values: timeToHire },
    ];

    for (const m of metrics) {
      if (m.values.length < this.minN) continue;
      const sorted = [...m.values].sort((a, b) => a - b);
      const median = this.percentile(sorted, 50) ?? 0;
      const p25 = this.percentile(sorted, 25);
      const p75 = this.percentile(sorted, 75);
      const confidence = this.getConfidence(m.values.length);

      await this.prisma.outcomeBenchmark.upsert({
        where: {
          metricKey_dimension_periodStart: {
            metricKey: m.key,
            dimension: '', // use empty string for platform wide (dimension null unique input bug fix)
            periodStart: start,
          },
        },
        create: {
          metricKey: m.key,
          dimension: '',
          value: median,
          p25,
          p75,
          sampleSize: m.values.length,
          periodStart: start,
          periodEnd: end,
          confidence,
        },
        update: {
          value: median,
          p25,
          p75,
          sampleSize: m.values.length,
          confidence,
          generatedAt: new Date(),
        },
      });
    }

    // Invalidate in-memory cache
    this.cache = null;
    this.logger.log('Benchmark recomputation complete.');
  }

  /**
   * Fetch latest benchmarks (in-memory cached for 6h).
   */
  async getLatestBenchmarks(): Promise<BenchmarkResult[]> {
    if (this.cache && Date.now() - this.cache.cachedAt < BENCHMARK_TTL_MS) {
      return this.cache.data;
    }

    const records = await this.prisma.outcomeBenchmark.findMany({
      where: { dimension: '' },
      orderBy: { periodStart: 'desc' },
      take: 10,
    });

    // Deduplicate by metricKey (keep latest)
    const seen = new Set<string>();
    const deduped = records.filter((r) => {
      if (seen.has(r.metricKey)) return false;
      seen.add(r.metricKey);
      return true;
    });

    const result: BenchmarkResult[] = deduped.map((r) => ({
      metricKey: r.metricKey,
      benchmark: r.value,
      p25: r.p25,
      p75: r.p75,
      sampleSize: r.sampleSize,
      confidence: r.confidence,
      periodStart: r.periodStart,
      periodEnd: r.periodEnd,
    }));

    this.cache = { data: result, cachedAt: Date.now() };
    return result;
  }

  /**
   * Compare a user's metric value against the platform benchmark.
   */
  async compareUserToBenchmark(
    _userId: string,
    metricKey: string,
    userValue: number | null,
  ): Promise<UserBenchmarkComparison> {
    const benchmark = await this.prisma.outcomeBenchmark.findFirst({
      where: { metricKey, dimension: '' },
      orderBy: { periodStart: 'desc' },
    });

    if (!benchmark || benchmark.sampleSize < this.minN || userValue === null) {
      return {
        metricKey,
        userValue,
        benchmark: null,
        comparison: 'INSUFFICIENT_DATA',
        confidence: OutcomeConfidenceLevel.INSUFFICIENT_DATA,
        note: `Benchmark for ${metricKey} is not yet available (requires ≥ ${this.minN} users).`,
      };
    }

    let comparison: BenchmarkComparison;
    const diff = userValue - benchmark.value;
    const threshold = benchmark.value * 0.05;

    if (diff > threshold) comparison = 'ABOVE_BENCHMARK';
    else if (diff < -threshold) comparison = 'BELOW_BENCHMARK';
    else comparison = 'AT_BENCHMARK';

    return {
      metricKey,
      userValue,
      benchmark: benchmark.value,
      comparison,
      confidence: benchmark.confidence,
      note: `Your ${metricKey} is compared against the current platform benchmark (n=${benchmark.sampleSize}).`,
    };
  }

  private getConfidence(n: number): OutcomeConfidenceLevel {
    if (n >= 100) return OutcomeConfidenceLevel.HIGH;
    if (n >= 30) return OutcomeConfidenceLevel.MEDIUM;
    return OutcomeConfidenceLevel.LOW;
  }
}
