import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InterviewStatus } from '@prisma/client';

import { AiService } from '../ai/services/ai.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InterviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  async startMockInterview(userId: string, jobId: string) {
    const job = await this.prisma.jobPosting.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');

    const interview = await this.prisma.mockInterview.create({
      data: {
        userId,
        jobId,
        status: InterviewStatus.IN_PROGRESS,
      },
    });

    // Generate first question
    const firstQuestion = await this.generateNextQuestion(interview.id);

    return { interview, firstQuestion };
  }

  async getInterview(interviewId: string, userId: string) {
    const interview = await this.prisma.mockInterview.findUnique({
      where: { id: interviewId },
      include: {
        questions: { orderBy: { orderIndex: 'asc' } },
        job: true,
      },
    });

    if (!interview || interview.userId !== userId) {
      throw new NotFoundException('Interview not found');
    }

    return interview;
  }

  async submitAnswer(userId: string, interviewId: string, questionId: string, answer: string) {
    const interview = await this.getInterview(interviewId, userId);

    if (interview.status !== InterviewStatus.IN_PROGRESS) {
      throw new BadRequestException('Interview is no longer in progress');
    }

    const question = await this.prisma.mockInterviewQuestion.findUnique({
      where: { id: questionId },
    });

    if (!question || question.interviewId !== interviewId) {
      throw new NotFoundException('Question not found');
    }

    // Evaluate answer with AI
    const evaluationPrompt = `
      Act as an expert technical interviewer for the role of ${interview.job?.title || 'Software Engineer'} at ${(interview.job as any)?.company?.name || 'a tech company'}.
      I asked the candidate: "${question.question}"
      The candidate answered: "${answer}"
      
      Evaluate their answer based on the STAR method. Provide brief, constructive feedback and give a score out of 10.
      Format your response exactly as:
      Score: [number]
      Feedback: [your feedback]
    `;

    const aiResponse = await this.aiService.generateCompletion({
      prompt: evaluationPrompt,
      userId,
      useCache: false,
    });

    const scoreMatch = aiResponse.text.match(/Score:\s*(\d+)/i);
    const score = scoreMatch?.[1] ? parseInt(scoreMatch[1], 10) : 5;

    const feedbackMatch = aiResponse.text.match(/Feedback:\s*(.*)/is);
    const feedback = feedbackMatch?.[1] ? feedbackMatch[1].trim() : aiResponse.text;

    await this.prisma.mockInterviewQuestion.update({
      where: { id: questionId },
      data: {
        answer,
        feedback,
        score,
      },
    });

    // Generate next question or end interview if 5 questions reached
    if (interview.questions.length >= 5) {
      await this.endInterview(interviewId);
      return { completed: true, feedback, score };
    } else {
      const nextQuestion = await this.generateNextQuestion(interviewId);
      return { completed: false, feedback, score, nextQuestion };
    }
  }

  private async generateNextQuestion(interviewId: string) {
    const interview = await this.prisma.mockInterview.findUnique({
      where: { id: interviewId },
      include: { questions: true, job: true },
    });

    if (!interview) throw new NotFoundException('Interview not found');

    const previousQuestions = interview.questions.map((q) => q.question).join('\n');
    const orderIndex = interview.questions.length + 1;

    const prompt = `
      Act as an expert technical interviewer for the role of ${interview.job?.title || 'Software Engineer'} at ${(interview.job as any)?.company?.name || 'a tech company'}.
      Job Description: ${interview.job?.description || ''}
      
      You have already asked these questions:
      ${previousQuestions}
      
      Ask the next interview question. It should be a challenging behavioral or technical question tailored to the job description. Do not repeat previous questions. Provide only the question text.
    `;

    const aiResponse = await this.aiService.generateCompletion({
      prompt,
      userId: interview.userId,
      useCache: false,
    });

    const questionText = aiResponse.text.trim().replace(/^['"]|['"]$/g, '');

    return this.prisma.mockInterviewQuestion.create({
      data: {
        interviewId,
        question: questionText,
        orderIndex,
      },
    });
  }

  private async endInterview(interviewId: string) {
    const interview = await this.prisma.mockInterview.findUnique({
      where: { id: interviewId },
      include: { questions: true },
    });

    if (!interview) return;

    const answeredQuestions = interview.questions.filter((q) => q.score !== null);
    const totalScore = answeredQuestions.reduce((sum, q) => sum + (q.score || 0), 0);
    const averageScore =
      answeredQuestions.length > 0
        ? Math.round((totalScore / (answeredQuestions.length * 10)) * 100)
        : 0;

    await this.prisma.mockInterview.update({
      where: { id: interviewId },
      data: {
        status: InterviewStatus.COMPLETED,
        score: averageScore,
        feedback: `You completed the interview with an average score of ${averageScore}%.`,
      },
    });
  }
}
