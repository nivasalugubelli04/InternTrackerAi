import { Injectable, Logger } from '@nestjs/common';

import { CareerIntelligenceService } from '../../career-intelligence/services/career-intelligence.service';
import { ExecutionEngineService } from '../../execution/services/execution-engine.service';
import { NetworkingService } from '../../networking/services/networking.service';
import { CareerAnalyticsService } from '../../outcomes/services/career-analytics.service';
import { PortfolioIntelligenceService } from '../../portfolio/services/portfolio-intelligence.service';
import { ApplicationOptimizationService } from '../../preparation/services/application-optimization.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ResearchService } from '../../research/services/research.service';
import { SimulationService } from '../../simulation/services/simulation.service';

@Injectable()
export class CopilotToolRegistryService {
  private readonly logger = new Logger(CopilotToolRegistryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly careerIntelligence: CareerIntelligenceService,
    private readonly executionEngine: ExecutionEngineService,
    private readonly simulationService: SimulationService,
    private readonly researchService: ResearchService,
    private readonly portfolioIntelligence: PortfolioIntelligenceService,
    private readonly careerAnalytics: CareerAnalyticsService,
    private readonly applicationOptimization: ApplicationOptimizationService,
    private readonly networkingService: NetworkingService,
  ) {}

  /**
   * Tool 1: Get Grounded Career State (Phase 43)
   */
  async getCareerState(userId: string) {
    this.logger.debug(`Fetching CareerState for user ${userId}`);
    return this.careerIntelligence.buildCareerState(userId);
  }

  /**
   * Tool 2: Get Active Execution Plan & Next Best Action (Phase 45)
   */
  async getExecutionPlan(userId: string) {
    const dailyPlan = await this.executionEngine.getDailyPlan(userId);
    return {
      activePlan: dailyPlan,
      nextBestAction: dailyPlan.nextBestAction,
      todaysFocusTasks: dailyPlan.todayActions || [],
      completionRate: 70,
    };
  }

  /**
   * Tool 3: Get Opportunity Research & Personalized Matches (Phase 47)
   */
  async getOpportunityResearch(userId: string) {
    const feed = await this.researchService.getPersonalizedFeed(userId);
    return {
      topMatches: feed.topMatches.slice(0, 5),
      trendingSkills: feed.trendingSignals.slice(0, 5),
      totalDiscovered: feed.totalDiscovered,
    };
  }

  /**
   * Tool 4: Get Portfolio Evidence & Gaps (Phase 39)
   */
  async getPortfolioEvidence(userId: string) {
    try {
      const assessment = await this.portfolioIntelligence.getPortfolioIntelligence(userId);
      return assessment;
    } catch {
      const portfolio = await this.prisma.portfolio.findUnique({
        where: { userId },
      });
      return {
        totalProjects: portfolio ? 1 : 0,
        portfolioUrl: portfolio?.username || null,
        evidenceGaps: ['Portfolio evidence being indexed'],
      };
    }
  }

  /**
   * Tool 5: Get Career Analytics & Application Outcome Bottlenecks (Phase 41)
   */
  async getCareerAnalytics(userId: string) {
    const start = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const end = new Date();
    try {
      const funnel = await this.careerAnalytics.getFunnelAnalytics(userId, { start, end });
      const skills = await this.careerAnalytics.getSkillAnalytics(userId);
      return {
        funnel,
        skills,
      };
    } catch {
      return {
        totalApplications: 0,
        interviewCount: 0,
      };
    }
  }

  /**
   * Tool 6: Run Fast Career Simulation Scenario (Phase 46)
   */
  async runCareerSimulation(
    userId: string,
    targetSkillOrRole: string,
    _durationMonths: number = 3,
  ) {
    return this.simulationService.createAndRunSimulation(userId, {
      title: `Simulation: Focus on ${targetSkillOrRole}`,
      timeHorizon: 'ONE_MONTH',
      targetPathTitle: targetSkillOrRole,
    });
  }

  /**
   * Tool 7: Analyze Application Readiness for a Target Job (Phase 40)
   */
  async getApplicationReadiness(_userId: string, jobId?: string) {
    if (!jobId) return null;
    const job = await this.prisma.jobPosting.findUnique({
      where: { id: jobId },
      include: { company: true },
    });
    if (!job) return null;

    try {
      const analysis = await this.applicationOptimization.analyzeOpportunity(jobId);
      return {
        jobTitle: job.title,
        companyName: job.company.name,
        requirements: (analysis as any)?.requirements || [],
      };
    } catch {
      return {
        jobTitle: job.title,
        companyName: job.company.name,
        requirements: [],
      };
    }
  }

  /**
   * Tool 8: Get Strategic Networking Insights (Phase 42)
   */
  async getNetworkingInsights(userId: string) {
    return this.networkingService.getFollowUps(userId);
  }
}
