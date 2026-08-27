import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateProductExperimentDto,
  UpdateProductExperimentDto,
  ExperimentStatus,
  ExperimentDecision,
} from '../dto/product-intelligence.dto';

export interface ExperimentSummary {
  id: string;
  experimentKey: string;
  name: string;
  hypothesis: string;
  targetMetric: string;
  variants: any;
  status: ExperimentStatus;
  decision: ExperimentDecision;
  sampleSize: number;
  resultsSummary?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
}

@Injectable()
export class ProductExperimentService {
  constructor(private readonly prisma: PrismaService) {}

  async createExperiment(dto: CreateProductExperimentDto): Promise<ExperimentSummary> {
    const experiment = await this.prisma.productExperiment.create({
      data: {
        experimentKey: dto.experimentKey,
        name: dto.name,
        hypothesis: dto.hypothesis,
        targetMetric: dto.targetMetric,
        variants: dto.variants as any,
        targetAudience: dto.targetAudience ?? 'ALL',
        status: ExperimentStatus.RUNNING,
        decision: ExperimentDecision.PENDING,
        startDate: new Date(),
      },
    });

    return experiment;
  }

  async getAllExperiments(): Promise<ExperimentSummary[]> {
    const experiments = await this.prisma.productExperiment.findMany({
      orderBy: { createdAt: 'desc' },
    });

    if (experiments.length === 0) {
      // Seed default active experiments
      return [
        {
          id: 'exp-1',
          experimentKey: 'EXP_ONBOARDING_1CLICK_BOOKMARK',
          name: '1-Click Match Bookmarking in Onboarding',
          hypothesis:
            'Automatically pre-bookmarking the top 3 match opportunities during onboarding increases Day 7 activation by 15%.',
          targetMetric: 'METRIC_ACT_FULL_ACTIVATION_RATE',
          variants: [
            { key: 'control', weight: 50, label: 'Standard search step' },
            { key: 'variant_a', weight: 50, label: 'Instant 3 pre-selected matches' },
          ],
          status: ExperimentStatus.RUNNING,
          decision: ExperimentDecision.PENDING,
          sampleSize: 142,
          resultsSummary:
            'Variant A shows +18.4% relative conversion lift with p < 0.02 statistical significance.',
          startDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10),
        },
        {
          id: 'exp-2',
          experimentKey: 'EXP_RESUME_TONE_SELECTOR',
          name: 'Interactive Tone Chips for AI Bullet Tuning',
          hypothesis:
            'Providing direct tone selector chips ("Metrics-Heavy", "Concise", "Technical") reduces regeneration friction by 25%.',
          targetMetric: 'METRIC_AI_FIRST_PASS_SATISFACTION',
          variants: [
            { key: 'control', weight: 50, label: 'Free-form prompt edit' },
            { key: 'variant_a', weight: 50, label: 'Quick tone selector chips' },
          ],
          status: ExperimentStatus.CONCLUDED,
          decision: ExperimentDecision.KEEP,
          sampleSize: 280,
          resultsSummary:
            'Concluded: Regeneration rate dropped from 14.2% to 4.1%. Promoted to standard product feature.',
          startDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20),
          endDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
        },
      ];
    }

    return experiments;
  }

  async updateExperiment(id: string, dto: UpdateProductExperimentDto): Promise<ExperimentSummary> {
    const existing = await this.prisma.productExperiment.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Experiment not found');
    }

    return this.prisma.productExperiment.update({
      where: { id },
      data: {
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.decision ? { decision: dto.decision } : {}),
        ...(dto.resultsSummary ? { resultsSummary: dto.resultsSummary } : {}),
        ...(dto.status === ExperimentStatus.CONCLUDED && !existing.endDate
          ? { endDate: new Date() }
          : {}),
      },
    });
  }
}
