import { Injectable, Logger } from '@nestjs/common';

import { AiService } from '../../ai/services/ai.service';
import { PrismaService } from '../../prisma/prisma.service';

import { ActionOrchestrationService } from './action-orchestration.service';
import { CareerCenterService } from './career-center.service';

@Injectable()
export class CareerCenterAiService {
  private readonly logger = new Logger(CareerCenterAiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly careerCenter: CareerCenterService,
    private readonly actionOrchestrator: ActionOrchestrationService,
  ) {}

  /**
   * Grounded chatbot assistant. Evaluates query intent, queries matching DB entities,
   * compiles context rules, and returns a verified grounded response.
   */
  async handleChat(
    userId: string,
    message: string,
    conversationId?: string,
    jobId?: string,
  ): Promise<any> {
    this.logger.log(`Handling AI Career Chat query for user: ${userId}`);
    // 1. Analyze query intent to optimize context payload
    const query = message.toLowerCase();
    let dbContextStr = 'No specific database records queried.';
    const dataGathered: Record<string, any> = {};

    if (query.includes('interview') || query.includes('prepare') || query.includes('schedule')) {
      const data = await this.careerCenter.getInterviewsSummary(userId);
      dataGathered['interviews'] = data;
      dbContextStr = `Upcoming Recruiter/Hiring Interviews:\n${JSON.stringify(data)}`;
    } else if (query.includes('skill') || query.includes('gap') || query.includes('learn')) {
      const gaps = await this.careerCenter.getSkillGapsSummary(userId);
      const summary = await this.careerCenter.getLearningSummary(userId);
      dataGathered['skillGaps'] = gaps;
      dataGathered['learningSummary'] = summary;
      dbContextStr = `Top Skill Gaps:\n${JSON.stringify(gaps)}\nLearning Roadmap Status:\n${JSON.stringify(summary)}`;
    } else if (
      query.includes('application') ||
      query.includes('apply') ||
      query.includes('track')
    ) {
      const data = await this.careerCenter.getApplicationsSummary(userId);
      dataGathered['applications'] = data;
      dbContextStr = `Applications Summary counts:\n${JSON.stringify(data)}`;
    } else if (
      query.includes('opportunity') ||
      query.includes('internship') ||
      query.includes('match')
    ) {
      const data = await this.careerCenter.getOpportunities(userId);
      dataGathered['opportunities'] = data;
      dbContextStr = `Top Matching Internships:\n${JSON.stringify(data)}`;
    } else if (
      query.includes('action') ||
      query.includes('today') ||
      query.includes('do') ||
      query.includes('task')
    ) {
      const data = await this.actionOrchestrator.getPrioritizedActions(userId);
      dataGathered['actions'] = data;
      dbContextStr = `Today's Prioritized Actions:\n${JSON.stringify(data)}`;
    } else {
      // Fallback: lean profile + actions
      const profileSummary = await this.careerCenter.getSummary(userId);
      const actions = await this.actionOrchestrator.getPrioritizedActions(userId);
      dataGathered['profile'] = profileSummary;
      dataGathered['actions'] = actions;
      dbContextStr = `User Career overview summary:\n${JSON.stringify(profileSummary)}\nPrioritized Actions:\n${JSON.stringify(actions)}`;
    }

    // 2. Fetch or create conversation
    let convId = conversationId;
    let conversation;
    if (convId) {
      conversation = await this.prisma.aiConversation.findFirst({
        where: { id: convId, userId },
      });
    }

    if (!conversation) {
      conversation = await this.prisma.aiConversation.create({
        data: {
          userId,
          title: message.substring(0, 50) + '...',
          contextType: jobId ? 'JOB' : 'NONE',
          contextId: jobId ? jobId : null,
        },
      });
      convId = conversation.id;
    }

    if (!convId) {
      throw new Error('Failed to resolve conversation ID');
    }
    const activeConvId = convId;

    // Save user message
    await this.prisma.aiMessage.create({
      data: {
        conversationId: activeConvId,
        role: 'user',
        content: message,
      },
    });

    // Get previous messages (last 6 for context)
    const history = await this.prisma.aiMessage.findMany({
      where: { conversationId: activeConvId },
      orderBy: { createdAt: 'asc' },
      take: 6,
    });
    const historyPrompt = history
      .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');

    // 3. Compile prompts with strict grounding rules
    const systemPrompt = `You are a grounded Career Assistant at InternTracker AI.
You have access to the following VERIFIED DATABASE RECORDS for this student:
${dbContextStr}

STRICT GROUNDING & SAFETY RULES:
1. Distinguish between:
   - Verified platform data: The database records provided above (dates, names, status, scores).
   - User-provided information: Statements the user makes in the chat conversation.
   - AI-generated recommendations: Suggestions you make for goals or practice.
   - Unknown information: If a date, score, or detail is not present in the database records, state that you do not have that information. DO NOT hallucinate it.
2. Example: If the user has an interview tomorrow, you must confirm it in the database records. If the database record does not show it, state that the database doesn't show a scheduled interview.
3. Suggest actions (e.g. "Practice mock interview", "Open learning module") as options but explain that they require user confirmation.
4. You MUST NOT perform high-impact actions like applying to jobs, updating profile preferences, changing notification settings, or deleting data. If the user requests this, explain that they must do it themselves in their Settings dashboard.
5. Keep your responses highly structured, bulleted, and extremely concise. Avoid motivational speeches.`;

    const userPrompt = `${historyPrompt}\nUser: ${message}\nAssistant:`;

    // 4. Generate AI response using underlying provider
    const provider = (this.aiService as any).aiProvider;
    const aiResult = await provider.generateText(userPrompt, systemPrompt);

    // Save assistant message
    const savedMessage = await this.prisma.aiMessage.create({
      data: {
        conversationId: activeConvId,
        role: 'assistant',
        content: aiResult.text,
        provider: this.aiService['aiConfig'].provider,
        model: aiResult.model,
        tokenUsage: aiResult.usage,
      },
    });

    return {
      conversationId: activeConvId,
      message: savedMessage,
      contextUsed: dataGathered,
    };
  }

