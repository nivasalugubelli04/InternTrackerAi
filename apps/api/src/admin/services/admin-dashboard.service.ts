import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CostTrackerService } from '../../ai/services/cost-tracker.service';

@Injectable()
export class AdminDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly costTracker: CostTrackerService,
  ) {}

  async getKpis() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      totalUsers,
      newUsersToday,
      activeUsers7d,
      trackedCompanies,
      jobsCollected,
      jobsAddedToday,
      totalApplications,
      totalAiRequests,
      // Phase 20 additions
      totalResumesAnalyzed,
      avgResumeScoreResult,
      acceptedSuggestionsCount,
      rejectedSuggestionsCount,
      portfolioAdoption,
      aiDocumentUsage,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: today } } }),
      this.prisma.user.count({ where: { lastLoginAt: { gte: sevenDaysAgo } } }),
      this.prisma.company.count(),
      this.prisma.jobPosting.count(),
      this.prisma.jobPosting.count({ where: { createdAt: { gte: today } } }),
      this.prisma.application.count(),
      this.prisma.aiAnalysis.count(),
      // Phase 20 counts
      this.prisma.resumeAnalysis.count(),
      this.prisma.resumeAnalysis.aggregate({
        _avg: { overallScore: true }
      }),
      this.prisma.resumeSuggestion.count({ where: { status: 'ACCEPTED' } }),
      this.prisma.resumeSuggestion.count({ where: { status: 'REJECTED' } }),
      this.prisma.portfolio.count(),
      this.prisma.generatedDocument.count(),
    ]);

    // Get scraper health aggregates
    const parsers = await this.prisma.parserHealth.findMany();
    let totalSuccess = 0;
    for (const p of parsers) {
      totalSuccess += p.successRate;
    }
    const avgScraperSuccessRate = parsers.length > 0 ? totalSuccess / parsers.length : 100;

    // Calculate acceptance rate
    const totalDecisions = acceptedSuggestionsCount + rejectedSuggestionsCount;
    const optimizationAcceptanceRate = totalDecisions > 0 ? (acceptedSuggestionsCount / totalDecisions) * 100 : 0;
    const avgResumeQualityScore = avgResumeScoreResult._avg.overallScore || 0;

    return {
      users: {
        total: totalUsers,
        newToday: newUsersToday,
        active7d: activeUsers7d,
      },
      content: {
        companies: trackedCompanies,
        jobs: jobsCollected,
        jobsToday: jobsAddedToday,
      },
      engagement: {
        applications: totalApplications,
        aiRequests: totalAiRequests,
      },
      system: {
        scraperSuccessRate: avgScraperSuccessRate,
      },
      // Phase 20 metrics
      phase20: {
        resumeAnalyses: totalResumesAnalyzed,
        averageResumeQualityScore: Math.round(avgResumeQualityScore * 10) / 10,
        optimizationAcceptanceRate: Math.round(optimizationAcceptanceRate * 10) / 10,
        portfolioAdoption,
        aiDocumentUsage,
        aiCostUSD: this.costTracker.getTotalCost(),
      }
    };
  }
}
