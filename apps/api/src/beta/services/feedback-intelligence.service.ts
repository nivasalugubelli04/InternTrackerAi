import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FeedbackIntelligenceService {
  private readonly logger = new Logger(FeedbackIntelligenceService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Clusters recent feedback entries into structured themes.
   */
  async clusterFeedbackThemes() {
    this.logger.log('Clustering recent user feedback into themes...');

    const recentFeedbacks = await this.prisma.userFeedback.findMany({
      where: { status: { in: ['OPEN', 'IN_REVIEW'] } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    if (recentFeedbacks.length === 0) {
      return this.prisma.feedbackTheme.findMany({
        orderBy: { frequencyCount: 'desc' },
        take: 10,
      });
    }

    // Group feedbacks by category
    const groupedByCategory: Record<string, typeof recentFeedbacks> = {};
    for (const fb of recentFeedbacks) {
      const cat = fb.category || 'GENERAL';
      if (!groupedByCategory[cat]) groupedByCategory[cat] = [];
      groupedByCategory[cat].push(fb);
    }

    for (const [category, items] of Object.entries(groupedByCategory)) {
      const title = `${this.formatCategoryTitle(category)} Improvement & Feedback`;
      const quotes = items
        .filter((i) => !!i.message)
        .map((i) => (i.message ? i.message.substring(0, 120) : ''))
        .filter(Boolean)
        .slice(0, 5);

      const hasCritical = items.some((i) => i.severity === 'P0' || i.severity === 'CRITICAL');
      const hasHigh = items.some((i) => i.severity === 'P1' || i.severity === 'HIGH');
      const priority = hasCritical ? 'CRITICAL' : hasHigh ? 'HIGH' : 'MEDIUM';

      const existing = await this.prisma.feedbackTheme.findFirst({
        where: { affectedFeature: category, status: 'OPEN' },
      });

      if (existing) {
        await this.prisma.feedbackTheme.update({
          where: { id: existing.id },
          data: {
            frequencyCount: items.length,
            sampleFeedbackQuotes: quotes,
            priority: priority as any,
            aiSummary: `Aggregated ${items.length} feedback submissions regarding ${category.toLowerCase().replace(/_/g, ' ')}.`,
          },
        });
      } else {
        await this.prisma.feedbackTheme.create({
          data: {
            title,
            category,
            affectedFeature: category,
            frequencyCount: items.length,
            severity: priority,
            priority: priority as any,
            aiSummary: `Initial cluster of ${items.length} reports regarding ${category.toLowerCase().replace(/_/g, ' ')}.`,
            suggestedInvestigation: `Review user workflows and error rates in ${category} module.`,
            sampleFeedbackQuotes: quotes,
          },
        });
      }
    }

    return this.prisma.feedbackTheme.findMany({
      orderBy: { frequencyCount: 'desc' },
      take: 10,
    });
  }

  private formatCategoryTitle(category: string): string {
    return category
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }
}
