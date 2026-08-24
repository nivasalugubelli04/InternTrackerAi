import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OpportunityCategory, PlanType, ExecutionPriority, EffortCategory } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

export interface CreateWatchlistDto {
  title: string;
  description?: string;
  targetRoles?: string[];
  categories?: OpportunityCategory[];
  targetLocations?: string[];
  remoteOnly?: boolean;
  minMatchScore?: number;
}

@Injectable()
export class WatchlistService {
  private readonly logger = new Logger(WatchlistService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lists all watchlists for a user with item counts.
   */
  async getUserWatchlists(userId: string) {
    return this.prisma.researchWatchlist.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { items: true } },
      },
    });
  }

  /**
   * Creates a new user watchlist.
   */
  async createWatchlist(userId: string, dto: CreateWatchlistDto) {
    this.logger.log(`Creating research watchlist "${dto.title}" for user ${userId}`);

    return this.prisma.researchWatchlist.create({
      data: {
        userId,
        title: dto.title,
        description: dto.description ?? null,
        targetRoles: dto.targetRoles || [],
        categories: dto.categories || [OpportunityCategory.INTERNSHIP],
        targetLocations: dto.targetLocations || [],
        remoteOnly: dto.remoteOnly || false,
        minMatchScore: dto.minMatchScore || 70,
        isAlertEnabled: true,
        isActive: true,
      },
    });
  }

  /**
   * Adds an opportunity to a watchlist.
   */
  async addOpportunityToWatchlist(
    userId: string,
    watchlistId: string,
    payload: {
      jobPostingId?: string;
      opportunityTitle: string;
      companyName: string;
      matchScore?: number;
      notes?: string;
    },
  ) {
    const watchlist = await this.prisma.researchWatchlist.findFirst({
      where: { id: watchlistId, userId },
    });

    if (!watchlist) throw new NotFoundException('Watchlist not found.');

    return this.prisma.researchWatchlistItem.create({
      data: {
        watchlistId,
        jobPostingId: payload.jobPostingId ?? null,
        opportunityTitle: payload.opportunityTitle,
        companyName: payload.companyName,
        matchScore: payload.matchScore || 70,
        notes: payload.notes ?? null,
      },
    });
  }

  /**
   * Deletes a watchlist.
   */
  async deleteWatchlist(userId: string, watchlistId: string) {
    const watchlist = await this.prisma.researchWatchlist.findFirst({
      where: { id: watchlistId, userId },
    });

    if (!watchlist) throw new NotFoundException('Watchlist not found.');

    await this.prisma.researchWatchlist.delete({ where: { id: watchlistId } });
    return { success: true, message: 'Watchlist deleted.' };
  }

  /**
   * Research-to-Action: Converts an opportunity requirement into an actionable Phase 45 execution plan task.
   */
  async createPreparationAction(
    userId: string,
    payload: {
      opportunityTitle: string;
      companyName: string;
      suggestedTask: string;
      estimatedMinutes?: number;
    },
  ) {
    this.logger.log(
      `Creating Phase 45 preparation action for ${payload.companyName} for user ${userId}`,
    );

    // Fetch active daily or weekly plan, or create one
    let plan = await this.prisma.executionPlan.findFirst({
      where: { userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });

    if (!plan) {
      plan = await this.prisma.executionPlan.create({
        data: {
          userId,
          planType: PlanType.DAILY,
          planObjective: `Prepare for ${payload.companyName} Opportunity`,
          primaryFocus: 'Opportunity Readiness',
          workloadRisk: 'BALANCED',
          totalEstimatedMinutes: payload.estimatedMinutes || 45,
          aiGenerated: false,
        },
      });
    }

    const actionItem = await this.prisma.executionPlanItem.create({
      data: {
        planId: plan.id,
        title: payload.suggestedTask,
        description: `Preparation task tailored for "${payload.opportunityTitle}" at ${payload.companyName}.`,
        source: 'APPLICATION',
        priority: ExecutionPriority.HIGH,
        estimatedEffort:
          (payload.estimatedMinutes || 45) > 45 ? EffortCategory.MEDIUM : EffortCategory.SHORT,
        estimatedMinutes: payload.estimatedMinutes || 45,
        status: 'PENDING',
      },
    });

    // Log CareerEvent
    await this.prisma.careerEvent.create({
      data: {
        userId,
        eventType: 'OpportunityActionCreated',
        source: 'CAREER_RESEARCH',
        entityType: 'ExecutionPlanItem',
        entityId: actionItem.id,
        importance: 'HIGH',
        metadata: {
          companyName: payload.companyName,
          opportunityTitle: payload.opportunityTitle,
          planId: plan.id,
        },
      },
    });

    return {
      success: true,
      message: 'Preparation task added to your Phase 45 Execution Queue.',
      actionItem,
    };
  }
}
