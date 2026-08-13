import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

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
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: today } } }),
      this.prisma.user.count({ where: { lastLoginAt: { gte: sevenDaysAgo } } }),
      this.prisma.company.count(),
      this.prisma.jobPosting.count(),
      this.prisma.jobPosting.count({ where: { createdAt: { gte: today } } }),
      this.prisma.application.count(),
      this.prisma.aiAnalysis.count(), // Example placeholder for AI usage
    ]);

    // Get scraper health aggregates
    const parsers = await this.prisma.parserHealth.findMany();
    let totalSuccess = 0;
    for (const p of parsers) {
      totalSuccess += p.successRate;
    }
    const avgScraperSuccessRate = parsers.length > 0 ? totalSuccess / parsers.length : 100;

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
    };
  }
}
