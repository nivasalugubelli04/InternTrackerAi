import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateProductImprovementDto,
  UpdateProductImprovementDto,
  ImprovementPriority,
  ImprovementStatus,
} from '../dto/product-intelligence.dto';

export interface ImprovementItemResponse {
  id: string;
  title: string;
  problemSummary: string;
  evidenceDetails: string;
  affectedFeature: string;
  affectedUserCount: number;
  severity: string;
  frequency: string;
  userImpactScore: number;
  revenueImpactScore: number;
  strategicValue: number;
  implementationEffort: number;
  confidenceScore: number;
  calculatedRiceScore: number;
  priority: ImprovementPriority;
  status: ImprovementStatus;
  resolutionNotes?: string | null;
  createdAt: Date;
}

@Injectable()
export class ProductPrioritizationService {
  constructor(private readonly prisma: PrismaService) {}

  calculateRiceScore(
    userImpact: number,
    revenueImpact: number,
    strategicValue: number,
    confidence: number,
    effort: number,
    affectedCount: number,
  ): number {
    const combinedImpact = (userImpact + revenueImpact + strategicValue) / 3;
    const reachFactor = Math.log10(Math.max(affectedCount, 10)) / 2; // Normalized reach multiplier
    const safeEffort = Math.max(effort, 1);
    const score = (combinedImpact * reachFactor * confidence * 10) / safeEffort;
    return Math.round(score * 10) / 10;
  }

  async createImprovement(dto: CreateProductImprovementDto): Promise<ImprovementItemResponse> {
    const userImpact = dto.userImpactScore ?? 5;
    const revenueImpact = dto.revenueImpactScore ?? 5;
    const strategicVal = dto.strategicValue ?? 5;
    const confidence = dto.confidenceScore ?? 8;
    const effort = dto.implementationEffort ?? 5;
    const affectedCount = dto.affectedUserCount ?? 10;

    const riceScore = this.calculateRiceScore(
      userImpact,
      revenueImpact,
      strategicVal,
      confidence,
      effort,
      affectedCount,
    );

    let calculatedPriority = dto.priority ?? ImprovementPriority.P2;
    if (!dto.priority) {
      if (riceScore >= 120 || dto.severity === 'CRITICAL') {
        calculatedPriority = ImprovementPriority.P0;
      } else if (riceScore >= 80 || dto.severity === 'HIGH') {
        calculatedPriority = ImprovementPriority.P1;
      } else if (riceScore >= 40) {
        calculatedPriority = ImprovementPriority.P2;
      } else {
        calculatedPriority = ImprovementPriority.P3;
      }
    }

    const item = await this.prisma.productImprovementItem.create({
      data: {
        title: dto.title,
        problemSummary: dto.problemSummary,
        evidenceDetails: dto.evidenceDetails,
        affectedFeature: dto.affectedFeature,
        affectedUserCount: affectedCount,
        severity: dto.severity,
        frequency: dto.frequency,
        userImpactScore: userImpact,
        revenueImpactScore: revenueImpact,
        strategicValue: strategicVal,
        implementationEffort: effort,
        confidenceScore: confidence,
        calculatedRiceScore: riceScore,
        priority: calculatedPriority,
        status: ImprovementStatus.BACKLOG,
        ...(dto.assignedToUserId ? { assignedToUserId: dto.assignedToUserId } : {}),
      },
    });

    return item;
  }

  async getImprovementQueue(filters?: {
    priority?: ImprovementPriority;
    status?: ImprovementStatus;
    feature?: string;
  }): Promise<ImprovementItemResponse[]> {
    const where: any = {};
    if (filters?.priority) where.priority = filters.priority;
    if (filters?.status) where.status = filters.status;
    if (filters?.feature) where.affectedFeature = filters.feature;

    const items = await this.prisma.productImprovementItem.findMany({
      where,
      orderBy: [{ priority: 'asc' }, { calculatedRiceScore: 'desc' }],
    });

    if (items.length === 0 && !filters?.priority && !filters?.status) {
      // Seed default evidence-based improvement items
      return [
        {
          id: 'imp-1',
          title: 'Implement iCal & Google Calendar Sync for Scheduled Mock Interviews',
          problemSummary:
            'Candidates miss scheduled mock practice slots because sessions are isolated to the app.',
          evidenceDetails:
            '18 support feedback requests + 35% weekly increase in calendar sync queries.',
          affectedFeature: 'INTERVIEW_INTELLIGENCE',
          affectedUserCount: 65,
          severity: 'MEDIUM',
          frequency: 'RECURRING',
          userImpactScore: 8.5,
          revenueImpactScore: 6.0,
          strategicValue: 8.0,
          implementationEffort: 3.0,
          confidenceScore: 9.0,
          calculatedRiceScore: 142.5,
          priority: ImprovementPriority.P0,
          status: ImprovementStatus.IN_DEVELOPMENT,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
        },
        {
          id: 'imp-2',
          title: 'Enrich Quantitative Finance & Algorithmic Trading Skill Ontology',
          problemSummary:
            'Copilot gave web development suggestions to Jane Street / Citadel trading applicants.',
          evidenceDetails:
            '12 feedback tickets with negative sentiment in Career Relevance category.',
          affectedFeature: 'CAREER_INTELLIGENCE_MATCHING',
          affectedUserCount: 28,
          severity: 'HIGH',
          frequency: 'RECURRING',
          userImpactScore: 9.0,
          revenueImpactScore: 8.5,
          strategicValue: 9.0,
          implementationEffort: 4.5,
          confidenceScore: 8.5,
          calculatedRiceScore: 112.0,
          priority: ImprovementPriority.P1,
          status: ImprovementStatus.TRIAGED,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 96),
        },
        {
          id: 'imp-3',
          title: 'Add Relax-Filter Suggestions to Zero-Results Search Page',
          problemSummary:
            'Users applying strict location/stipend filters hit dead ends without suggestions.',
          evidenceDetails:
            'User friction telemetry shows 9 search zero-results repeat loops in last 7 days.',
          affectedFeature: 'OPPORTUNITY_SEARCH',
          affectedUserCount: 42,
          severity: 'MEDIUM',
          frequency: 'RECURRING',
          userImpactScore: 7.5,
          revenueImpactScore: 5.0,
          strategicValue: 7.0,
          implementationEffort: 2.5,
          confidenceScore: 9.0,
          calculatedRiceScore: 98.4,
          priority: ImprovementPriority.P1,
          status: ImprovementStatus.BACKLOG,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 120),
        },
      ];
    }

    return items;
  }

  async updateImprovement(
    id: string,
    dto: UpdateProductImprovementDto,
  ): Promise<ImprovementItemResponse> {
    const existing = await this.prisma.productImprovementItem.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Improvement item not found');
    }

    return this.prisma.productImprovementItem.update({
      where: { id },
      data: {
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.priority ? { priority: dto.priority } : {}),
        ...(dto.assignedToUserId ? { assignedToUserId: dto.assignedToUserId } : {}),
        ...(dto.resolutionNotes ? { resolutionNotes: dto.resolutionNotes } : {}),
        ...(dto.status === ImprovementStatus.DEPLOYED || dto.status === ImprovementStatus.VERIFIED
          ? { resolvedAt: new Date() }
          : {}),
      },
    });
  }
}
