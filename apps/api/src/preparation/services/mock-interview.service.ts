import { Injectable } from '@nestjs/common';
import { InterviewStatus } from '@prisma/client';

import {
  mockInterviewQuestionPrompt,
  mockInterviewEvaluationPrompt,
} from '../../ai/prompts/mock-interview-template';
import { AiService } from '../../ai/services/ai.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MockInterviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  async startInterview(userId: string, jobId: string) {
    const job = await this.prisma.jobPosting.findUnique({ where: { id: jobId } });
    if (!job) throw new Error('Job not found');

    const provider = (this.aiService as any).aiProvider;
    const system = mockInterviewQuestionPrompt.systemPrompt;
    let userPrompt = mockInterviewQuestionPrompt.userPromptTemplate;
    userPrompt = userPrompt.replace('{{jobRequirements}}', JSON.stringify(job.requirements));
    userPrompt = userPrompt.replace('{{userProfile}}', 'General Software Engineering Candidate');

    let aiResultText = '';
    try {
      aiResultText = await provider.generateCompletion(system, userPrompt, { temperature: 0.7 });
    } catch (e) {
      throw new Error('Failed to generate interview questions');
    }

    let parsedQuestions;
    try {
      parsedQuestions = JSON.parse(aiResultText);
    } catch (e) {
      throw new Error('AI output was not valid JSON');
    }

    const interview = await this.prisma.mockInterview.create({
      data: {
        userId,
        jobId,
        status: InterviewStatus.IN_PROGRESS,
        questions: {
          create: parsedQuestions.map((q: any, i: number) => ({
            question: q.question,
            orderIndex: i,
          })),
        },
      },
      include: { questions: true },
    });

    return interview;
  }

  async answerQuestion(userId: string, questionId: string, answer: string) {
    const question = await this.prisma.mockInterviewQuestion.findUnique({
      where: { id: questionId },
      include: { interview: true },
    });

    if (!question || question.interview.userId !== userId) {
      throw new Error('Question not found');
    }

    const provider = (this.aiService as any).aiProvider;
    const system = mockInterviewEvaluationPrompt.systemPrompt;
    let userPrompt = mockInterviewEvaluationPrompt.userPromptTemplate;
    userPrompt = userPrompt.replace('{{question}}', question.question);
    userPrompt = userPrompt.replace('{{answer}}', answer);

    let aiResultText = '';
    try {
      aiResultText = await provider.generateCompletion(system, userPrompt, { temperature: 0.3 });
    } catch (e) {
      throw new Error('Failed to evaluate answer');
    }

    let parsedEval;
    try {
      parsedEval = JSON.parse(aiResultText);
    } catch (e) {
      throw new Error('AI output was not valid JSON');
    }

    return this.prisma.mockInterviewQuestion.update({
      where: { id: questionId },
      data: {
        answer,
        feedback: parsedEval.feedback,
        score: parsedEval.score,
      },
    });
  }

  async finishInterview(userId: string, interviewId: string) {
    const interview = await this.prisma.mockInterview.findUnique({
      where: { id: interviewId },
      include: { questions: true },
    });

    if (!interview || interview.userId !== userId) {
      throw new Error('Interview not found');
    }

    const answered = interview.questions.filter((q) => q.score !== null);
    const avgScore =
      answered.length > 0
        ? Math.round(answered.reduce((sum, q) => sum + (q.score || 0), 0) / answered.length)
        : 0;

    return this.prisma.mockInterview.update({
      where: { id: interviewId },
      data: {
        status: InterviewStatus.COMPLETED,
        score: avgScore,
        feedback: `Completed ${answered.length} out of ${interview.questions.length} questions.`,
      },
    });
  }

  async getInterviewReport(userId: string, interviewId: string) {
    const interview = await this.prisma.mockInterview.findUnique({
      where: { id: interviewId },
      include: { questions: { orderBy: { orderIndex: 'asc' } } },
    });

    if (!interview || interview.userId !== userId) {
      throw new Error('Interview not found');
    }

    return interview;
  }
}
