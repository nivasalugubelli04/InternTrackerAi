import { Injectable, NotFoundException } from '@nestjs/common';
import { InterviewType, InterviewMode } from '@prisma/client';

import { interviewCoachPrompt } from '../ai/prompts/mock-interview-template';
import { AiService } from '../ai/services/ai.service';
import { PrismaService } from '../prisma/prisma.service';

import { InterviewEvaluationService } from './services/interview-evaluation.service';
import { InterviewQuestionEngineService } from './services/interview-question-engine.service';
import { InterviewReadinessService } from './services/interview-readiness.service';
import { InterviewSyncService } from './services/interview-sync.service';
import { InterviewWorkspaceService } from './services/interview-workspace.service';

@Injectable()
export class InterviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly workspaceService: InterviewWorkspaceService,
    private readonly questionEngine: InterviewQuestionEngineService,
    private readonly evaluationService: InterviewEvaluationService,
    private readonly readinessService: InterviewReadinessService,
    private readonly syncService: InterviewSyncService,
  ) {}

  // ── Backward Compatible / High-level Methods ──────────────────────────────

  async startMockInterview(
    userId: string,
    jobId: string,
    type: InterviewType = InterviewType.MIXED,
    mode: InterviewMode = InterviewMode.FULL_MOCK,
  ) {
    return this.questionEngine.startSession(userId, jobId, type, mode);
  }

  async getInterview(interviewId: string, userId: string) {
    const interview = await this.prisma.mockInterview.findUnique({
      where: { id: interviewId },
      include: {
        questions: { orderBy: { orderIndex: 'asc' } },
        job: { include: { company: true } },
        application: true,
      },
    });

    if (!interview || interview.userId !== userId) {
      throw new NotFoundException('Interview not found');
    }

    return interview;
  }

  async submitAnswer(userId: string, interviewId: string, questionId: string, answer: string) {
    const result = await this.evaluationService.submitAndEvaluateAnswer(
      userId,
      interviewId,
      questionId,
      answer,
    );
    const nextQuestion = await this.questionEngine.generateNextQuestion(interviewId);

    if (!nextQuestion) {
      await this.syncService.onSessionCompleted(userId, interviewId);
      return { completed: true, ...result };
    }

    return { completed: false, ...result, nextQuestion };
  }

  // ── Phase 34 Complete API Extensions ─────────────────────────────────────

  async getUserInterviews(userId: string) {
    return this.prisma.mockInterview.findMany({
      where: { userId },
      include: {
        job: { include: { company: true } },
        questions: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPreparationWorkspace(userId: string, jobId: string) {
    return this.workspaceService.getWorkspace(userId, jobId);
  }

  async getInterviewReadiness(userId: string, jobId?: string) {
    return this.readinessService.getReadiness(userId, jobId);
  }

  async getHint(questionId: string, level: number) {
    return this.questionEngine.getHint(questionId, level);
  }

  async finishInterview(userId: string, sessionId: string) {
    await this.syncService.onSessionCompleted(userId, sessionId);
    return this.getInterview(sessionId, userId);
  }

  async getSessionReport(userId: string, sessionId: string) {
    const interview = await this.getInterview(sessionId, userId);
    const readiness = await this.readinessService.getReadiness(
      userId,
      interview.jobId || undefined,
    );

    const answered = interview.questions.filter((q) => q.score !== null || q.overallScore !== null);
    const avgScore =
      answered.length > 0
        ? Math.round(
            answered.reduce(
              (sum, q) => sum + (q.score || Math.round((q.overallScore || 0) * 10)),
              0,
            ) / answered.length,
          )
        : 0;

    const categoryBreakdown: Record<string, { count: number; totalScore: number }> = {};
    for (const q of answered) {
      const cat = q.category || 'TECHNICAL';
      if (!categoryBreakdown[cat]) categoryBreakdown[cat] = { count: 0, totalScore: 0 };
      categoryBreakdown[cat].count++;
      categoryBreakdown[cat].totalScore += q.score || Math.round((q.overallScore || 0) * 10);
    }

    const categories = Object.entries(categoryBreakdown).map(([category, data]) => ({
      category,
      averageScore: Math.round(data.totalScore / data.count),
    }));

    return {
      session: {
        id: interview.id,
        interviewType: interview.interviewType,
        mode: interview.mode,
        status: interview.status,
        score: avgScore,
        completedAt: interview.completedAt || interview.updatedAt,
      },
      job: interview.job
        ? {
            id: interview.job.id,
            title: interview.job.title,
            companyName: interview.job.company?.name || 'Company',
          }
        : null,
      readiness,
      questions: interview.questions,
      categoryBreakdown: categories,
      weakAreas: interview.weakAreas || readiness.weakAreas,
      strongAreas: interview.strongAreas || readiness.strongAreas,
    };
  }

  async chatWithCoach(_userId: string, jobId: string, message: string) {
    const job = await this.prisma.jobPosting.findUnique({
      where: { id: jobId },
      include: { company: true },
    });

    const context = `Role: ${job?.title || 'Software Engineer'} at ${job?.company?.name || 'Tech Company'}. Requirements: ${(job?.requirements || []).slice(0, 5).join(', ')}`;
    const provider = (this.aiService as any).aiProvider;

    if (!provider) {
      return {
        reply: `Here is a quick coach tip for ${job?.title || 'this role'}: Be sure to outline your approach clearly, reference key technologies, and use quantitative results in your STAR behavioral stories.`,
      };
    }

    try {
      let prompt = interviewCoachPrompt.userPromptTemplate;
      prompt = prompt.replace('{{context}}', context).replace('{{userMessage}}', message);
      const reply = await provider.generateCompletion(interviewCoachPrompt.systemPrompt, prompt, {
        temperature: 0.7,
      });
      return { reply: reply.trim() };
    } catch (e) {
      return {
        reply: `I'm having trouble connecting right now. Keep focusing on practicing STAR stories and reviewing core technical concepts for ${job?.title || 'your role'}.`,
      };
    }
  }
}
