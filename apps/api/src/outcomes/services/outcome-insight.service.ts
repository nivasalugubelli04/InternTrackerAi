/**
 * OutcomeInsightService
 *
 * Generates evidence-based career insights using the existing AiModule.
 *
 * Architecture (enforced by design):
 *
 *   Raw Outcome Data
 *         ↓
 *   Verified Metrics (typed, pre-computed by other services)
 *         ↓
 *   Statistical/Rule Analysis (this service)
 *         ↓
 *   Structured Insight Context (JSON, no PII)
 *         ↓
 *   LLM Explanation (via AiService — receives only metric summary)
 *         ↓
 *   OutcomeInsight record stored
 *
 * CRITICAL CONSTRAINTS:
 *  - LLM never receives raw data, PII, or individual user records.
 *  - LLM never calculates metrics — only explains pre-computed values.
 *  - System prompt enforces association-only language.
 *  - Insights expire after 7 days and are regenerated on next request.
 */
import { Injectable, Logger, Inject } from '@nestjs/common';
import { OutcomeConfidenceLevel, OutcomeEntityType } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { AIProvider, AI_PROVIDER_TOKEN } from '../../ai/providers/ai-provider.interface';
import { UserCareerFunnel } from './outcome-aggregation.service';
import { TimeToStageResult } from './outcome-time-to-stage.service';
import { BenchmarkComparison } from './outcome-benchmark.service';

const INSIGHT_EXPIRY_DAYS = 7;

// System prompt that enforces association-only language
const INSIGHT_SYSTEM_PROMPT = `You are an evidence-based career analytics assistant.
Your role is to explain pre-computed career outcome metrics in clear, factual language.

STRICT RULES:
1. NEVER say "causes", "leads to", "proves", "guarantees", or "will result in".
2. ALWAYS use association language: "users who X showed Y", "was observed to be associated with", "in this dataset".
3. ALWAYS mention sample size and time period.
4. NEVER invent numbers — only reference the metrics provided in the context.
5. NEVER compare individual users to named peers.
6. Keep insights concise (2–4 sentences) and actionable where possible.
7. If data is insufficient, say so clearly. Do not overstate confidence.`;

@Injectable()
export class OutcomeInsightService {
  private readonly logger = new Logger(OutcomeInsightService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(AI_PROVIDER_TOKEN) private readonly aiProvider: AIProvider,
  ) {}