  /**
   * Generates a daily career summary brief based on actions, interviews, and learning.
   */
  async generateDailyBrief(userId: string): Promise<string> {
    const [actions, interviews, learning, summary] = await Promise.all([
      this.actionOrchestrator.getPrioritizedActions(userId),
      this.careerCenter.getInterviewsSummary(userId),
      this.careerCenter.getLearningSummary(userId),
      this.careerCenter.getSummary(userId),
    ]);

    const context = {
      actions,
      interviews,
      learning,
      targetRole: summary?.targetRole || 'Software Engineer Intern',
    };

    const systemPrompt = `You are a career summary assistant. Summarize today's outlook for this student.
Keep it extremely brief and factual. Structure it exactly as:
- TODAY'S TOP PRIORITY: [the urgent/high priority action]
- OPPORTUNITIES: [brief matched jobs summary]
- DEADLINES & INTERVIEWS: [brief assessment/interview summary]
- LEARNING & PRACTICE: [roadmap module details]
Do NOT write any generic motivational content.`;

    const userPrompt = `Student Context data:\n${JSON.stringify(context)}`;

    const provider = (this.aiService as any).aiProvider;
    const result = await provider.generateText(userPrompt, systemPrompt);
    return result.text;
  }

  /**
   * Generates a step-by-step plan for the day fitting within the time budget.
   */
  async generateActionPlan(userId: string, timeBudgetMinutes = 30): Promise<string> {
    const actions = await this.actionOrchestrator.getPrioritizedActions(userId);

    const context = {
      timeBudgetMinutes,
      actions,
    };

    const systemPrompt = `You are a Career Action Planner. Build a sequential career development schedule for today that fits exactly within the student's time budget of ${timeBudgetMinutes} minutes.
Distribute the minutes across the prioritized actions. Format it as a simple time table (e.g., "10 mins: Complete practice task", "20 mins: Review matched job").
If the budget is too small for all tasks, prioritize the ones with URGENT or HIGH priority. Factual only.`;

    const userPrompt = `Actions list:\n${JSON.stringify(context)}`;

    const provider = (this.aiService as any).aiProvider;
    const result = await provider.generateText(userPrompt, systemPrompt);
    return result.text;
  }
}
