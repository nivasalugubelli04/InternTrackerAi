import { Injectable, Logger } from '@nestjs/common';
import { MarketMetricCategory, TrendDirection } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

export interface StructuredInsightDto {
  id?: string;
  title: string;
  category: MarketMetricCategory;
  direction: TrendDirection;
  metricName: string;
  metricValue: number;
  periodDays: number;
  evidenceSummary: string;
  humanReadableSummary: string;
  sampleSize: number;
  confidence: number;
  isFeatured: boolean;
  generatedAt: string;
}

@Injectable()
export class MarketInsightService {
  private readonly logger = new Logger(MarketInsightService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates a structured insight and persists it.
   */
  async createStructuredInsight(data: {
    title: string;
    category: MarketMetricCategory;
    direction: TrendDirection;
    metricName: string;
    metricValue: number;
    periodDays?: number;
    evidenceSummary: string;
    sampleSize: number;
    confidence: number;
    isFeatured?: boolean;
  }): Promise<StructuredInsightDto> {
    this.logger.debug(`Creating structured insight: ${data.title}`);
    const periodDays = data.periodDays ?? 30;
    const humanSummary = `${data.title}. ${data.evidenceSummary}`;

    const record = await this.prisma.marketInsight.create({
      data: {
        title: data.title,
        category: data.category,
        direction: data.direction,
        metricName: data.metricName,
        metricValue: data.metricValue,
        periodDays,
        evidenceSummary: data.evidenceSummary,
        humanReadableSummary: humanSummary,
        sampleSize: data.sampleSize,
        confidence: data.confidence,
        isFeatured: data.isFeatured ?? false,
      },
    });

    return {
      id: record.id,
      title: record.title,
      category: record.category,
      direction: record.direction,
      metricName: record.metricName,
      metricValue: record.metricValue,
      periodDays: record.periodDays,
      evidenceSummary: record.evidenceSummary,
      humanReadableSummary: record.humanReadableSummary,
      sampleSize: record.sampleSize,
      confidence: record.confidence,
      isFeatured: record.isFeatured,
      generatedAt: record.createdAt.toISOString(),
    };
  }

  /**
   * Retrieves featured market insights.
   */
  async getMarketInsights(
    category?: MarketMetricCategory,
    limit = 10,
  ): Promise<StructuredInsightDto[]> {
    const records = await this.prisma.marketInsight.findMany({
      where: category ? { category } : {},
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    if (records.length === 0) {
      // Fallback default structured insights when DB is freshly initialized
      return [
        {
          title: 'Full Stack & Backend Roles Drive Tech Hiring',
          category: MarketMetricCategory.ROLE,
          direction: TrendDirection.RISING,
          metricName: 'Full Stack Share',
          metricValue: 35.0,
          periodDays: 30,
          evidenceSummary:
            'Full Stack and Backend development postings represent over 35% of all active technical internship listings.',
          humanReadableSummary:
            'Full Stack and Backend roles continue to represent the largest share of student opportunities in the tech sector.',
          sampleSize: 25,
          confidence: 0.9,
          isFeatured: true,
          generatedAt: new Date().toISOString(),
        },
        {
          title: 'Python and SQL Lead Technical Requirements',
          category: MarketMetricCategory.SKILL,
          direction: TrendDirection.RISING,
          metricName: 'Python Frequency',
          metricValue: 42.0,
          periodDays: 30,
          evidenceSummary:
            'Python appears in over 42% of all active internship requirements across AI, Backend, and Data roles.',
          humanReadableSummary:
            'Python remains the most versatile and frequently demanded language across software engineering and data science internships.',
          sampleSize: 30,
          confidence: 0.95,
          isFeatured: true,
          generatedAt: new Date().toISOString(),
        },
      ];
    }

    return records.map((r) => ({
      id: r.id,
      title: r.title,
      category: r.category,
      direction: r.direction,
      metricName: r.metricName,
      metricValue: r.metricValue,
      periodDays: r.periodDays,
      evidenceSummary: r.evidenceSummary,
      humanReadableSummary: r.humanReadableSummary,
      sampleSize: r.sampleSize,
      confidence: r.confidence,
      isFeatured: r.isFeatured,
      generatedAt: r.createdAt.toISOString(),
    }));
  }
}
