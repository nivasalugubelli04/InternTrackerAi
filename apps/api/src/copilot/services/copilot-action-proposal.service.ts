import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

export interface CreateProposalParams {
  userId: string;
  conversationId?: string;
  proposalType: string; // ADD_DAILY_TASK, START_SPRINT, UPDATE_STRATEGY, SAVE_OPPORTUNITY
  title: string;
  description: string;
  targetEngine: string;
  payload: any;
}

@Injectable()
export class CopilotActionProposalService {
  private readonly logger = new Logger(CopilotActionProposalService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Proposes an actionable modification to execution plans or career strategy.
   */
  async createProposal(params: CreateProposalParams) {
    this.logger.log(`Creating action proposal for user ${params.userId}: ${params.title}`);
    return this.prisma.copilotActionProposal.create({
      data: {
        userId: params.userId,
        conversationId: params.conversationId || null,
        proposalType: params.proposalType,
        title: params.title,
        description: params.description,
        targetEngine: params.targetEngine,
        actionPayload: params.payload,
        status: 'PENDING',
      },
    });
  }

  /**
   * Confirms and executes an actionable proposal with user authorization.
   */
  async confirmProposal(userId: string, proposalId: string, _customNotes?: string) {
    const proposal = await this.prisma.copilotActionProposal.findFirst({
      where: { id: proposalId, userId },
    });

    if (!proposal) {
      throw new NotFoundException('Action proposal not found or unauthorized');
    }

    if (proposal.status !== 'PENDING') {
      throw new BadRequestException(`Proposal is already ${proposal.status}`);
    }

    const payload = proposal.actionPayload as any;

    // 1. Execute according to target engine
    if (
      proposal.proposalType === 'ADD_DAILY_TASK' ||
      proposal.targetEngine === 'EXECUTION_ENGINE'
    ) {
      // Add directly to Phase 45 Active Execution Plan
      let plan = await this.prisma.executionPlan.findFirst({
        where: { userId, status: 'ACTIVE' },
      });

      if (!plan) {
        plan = await this.prisma.executionPlan.create({
          data: {
            userId,
            planObjective: 'Weekly Career Execution Plan',
            primaryFocus: 'Career Milestones',
            planType: 'WEEKLY',
            status: 'ACTIVE',
            targetDate: new Date(),
          },
        });
      }

      await this.prisma.executionPlanItem.create({
        data: {
          planId: plan.id,
          title: payload.title || proposal.title,
          description: payload.description || proposal.description,
          source: 'USER_CREATED',
          priority: 'HIGH',
          estimatedMinutes: payload.estimatedMinutes || 45,
          status: 'PENDING',
        },
      });
    } else if (proposal.proposalType === 'START_SPRINT') {
      await this.prisma.careerSprint.create({
        data: {
          userId,
          title: proposal.title,
          goal: payload.targetMilestone || proposal.description,
          sprintType: 'SKILL',
          startDate: new Date(),
          endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          durationDays: 14,
          status: 'ACTIVE',
        },
      });
    }

    // 2. Mark proposal as confirmed & executed
    const updatedProposal = await this.prisma.copilotActionProposal.update({
      where: { id: proposalId },
      data: {
        status: 'CONFIRMED',
        confirmedAt: new Date(),
      },
    });

    // 3. Emit CareerEvent
    await this.prisma.careerEvent.create({
      data: {
        userId,
        eventType: 'CopilotActionConfirmed',
        source: 'AI_COPILOT',
        entityType: 'CopilotActionProposal',
        entityId: proposalId,
        importance: 'HIGH',
        metadata: {
          proposalType: proposal.proposalType,
          title: proposal.title,
        },
      },
    });

    return {
      success: true,
      message: `Action "${proposal.title}" successfully applied to your Career Execution Plan!`,
      proposal: updatedProposal,
    };
  }

  /**
   * Cancels a pending action proposal.
   */
  async cancelProposal(userId: string, proposalId: string) {
    const proposal = await this.prisma.copilotActionProposal.findFirst({
      where: { id: proposalId, userId },
    });

    if (!proposal) {
      throw new NotFoundException('Action proposal not found or unauthorized');
    }

    return this.prisma.copilotActionProposal.update({
      where: { id: proposalId },
      data: { status: 'CANCELLED' },
    });
  }
}
