import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PracticeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves practice activities for a skill. Supports adaptive difficulty based on
   * the user's latest consecutive correctness.
   */
  async getAdaptiveActivities(userId: string, skillId: string): Promise<any[]> {
    // 1. Fetch user's recent attempts for this skill to calculate current difficulty
    const recentAttempts = await this.prisma.practiceAttempt.findMany({
      where: {
        userId,
        activity: { skillId },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { isCorrect: true },
    });

    let currentDifficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' = 'BEGINNER';

    if (recentAttempts.length >= 3) {
      const correctCount = recentAttempts.slice(0, 3).filter((a) => a.isCorrect).length;
      const incorrectCount = recentAttempts.slice(0, 2).filter((a) => !a.isCorrect).length;

      if (correctCount === 3) {
        currentDifficulty = 'ADVANCED';
      } else if (incorrectCount === 2) {
        currentDifficulty = 'BEGINNER';
      } else {
        currentDifficulty = 'INTERMEDIATE';
      }
    }

    // 2. Fetch questions matching the adaptive difficulty
    return this.prisma.practiceActivity.findMany({
      where: {
        skillId,
        difficulty: currentDifficulty,
      },
      take: 5,
    });
  }

  /**
   * Submits a practice attempt and returns detailed feedback on answers.
   */
  async submitAttempt(
    userId: string,
    activityId: string,
    answer: string,
    timeSpentSeconds: number,
  ): Promise<any> {
    const activity = await this.prisma.practiceActivity.findUnique({
      where: { id: activityId },
    });
    if (!activity) {
      throw new NotFoundException(`Practice activity not found.`);
    }

    const isCorrect = activity.correctAnswer.trim().toLowerCase() === answer.trim().toLowerCase();
    const score = isCorrect ? 100.0 : 0.0;

    const attempt = await this.prisma.practiceAttempt.create({
      data: {
        userId,
        activityId,
        answer,
        isCorrect,
        score,
        timeSpentSeconds,
      },
    });

    // If correct, record a skill evidence point
    if (isCorrect && activity.skillId) {
      await this.prisma.skillEvidence.create({
        data: {
          userId,
          skillId: activity.skillId,
          evidenceType: 'QUIZ',
          referenceId: attempt.id,
          score: 100.0,
          description: `Passed practice quiz "${activity.title}"`,
        },
      });
    }

    return {
      attemptId: attempt.id,
      isCorrect,
      correctAnswer: activity.correctAnswer,
      explanation: activity.explanation,
    };
  }
}
