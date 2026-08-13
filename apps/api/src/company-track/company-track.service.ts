import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import type { TrackingPriority } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { EntitlementService, BILLING_FEATURES } from '../billing/services/entitlement.service';
import { EngagementTrackerService } from '../engagement/services/engagement-tracker.service';

export interface TrackCompanyDto {
  companyId: string;
  priority?: TrackingPriority;
}

export interface UpdateTrackingDto {
  priority: TrackingPriority;
}

@Injectable()
export class CompanyTrackService {
  private readonly logger = new Logger(CompanyTrackService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlementService: EntitlementService,
    private readonly engagementTracker: EngagementTrackerService,
  ) {}

  async trackCompany(userId: string, dto: TrackCompanyDto) {
    // Check if already tracking
    const existing = await this.prisma.trackedCompany.findUnique({
      where: { userId_companyId: { userId, companyId: dto.companyId } },
    });

    if (existing) {
      throw new BadRequestException('Company is already tracked');
    }

    // Check limit dynamically via EntitlementService
    const count = await this.prisma.trackedCompany.count({
      where: { userId },
    });

    const limit = await this.entitlementService.getLimit(userId, BILLING_FEATURES.COMPANY_TRACKING);
    if (count >= limit) {
      throw new BadRequestException(
        `You have reached your limit of ${limit} tracked companies. Please upgrade to track more.`,
      );
    }

    const tracked = await this.prisma.trackedCompany.create({
      data: {
        userId,
        companyId: dto.companyId,
        priority: dto.priority || 'MEDIUM',
      },
    });

    this.logger.log({ userId, companyId: dto.companyId }, 'Company tracked');
    
    // Phase 16: Track engagement event
    await this.engagementTracker.trackAction(userId, 'COMPANY_TRACKED');

    return tracked;
  }

  async untrackCompany(userId: string, companyId: string) {
    const existing = await this.prisma.trackedCompany.findUnique({
      where: { userId_companyId: { userId, companyId } },
    });

    if (!existing) {
      throw new NotFoundException('Company is not tracked');
    }

    await this.prisma.trackedCompany.delete({
      where: { userId_companyId: { userId, companyId } },
    });

    this.logger.log({ userId, companyId }, 'Company untracked');
  }

  async updatePriority(userId: string, companyId: string, dto: UpdateTrackingDto) {
    const existing = await this.prisma.trackedCompany.findUnique({
      where: { userId_companyId: { userId, companyId } },
    });

    if (!existing) {
      throw new NotFoundException('Company is not tracked');
    }

    const updated = await this.prisma.trackedCompany.update({
      where: { userId_companyId: { userId, companyId } },
      data: { priority: dto.priority },
    });

    this.logger.log({ userId, companyId, priority: dto.priority }, 'Tracking priority updated');
    return updated;
  }

  async getTrackedCompanies(userId: string) {
    return this.prisma.trackedCompany.findMany({
      where: { userId },
      include: {
        company: {
          include: {
            categories: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
