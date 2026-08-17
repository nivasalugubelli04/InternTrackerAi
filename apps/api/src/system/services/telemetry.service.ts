import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

export interface ScoreExplanation {
  overallScore: number;
  grade: string;
  breakdown: Record<string, { value: number; weight: number; description: string }>;
}

@Injectable()
export class TelemetryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Computes an explainable Platform Health Score (0 - 100) based on availability,
   * component latencies, queue failure rates, and active incidents.
   */
  async getPlatformScore(): Promise<ScoreExplanation> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // 1. Availability check: proportion of HEALTHY snapshots in the last 24h
    const totalSnapshots = await this.prisma.healthSnapshot.count({
      where: { timestamp: { gte: oneDayAgo } },
    });
    const healthySnapshots = await this.prisma.healthSnapshot.count({
      where: {
        timestamp: { gte: oneDayAgo },
        status: 'HEALTHY',
      },
    });
    const availabilityRate = totalSnapshots > 0 ? (healthySnapshots / totalSnapshots) * 100 : 100;

    // 2. Latency check: average response time of the API and DB components
    const snapshots = await this.prisma.healthSnapshot.findMany({
      where: { timestamp: { gte: oneDayAgo } },
      select: { latency: true, errorRate: true },
    });

    const avgLatency =
      snapshots.length > 0
        ? snapshots.reduce((acc, s) => acc + s.latency, 0) / snapshots.length
        : 5; // fallback baseline 5ms

    // Score latency: 100 if < 50ms, decreasing to 0 at 500ms
    const latencyScore = Math.max(0, Math.min(100, 100 - (avgLatency - 50) / 4.5));

    // 3. Error check: average failure rate across health checks
    const avgErrorRate =
      snapshots.length > 0
        ? snapshots.reduce((acc, s) => acc + s.errorRate, 0) / snapshots.length
        : 0.0;
    const errorRateScore = Math.max(0, 100 - avgErrorRate * 100);

    // 4. Incident penalty: deduct points for active critical incidents
    const activeIncidents = await this.prisma.incident.count({
      where: {
        status: { in: ['DETECTED', 'INVESTIGATING', 'MITIGATING'] },
        severity: { in: ['P0', 'P1'] },
      },
    });
    const incidentPenalty = Math.min(40, activeIncidents * 15); // max 40 points penalty

    // Compute overall score
    const availabilityWeight = 0.4;
    const errorRateWeight = 0.3;
    const latencyWeight = 0.3;

    const rawScore =
      availabilityRate * availabilityWeight +
      errorRateScore * errorRateWeight +
      latencyScore * latencyWeight;
    const overallScore = Math.max(0, Math.min(100, Math.round(rawScore - incidentPenalty)));

    let grade = 'EXCELLENT';
    if (overallScore < 50) grade = 'CRITICAL';
    else if (overallScore < 75) grade = 'DEGRADED';
    else if (overallScore < 90) grade = 'WARNING';

    return {
      overallScore,
      grade,
      breakdown: {
        availability: {
          value: parseFloat(availabilityRate.toFixed(2)),
          weight: availabilityWeight,
          description: 'Percentage of healthy status snapshots in the last 24 hours.',
        },
        errorRate: {
          value: parseFloat(errorRateScore.toFixed(2)),
          weight: errorRateWeight,
          description: 'Deductions based on average error rate during component checks.',
        },
        latency: {
          value: parseFloat(latencyScore.toFixed(2)),
          weight: latencyWeight,
          description: 'Deductions based on component request duration averages.',
        },
        incidentPenalty: {
          value: -incidentPenalty,
          weight: 0, // Deducted from total
          description: 'Deduction for active high-severity operational incidents.',
        },
      },
    };
  }

  /**
   * Computes a Data Quality Score based on scraper completions, fields completeness,
   * parsing failure trends, and duplicates rate.
   */
  async getDataQualityScore(): Promise<ScoreExplanation> {
    // 1. Fetch completeness metrics from active JobPostings
    const totalJobs = await this.prisma.jobPosting.count();

    // Check missing core fields
    const missingTitle = await this.prisma.jobPosting.count({
      where: { OR: [{ title: '' }, { title: null as any }] },
    });
    const missingDesc = await this.prisma.jobPosting.count({
      where: { OR: [{ description: '' }, { description: null as any }] },
    });
    const missingLocation = await this.prisma.jobPosting.count({
      where: { OR: [{ location: '' }, { location: null as any }] },
    });

    const completenessVal =
      totalJobs > 0
        ? ((totalJobs * 3 - (missingTitle + missingDesc + missingLocation)) / (totalJobs * 3)) * 100
        : 100;

    // 2. Parser health metrics
    const parserHealths = await this.prisma.parserHealth.findMany();
    const averageSuccessRate =
      parserHealths.length > 0
        ? parserHealths.reduce((acc, ph) => acc + ph.successRate, 0) / parserHealths.length
        : 100.0;

    // 3. Stale company rate
    const totalCompanies = await this.prisma.company.count({ where: { isActive: true } });
    const staleThresholdDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours stale
    const freshCompanies = await this.prisma.company.count({
      where: {
        isActive: true,
        lastCheckedAt: { gte: staleThresholdDate },
      },
    });
    const freshnessVal = totalCompanies > 0 ? (freshCompanies / totalCompanies) * 100 : 100;

    const completenessWeight = 0.4;
    const successRateWeight = 0.3;
    const freshnessWeight = 0.3;

    const rawScore =
      completenessVal * completenessWeight +
      averageSuccessRate * successRateWeight +
      freshnessVal * freshnessWeight;
    const overallScore = Math.round(rawScore);

    let grade = 'GOOD';
    if (overallScore < 60) grade = 'POOR';
    else if (overallScore < 85) grade = 'FAIR';

    return {
      overallScore,
      grade,
      breakdown: {
        completeness: {
          value: parseFloat(completenessVal.toFixed(2)),
          weight: completenessWeight,
          description:
            'Degree to which core fields (title, description, location) are fully populated.',
        },
        parserSuccess: {
          value: parseFloat(averageSuccessRate.toFixed(2)),
          weight: successRateWeight,
          description: 'Historical moving average of successful parses versus syntax exceptions.',
        },
        freshness: {
          value: parseFloat(freshnessVal.toFixed(2)),
          weight: freshnessWeight,
          description: 'Percentage of active company indexes updated in the last 24 hours.',
        },
      },
    };
  }
}
