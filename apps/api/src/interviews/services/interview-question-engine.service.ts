import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InterviewMode, InterviewType, QuestionCategory, DifficultyLevel } from '@prisma/client';

import { adaptiveQuestionPrompt, hintPrompt } from '../../ai/prompts/mock-interview-template';
import { AiService } from '../../ai/services/ai.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class InterviewQuestionEngineService {
  private readonly logger = new Logger(InterviewQuestionEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  async startSession(
    userId: string,
    jobId: string,
    type: InterviewType = InterviewType.MIXED,
    mode: InterviewMode = InterviewMode.FULL_MOCK,
  ) {
    const job = await this.prisma.jobPosting.findUnique({
      where: { id: jobId },
      include: { company: true },
    });
    if (!job) throw new NotFoundException('Job posting not found');

    const application = await this.prisma.application.findUnique({
      where: { userId_jobId: { userId, jobId } },
    });

    const interview = await this.prisma.mockInterview.create({
      data: {
        userId,
        jobId,
        applicationId: application?.id || null,
        interviewType: type,
        mode,
        status: 'IN_PROGRESS',
        topics: job.requirements || [],
      },
    });

    const firstQuestion = await this.generateNextQuestion(interview.id);
    return { interview, firstQuestion };
  }

  async generateNextQuestion(interviewId: string) {
    const interview = await this.prisma.mockInterview.findUnique({
      where: { id: interviewId },
      include: { questions: { orderBy: { orderIndex: 'asc' } }, job: true },
    });

    if (!interview) throw new NotFoundException('Interview not found');

    const questionCount = interview.questions.length;
    const orderIndex = questionCount + 1;

    // Check mode limits
    const maxQuestions = interview.mode === InterviewMode.QUICK_PRACTICE ? 5 : 8;
    if (questionCount >= maxQuestions) {
      return null;
    }

    const previousQnA = interview.questions
      .map(
        (q) =>
          `Q: ${q.question}\nA: ${q.answer || 'Not answered'}\nScore: ${q.overallScore || q.score || 'N/A'}/10`,
      )
      .join('\n\n');

    const lastQuestion = interview.questions[interview.questions.length - 1];
    const lastScore =
      lastQuestion?.overallScore || (lastQuestion?.score ? lastQuestion.score / 10 : 7);

    const provider = (this.aiService as any).aiProvider;

    if (provider) {
      try {
        let userPrompt = adaptiveQuestionPrompt.userPromptTemplate;
        userPrompt = userPrompt
          .replace('{{role}}', interview.job?.title || 'Software Engineer')
          .replace(
            '{{jobDescription}}',
            interview.job?.description || (interview.job?.requirements || []).join(', '),
          )
          .replace('{{interviewType}}', interview.interviewType)
          .replace('{{previousQnA}}', previousQnA || 'None (First question)')
          .replace('{{lastScore}}', String(lastScore));

        const resText = await provider.generateCompletion(
          adaptiveQuestionPrompt.systemPrompt,
          userPrompt,
          { temperature: 0.7 },
        );
        const parsed = JSON.parse(resText);

        return this.prisma.mockInterviewQuestion.create({
          data: {
            interviewId,
            question: parsed.question,
            category: this.mapCategory(parsed.category),
            difficulty: this.mapDifficulty(parsed.difficulty),
            orderIndex,
            topicsCovered: parsed.skill ? [parsed.skill] : [],
          },
        });
      } catch (e) {
        this.logger.warn('AI adaptive question generation failed, using fallback:', e);
      }
    }

    // Deterministic fallback question bank
    const fallbackQuestions = this.getFallbackQuestionBank(
      interview.job?.title || 'Software Engineer',
      interview.job?.requirements || [],
    );
    const fallback =
      fallbackQuestions[questionCount % fallbackQuestions.length] || fallbackQuestions[0];
    if (!fallback) throw new NotFoundException('No questions available');

    return this.prisma.mockInterviewQuestion.create({
      data: {
        interviewId,
        question: fallback.question,
        category: fallback.category,
        difficulty: fallback.difficulty,
        orderIndex,
        topicsCovered: [fallback.skill],
      },
    });
  }

  async getHint(questionId: string, levelRequested: number) {
    const question = await this.prisma.mockInterviewQuestion.findUnique({
      where: { id: questionId },
    });

    if (!question) throw new NotFoundException('Question not found');

    const provider = (this.aiService as any).aiProvider;
    let hintText = `Focus on explaining your reasoning step-by-step and structuring your response cleanly.`;

    if (provider) {
      try {
        let prompt = hintPrompt.userPromptTemplate;
        prompt = prompt
          .replace('{{question}}', question.question)
          .replace('{{level}}', String(levelRequested));
        const resText = await provider.generateCompletion(hintPrompt.systemPrompt, prompt, {
          temperature: 0.5,
        });
        const parsed = JSON.parse(resText);
        hintText = parsed.hint;
      } catch (e) {
        this.logger.warn('AI hint generation failed:', e);
      }
    }

    await this.prisma.mockInterviewQuestion.update({
      where: { id: questionId },
      data: {
        hintUsed: true,
        hintsGiven: { increment: 1 },
      },
    });

    return { hint: hintText, level: levelRequested };
  }

  private mapCategory(cat: string): QuestionCategory {
    const valid = Object.values(QuestionCategory);
    return valid.includes(cat as any) ? (cat as QuestionCategory) : QuestionCategory.TECHNICAL;
  }

  private mapDifficulty(diff: string): DifficultyLevel {
    const valid = Object.values(DifficultyLevel);
    return valid.includes(diff as any) ? (diff as DifficultyLevel) : DifficultyLevel.MEDIUM;
  }

  private getFallbackQuestionBank(_title: string, requirements: string[]) {
    return [
      {
        question: `Can you describe a challenging project you built using ${requirements[0] || 'core technologies'} and how you handled key architectural choices?`,
        category: QuestionCategory.PROJECT,
        difficulty: DifficultyLevel.MEDIUM,
        skill: requirements[0] || 'Software Architecture',
      },
      {
        question: `Tell me about a time when you faced a difficult conflict within your engineering team. How did you resolve it?`,
        category: QuestionCategory.BEHAVIORAL,
        difficulty: DifficultyLevel.MEDIUM,
        skill: 'Conflict Resolution',
      },
      {
        question: `How do you optimize application performance and diagnose bottlenecks in production environments?`,
        category: QuestionCategory.TECHNICAL,
        difficulty: DifficultyLevel.HARD,
        skill: 'Performance Optimization',
      },
      {
        question: `Describe a situation where a technical requirement changed late in a sprint or project timeline. What was your response?`,
        category: QuestionCategory.SITUATIONAL,
        difficulty: DifficultyLevel.MEDIUM,
        skill: 'Adaptability',
      },
      {
        question: `Walk me through your approach to testing, code review, and ensuring code reliability before deployment.`,
        category: QuestionCategory.ROLE_SPECIFIC,
        difficulty: DifficultyLevel.EASY,
        skill: 'Code Quality',
      },
    ];
  }
}