  /**
   * Generate career insights for a specific user.
   * Returns cached insight if still valid (< 7 days old).
   */
  async getOrGenerateUserInsights(
    userId: string,
    funnel: UserCareerFunnel,
    timeToStage: TimeToStageResult,
    benchmarkComparison?: BenchmarkComparison,
    preparationStats?: { plansCompleted: number; tasksCompleted: number; totalTasks: number },
  ): Promise<Array<{ title: string; body: string; confidence: OutcomeConfidenceLevel; category: string }>> {
    // Check for fresh cached insights
    const cached = await this.prisma.outcomeInsight.findMany({
      where: {
        entityType: OutcomeEntityType.USER,
        entityId: userId,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    if (cached.length > 0) {
      return cached.map((c) => ({
        title: c.title,
        body: c.body,
        confidence: c.confidence,
        category: c.category,
      }));
    }

    // Build metric context — NO PII
    const metricsContext = {
      applications: funnel.applications,
      interviews: funnel.interviews,
      offers: funnel.offers,
      hires: funnel.hires,
      applicationConversionRate: funnel.applicationConversionRate,
      interviewConversionRate: funnel.interviewConversionRate,
      hireRate: funnel.hireRate,
      medianTimeToInterviewHours: timeToStage.timeToInterview.median,
      medianTimeToOfferHours: timeToStage.timeToOffer.median,
      benchmarkComparison,
      preparationStats,
      periodNote: 'All-time career data for this user.',
    };

    // Generate insights using LLM
    const prompts = [
      {
        category: 'FUNNEL',
        userPrompt: `Based on these career metrics, write a concise insight about this user's application funnel: ${JSON.stringify(metricsContext)}`,
        title: 'Application Funnel Summary',
      },
      ...(timeToStage.timeToInterview.sampleSize > 0 ? [{
        category: 'TIME_TO_STAGE',
        userPrompt: `Based on these timing metrics, write a concise insight about this user's hiring timeline: ${JSON.stringify({ timeToStage: metricsContext, applications: metricsContext.applications })}`,
        title: 'Hiring Timeline Insight',
      }] : []),
      ...(preparationStats ? [{
        category: 'PREPARATION',
        userPrompt: `Based on these preparation and outcome metrics (association only — no causation claims), write a concise insight: ${JSON.stringify({ preparation: preparationStats, outcomes: metricsContext })}`,
        title: 'Preparation Activity Observation',
      }] : []),
      ...(benchmarkComparison ? [{
        category: 'BENCHMARK',
        userPrompt: `Based on this benchmark comparison (never reveal other users' data), write a concise insight: ${JSON.stringify({ comparison: benchmarkComparison, userMetrics: metricsContext })}`,
        title: 'Platform Benchmark Comparison',
      }] : []),
    ];

    const insights: Array<{ title: string; body: string; confidence: OutcomeConfidenceLevel; category: string }> = [];
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INSIGHT_EXPIRY_DAYS);
    for (const prompt of prompts) {
      try {
        const response = await this.aiProvider.generateText(
          prompt.userPrompt,
          INSIGHT_SYSTEM_PROMPT,
          { maxTokens: 200 },
        );

        const confidence = this.determineConfidence(funnel.sampleSize);
        const body = response.text ?? 'Insufficient data for insight generation.';

        // Store insight
        await this.prisma.outcomeInsight.create({
          data: {
            entityType: OutcomeEntityType.USER,
            entityId: userId,
            category: prompt.category,
            title: prompt.title,
            body,
            metricsJson: metricsContext,
            sampleSize: funnel.sampleSize,
            confidence,
            expiresAt,
          },
        });

        insights.push({ title: prompt.title, body, confidence, category: prompt.category });
      } catch (err) {
        this.logger.error(`Failed to generate insight for user ${userId}: ${err}`);
        insights.push({
          title: prompt.title,
          body: 'Insight generation temporarily unavailable.',
          confidence: OutcomeConfidenceLevel.INSUFFICIENT_DATA,
          category: prompt.category,
        });
      }
    }

    return insights;
  }

  /**
   * Generate platform-level insights for admin.
   */
  async generatePlatformInsight(
    metricKey: string,
    metricValue: number,
    sampleSize: number,
    trend: string,
    periodStart: Date,
    periodEnd: Date,
  ) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INSIGHT_EXPIRY_DAYS);

    const metricsContext = {
      metricKey,
      metricValue,
      sampleSize,
      trend,
      period: `${periodStart.toISOString().split('T')[0]} to ${periodEnd.toISOString().split('T')[0]}`,
    };

    const response = await this.aiProvider.generateText(
      `Write a concise platform-level insight for this metric: ${JSON.stringify(metricsContext)}`,
      INSIGHT_SYSTEM_PROMPT,
      { maxTokens: 200 },
    );

    const confidence = this.determineConfidence(sampleSize);
    const body = response.text ?? 'Insufficient data.';

    return this.prisma.outcomeInsight.create({
      data: {
        entityType: OutcomeEntityType.PLATFORM,
        entityId: null,
        category: 'PLATFORM_TREND',
        title: `${metricKey} Trend Insight`,
        body,
        metricsJson: metricsContext,
        sampleSize,
        confidence,
        periodStart,
        periodEnd,
        expiresAt,
      },
    });
  }

  private determineConfidence(sampleSize: number): OutcomeConfidenceLevel {
    if (sampleSize >= 50) return OutcomeConfidenceLevel.HIGH;
    if (sampleSize >= 20) return OutcomeConfidenceLevel.MEDIUM;
    if (sampleSize >= 5) return OutcomeConfidenceLevel.LOW;
    return OutcomeConfidenceLevel.INSUFFICIENT_DATA;
  }
}
