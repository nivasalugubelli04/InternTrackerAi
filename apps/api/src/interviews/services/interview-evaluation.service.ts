import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';

import { mockInterviewEvaluationPrompt } from '../../ai/prompts/mock-interview-template';
import { AiService } from '../../ai/services/ai.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class InterviewEvaluationService {
  private readonly logger = new Logger(InterviewEvaluationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  async submitAndEvaluateAnswer(
    userId: string,
    sessionId: string,
    questionId: string,
    answer: string,
  ) {
    const interview = await this.prisma.mockInterview.findUnique({
      where: { id: sessionId },
      include: { job: true },
    });

    if (!interview || interview.userId !== userId) {
      throw new NotFoundException('Interview session not found');
    }

    if (interview.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Interview session is no longer in progress');
    }

    const question = await this.prisma.mockInterviewQuestion.findUnique({
      where: { id: questionId },
    });

    if (!question || question.interviewId !== sessionId) {
      throw new NotFoundException('Question not found');
    }

    const provider = (this.aiService as any).aiProvider;
    let evalResult: any = null;

    if (provider) {
      try {
        let userPrompt = mockInterviewEvaluationPrompt.userPromptTemplate;
        userPrompt = userPrompt
          .replace('{{role}}', interview.job?.title || 'Software Engineer Candidate')
          .replace('{{question}}', question.question)
          .replace('{{category}}', question.category)
          .replace('{{answer}}', answer);

        const resText = await provider.generateCompletion(
          mockInterviewEvaluationPrompt.systemPrompt,
          userPrompt,
          { temperature: 0.3 },
        );
        evalResult = JSON.parse(resText);
      } catch (e) {
        this.logger.warn('AI answer evaluation failed, using heuristic evaluation:', e);
      }
    }

    // Fallback heuristic evaluation if AI fails or returns invalid structure
    if (!evalResult) {
      evalResult = this.heuristicEvaluation(answer, question.category);
    }

    const updatedQuestion = await this.prisma.mockInterviewQuestion.update({
      where: { id: questionId },
      data: {
        answer,
        feedback: evalResult.feedback,
        score: Math.round(
          evalResult.score || (evalResult.overallScore ? evalResult.overallScore * 10 : 75),
        ),
        overallScore: evalResult.overallScore || 7.5,
        clarityScore: evalResult.clarityScore || 8.0,
        structureScore: evalResult.structureScore || 7.5,
        depthScore: evalResult.depthScore || 7.0,
        modelAnswer:
          evalResult.modelAnswer || 'Focus on structured STAR framework and quantitative metrics.',
        starAnalysis: evalResult.starAnalysis || null,
        technicalAnalysis: evalResult.technicalAnalysis || null,
      },
    });

    // Also update topic performance tracking
    if (question.topicsCovered && question.topicsCovered.length > 0) {
      for (const topic of question.topicsCovered) {
        await this.updateTopicPerformance(
          userId,
          interview.jobId,
          topic,
          updatedQuestion.overallScore || 7.5,
        );
      }
    }

    return {
      evaluatedQuestion: updatedQuestion,
      feedback: evalResult.feedback,
      score: updatedQuestion.score,
      overallScore: updatedQuestion.overallScore,
      starAnalysis: evalResult.starAnalysis,
      technicalAnalysis: evalResult.technicalAnalysis,
      modelAnswer: evalResult.modelAnswer,
      strongAreas: evalResult.strongAreas || [],
      weakAreas: evalResult.weakAreas || [],
      recommendedImprovements: evalResult.recommendedImprovements || [],
    };
  }

  private heuristicEvaluation(answer: string, category: string) {
    const wordCount = answer.trim().split(/\s+/).length;
    const hasSituation = /situation|when|context|background|project/i.test(answer);
    const hasAction = /i did|i built|i designed|i created|i implemented|my role/i.test(answer);
    const hasResult = /result|outcome|metric|improved|increased|achieved|percent|%/i.test(answer);

    const isBehavioral = category === 'BEHAVIORAL' || category === 'SITUATIONAL';
    const score = Math.min(
      95,
      Math.max(50, wordCount * 0.8 + (hasResult ? 15 : 0) + (hasAction ? 10 : 0)),
    );
    const overallScore = Math.round((score / 10) * 10) / 10;

    return {
      score: Math.round(score),
      overallScore,
      clarityScore: wordCount > 30 ? 8.0 : 6.0,
      structureScore: isBehavioral && hasSituation && hasAction ? 8.5 : 7.0,
      depthScore: wordCount > 60 ? 8.0 : 6.0,
      feedback: `Your response provides good clarity (${wordCount} words). ${!hasResult ? 'To strengthen it further, explicitly mention the quantitative outcome or result.' : 'Great job including impact.'}`,
      strongAreas: [hasAction ? 'Clear personal contribution' : 'Relevant topic focus'],
      weakAreas: [!hasResult ? 'Missing quantifiable results' : 'Could elaborate trade-offs'],
      recommendedImprovements: ['Use the STAR method: Situation, Task, Action, Result.'],
      modelAnswer:
        'Example: "In my previous role (Situation), we needed to optimize query performance (Task). I indexed key columns and refactored joins (Action), reducing latency by 45% (Result)."',
      starAnalysis: isBehavioral
        ? {
            situation: hasSituation,
            task: hasSituation,
            action: hasAction,
            result: hasResult,
            feedback: hasResult
              ? 'Strong STAR coverage.'
              : 'Consider adding a specific quantitative Result.',
          }
        : null,
      technicalAnalysis: !isBehavioral
        ? {
            correctnessScore: overallScore,
            depthScore: wordCount > 50 ? 8.5 : 6.5,
            reasoningScore: 7.5,
            tradeoffsScore: 7.0,
            feedback:
              'Sound technical reasoning. Highlight architectural trade-offs to demonstrate seniority.',
          }
        : null,
    };
  }

  private async updateTopicPerformance(
    userId: string,
    jobId: string | null,
    topic: string,
    score: number,
  ) {
    try {
      const existing = await this.prisma.interviewTopicPerformance.findUnique({
        where: { userId_topic: { userId, topic } },
      });

      if (existing) {
        const newTotal = existing.totalAsked + 1;
        const newAvg = (existing.avgScore * existing.totalAsked + score) / newTotal;
        await this.prisma.interviewTopicPerformance.update({
          where: { id: existing.id },
          data: {
            avgScore: Math.round(newAvg * 10) / 10,
            totalAsked: newTotal,
            lastTested: new Date(),
          },
        });
      } else {
        await this.prisma.interviewTopicPerformance.create({
          data: {
            userId,
            jobId,
            topic,
            avgScore: score,
            totalAsked: 1,
          },
        });
      }
    } catch (e) {
      this.logger.warn('Failed to update topic performance record:', e);
    }
  }
}
