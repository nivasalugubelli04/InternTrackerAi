import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StrategyProposalService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates or retrieves active optimization proposals for user review.
   */
  async generateProposals(userId: string) {
    const existing = await this.prisma.optimizationProposal.findMany({
      where: { userId, status: 'PENDING' },
    });

    if (existing.length > 0) return existing;

    // Check if user has long tasks delay pattern or unapplied matches
    const signals = await this.prisma.careerLearningSignal.findMany({
      where: { userId },
      take: 20,
    });

    const hasDelaySignal = signals.some(
      (s) => s.signalType === 'TASK_DELAYED' || s.signalType === 'TASK_SKIPPED',
    );

    const proposalsToCreate = [
      {
        currentStrategy: 'Schedule monolithic deep-work project blocks (90-120 mins).',
        observation:
          'Short modular tasks (30-45 mins) have a 78% completion rate versus 42% for multi-hour blocks.',
        proposedChange: 'Decompose upcoming project deployment into 4 daily 45-minute milestones.',
        expectedBenefit: 'Higher execution consistency and faster live evidence generation.',
        tradeOff: 'Requires 5 minutes of upfront planning per milestone.',
        confidence: 'HIGH_CONFIDENCE',
        targetEngine: 'EXECUTION_ENGINE',
        actionPayload: {
          milestones: [
            { title: 'Prepare deployment environment & environment variables', duration: 30 },
            { title: 'Deploy backend API to cloud runtime', duration: 45 },
            { title: 'Deploy frontend client & link custom domain', duration: 45 },
            { title: 'Document live demo URL on portfolio & resume', duration: 30 },
          ],
        },
      },
      {
        currentStrategy: 'Allocate 80% time to skill learning, 20% to job applications.',
        observation: '14 high-match opportunities are currently active with impending deadlines.',
        proposedChange:
          'Shift to a balanced 50% Skill / 50% Application allocation sprint for the next 7 days.',
        expectedBenefit:
          'Submit 4-6 high-readiness applications before priority hiring windows close.',
        tradeOff: 'Pauses secondary skill learning roadmaps for 1 week.',
        confidence: 'MEDIUM_CONFIDENCE',
        targetEngine: 'EXECUTION_ENGINE',
        actionPayload: {
          sprintTitle: 'Application Blitz Sprint',
          durationDays: 7,
          targetApplications: 5,
        },
      },
    ];

    const list = hasDelaySignal ? proposalsToCreate : proposalsToCreate.slice(0, 1);
    const results: any[] = [];
    for (const p of list) {
      const created = await this.prisma.optimizationProposal.create({
        data: {
          userId,
          currentStrategy: p.currentStrategy,
          observation: p.observation,
          proposedChange: p.proposedChange,
          expectedBenefit: p.expectedBenefit,
          tradeOff: p.tradeOff,
          confidence: p.confidence as any,
          status: 'PENDING',
          targetEngine: p.targetEngine,
          actionPayload: p.actionPayload,
        },
      });
      results.push(created);
    }

    return results;
  }

  /**
   * Approves and executes an optimization proposal upon explicit user authorization.
   */
  async approveProposal(userId: string, proposalId: string, _customNotes?: string) {
    const proposal = await this.prisma.optimizationProposal.findFirst({
      where: { id: proposalId, userId },
    });

    if (!proposal) {
      throw new NotFoundException('Optimization proposal not found or unauthorized');
    }

    if (proposal.status !== 'PENDING') {
      throw new BadRequestException(`Proposal is already ${proposal.status}`);
    }

    const payload = (proposal.modifiedPayload || proposal.actionPayload) as any;

    // 1. Apply changes to Phase 45 Execution Plan / Sprint
    if (payload.milestones && Array.isArray(payload.milestones)) {
      let plan = await this.prisma.executionPlan.findFirst({
        where: { userId, status: 'ACTIVE' },
      });

      if (!plan) {
        plan = await this.prisma.executionPlan.create({
          data: {
            userId,
            planObjective: 'Optimized Milestone Execution Plan',
            primaryFocus: 'Project Deployment Milestones',
            planType: 'WEEKLY',
            status: 'ACTIVE',
            targetDate: new Date(),
          },
        });
      }

      for (const m of payload.milestones) {
        await this.prisma.executionPlanItem.create({
          data: {
            planId: plan.id,
            title: m.title,
            description: `Decomposed milestone from Strategy Optimization Proposal`,
            source: 'USER_CREATED',
            priority: 'HIGH',
            estimatedMinutes: m.duration || 45,
            status: 'PENDING',
          },
        });
      }
    } else if (payload.sprintTitle) {
      await this.prisma.careerSprint.create({
        data: {
          userId,
          title: payload.sprintTitle,
          goal: `Submit ${payload.targetApplications || 5} targeted applications`,
          sprintType: 'APPLICATION',
          startDate: new Date(),
          endDate: new Date(Date.now() + (payload.durationDays || 7) * 24 * 60 * 60 * 1000),
          durationDays: payload.durationDays || 7,
          status: 'ACTIVE',
        },
      });
    }

    // 2. Mark proposal approved & applied
    const updated = await this.prisma.optimizationProposal.update({
      where: { id: proposalId },
      data: {
        status: 'APPLIED',
        approvedAt: new Date(),
      },
    });

    // 3. Emit CareerEvent
    await this.prisma.careerEvent.create({
      data: {
        userId,
        eventType: 'StrategyOptimizationApproved',
        source: 'OPTIMIZATION_ENGINE',
        entityType: 'OptimizationProposal',
        entityId: proposalId,
        importance: 'HIGH',
        metadata: {
          proposedChange: proposal.proposedChange,
          targetEngine: proposal.targetEngine,
        },
      },
    });

    return {
      success: true,
      message: 'Optimization strategy successfully approved and applied to your execution plan!',
      proposal: updated,
    };
  }

  /**
   * Rejects an optimization proposal.
   */
  async rejectProposal(userId: string, proposalId: string, rejectionReason?: string) {
    const proposal = await this.prisma.optimizationProposal.findFirst({
      where: { id: proposalId, userId },
    });

    if (!proposal) {
      throw new NotFoundException('Optimization proposal not found');
    }

    return this.prisma.optimizationProposal.update({
      where: { id: proposalId },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectionReason: rejectionReason || null,
      },
    });
  }

  /**
   * Modifies an optimization proposal payload before approval.
   */
  async modifyProposal(userId: string, proposalId: string, modifiedPayload: any) {
    const proposal = await this.prisma.optimizationProposal.findFirst({
      where: { id: proposalId, userId },
    });

    if (!proposal) {
      throw new NotFoundException('Optimization proposal not found');
    }

    return this.prisma.optimizationProposal.update({
      where: { id: proposalId },
      data: {
        status: 'MODIFIED',
        modifiedPayload,
      },
    });
  }
}
