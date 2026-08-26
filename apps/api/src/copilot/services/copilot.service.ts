import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { CareerIntelligenceService } from '../../career-intelligence/services/career-intelligence.service';
import { ExecutionEngineService } from '../../execution/services/execution-engine.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SendMessageDto } from '../dto/copilot.dto';
import { CopilotHomeSummary } from '../interfaces/copilot.interfaces';

import { CopilotActionProposalService } from './copilot-action-proposal.service';
import { CopilotContextService } from './copilot-context.service';
import { CopilotIntentService } from './copilot-intent.service';
import { CopilotMemoryService } from './copilot-memory.service';
import { CopilotOrchestratorService } from './copilot-orchestrator.service';

@Injectable()
export class CopilotService {
  private readonly logger = new Logger(CopilotService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly intentService: CopilotIntentService,
    private readonly contextService: CopilotContextService,
    private readonly memoryService: CopilotMemoryService,
    private readonly orchestratorService: CopilotOrchestratorService,
    private readonly proposalService: CopilotActionProposalService,
    private readonly careerIntelligence: CareerIntelligenceService,
    private readonly executionEngine: ExecutionEngineService,
  ) {}

  /**
   * Main conversational pipeline: User message -> Intent -> Context -> AI/Deterministic -> Action Proposal.
   */
  async sendMessage(userId: string, dto: SendMessageDto) {
    this.logger.log(
      `Processing Copilot query for user ${userId}: "${dto.message.substring(0, 40)}..."`,
    );

    // 1. Get or create conversation thread
    let conversation;
    if (dto.conversationId) {
      conversation = await this.prisma.copilotConversation.findFirst({
        where: { id: dto.conversationId, userId },
      });
      if (!conversation) {
        throw new NotFoundException('Conversation not found or unauthorized');
      }
    } else {
      conversation = await this.prisma.copilotConversation.create({
        data: {
          userId,
          title: dto.message.length > 45 ? `${dto.message.substring(0, 45)}...` : dto.message,
        },
      });
    }

    // 2. Persist User Message
    await this.prisma.copilotMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'USER',
        content: dto.message,
      },
    });

    // 3. Intent Understanding & Multi-Engine Routing
    const intentAnalysis = this.intentService.analyzeIntent(dto.message);

    // 4. Selective Context Retrieval & Grounding
    const contextBundle = await this.contextService.buildContextBundle(
      userId,
      intentAnalysis,
      dto.jobId,
    );

    // 5. Session Continuity & Follow-up Resolution
    const recentTurns = await this.memoryService.resolveRecentTurnContext(conversation.id);

    // 6. Generate Structured Grounded Response
    const response = await this.orchestratorService.generateResponse(
      dto.message,
      contextBundle,
      intentAnalysis,
      recentTurns,
    );

    // 7. If action proposal included, create persistent record
    let createdProposal: any = null;
    if (response.proposedAction) {
      createdProposal = await this.proposalService.createProposal({
        userId,
        conversationId: conversation.id,
        proposalType: response.proposedAction.proposalType,
        title: response.proposedAction.title,
        description: response.proposedAction.description,
        targetEngine: response.proposedAction.targetEngine,
        payload: response.proposedAction.payload,
      });
    }

    // 8. Persist Assistant Message
    const assistantMessage = await this.prisma.copilotMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'ASSISTANT',
        content: response.summary,
        intent: intentAnalysis.primaryIntent,
        answerType: response.answerType,
        confidence: response.confidence,
        groundingSources: contextBundle.groundingSources as any,
        evidenceSummary: response.evidence.join('; '),
        suggestedFollowUps: response.suggestedFollowUps,
        structuredPayload: {
          keyInsights: response.keyInsights,
          evidence: response.evidence,
          recommendedActions: response.recommendedActions,
          confidenceReason: response.confidenceReason,
          limitations: response.limitations,
          proposalId: createdProposal?.id,
        } as any,
      },
    });

    // 9. Emit Event
    await this.prisma.careerEvent.create({
      data: {
        userId,
        eventType: 'CopilotResponseGenerated',
        source: 'AI_COPILOT',
        entityType: 'CopilotConversation',
        entityId: conversation.id,
        importance: 'INFO',
        metadata: {
          intent: intentAnalysis.primaryIntent,
          confidence: response.confidence,
        },
      },
    });

    return {
      conversationId: conversation.id,
      messageId: assistantMessage.id,
      intent: intentAnalysis.primaryIntent,
      response,
      proposal: createdProposal,
      groundingSources: contextBundle.groundingSources,
    };
  }

  /**
   * Generates a personalized Copilot Home dashboard overview.
   */
  async getHomeSummary(userId: string): Promise<CopilotHomeSummary> {
    const [careerState, dailyPlan, oppCount, openGaps] = await Promise.all([
      this.careerIntelligence.buildCareerState(userId),
      this.executionEngine.getDailyPlan(userId),
      this.prisma.jobPosting.count({ where: { status: 'ACTIVE' } }),
      this.prisma.interviewSkillGap.count({ where: { userId } }),
    ]);

    const firstName = careerState.targetRole ? `for your ${careerState.targetRole} journey` : '';
    const greeting = `Welcome back! Here is your AI Career Intelligence summary ${firstName}.`;

    const topPriority = dailyPlan.nextBestAction?.action
      ? {
          title: dailyPlan.nextBestAction.action.title,
          estimatedMinutes: dailyPlan.nextBestAction.action.estimatedMinutes || 45,
          urgency: dailyPlan.nextBestAction.urgencyLabel || 'HIGH',
        }
      : undefined;

    return {
      greeting,
      currentRole: careerState.targetRole || 'Software Engineering Candidate',
      careerGoals: careerState.careerGoals || ['Land a top technical internship'],
      topPriority,
      activeOpportunitiesCount: oppCount,
      openSkillGapsCount: openGaps,
      recentContextTopics: [
        'Daily Task Prioritization',
        'Opportunity Relevance Check',
        'Skill Gap Mitigation',
      ],
      suggestedPrompts: [
        'What should I focus on today?',
        'What is my biggest weakness right now?',
        'Find internships matching my profile',
        'What happens if I spend the next month learning MLOps?',
        'Show my career progress so far',
      ],
    };
  }

  /**
   * Lists user conversation threads.
   */
  async getConversations(userId: string) {
    return this.prisma.copilotConversation.findMany({
      where: { userId },
      orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
      include: {
        _count: { select: { messages: true, proposals: true } },
      },
    });
  }

  /**
   * Retrieves full messages in a conversation.
   */
  async getConversation(userId: string, conversationId: string) {
    const conversation = await this.prisma.copilotConversation.findFirst({
      where: { id: conversationId, userId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        proposals: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found or unauthorized');
    }

    return conversation;
  }

  /**
   * Safely deletes a conversation thread without altering underlying career data.
   */
  async deleteConversation(userId: string, conversationId: string) {
    const conversation = await this.prisma.copilotConversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found or unauthorized');
    }

    await this.prisma.copilotConversation.delete({
      where: { id: conversationId },
    });

    return { success: true, message: 'Conversation deleted successfully' };
  }
}
