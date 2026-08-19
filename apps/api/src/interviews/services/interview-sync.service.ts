import { Injectable, Logger } from '@nestjs/common';

import {
  NotificationChannel,
  NotificationType,
} from '../../notifications/enums/notification.enums';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class InterviewSyncService {
  private readonly logger = new Logger(InterviewSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async onSessionCompleted(userId: string, sessionId: string) {
    const interview = await this.prisma.mockInterview.findUnique({
      where: { id: sessionId },
      include: { questions: true, job: { include: { company: true } } },
    });

    if (!interview) return;

    // Calculate final score
    const answered = interview.questions.filter((q) => q.overallScore !== null || q.score !== null);
    const avgScore =
      answered.length > 0
        ? Math.round(
            answered.reduce(
              (sum, q) => sum + (q.overallScore ? q.overallScore * 10 : q.score || 0),
              0,
            ) / answered.length,
          )
        : 0;

    // Identify weak areas from questions with score < 60
    const weakQuestions = answered.filter((q) =>
      q.overallScore ? q.overallScore < 6.0 : (q.score || 0) < 60,
    );
    const detectedWeakSkills = Array.from(
      new Set(weakQuestions.flatMap((q) => q.topicsCovered || [])),
    );

    await this.prisma.mockInterview.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        score: avgScore,
        completedAt: new Date(),
        weakAreas: detectedWeakSkills,
        feedback: `Completed ${answered.length} questions with an overall score of ${avgScore}%.`,
      },
    });

    // 1. Sync to Application Timeline (if linked application exists)
    if (interview.applicationId || interview.jobId) {
      const application = interview.applicationId
        ? await this.prisma.application.findUnique({ where: { id: interview.applicationId } })
        : interview.jobId
          ? await this.prisma.application.findUnique({
              where: { userId_jobId: { userId, jobId: interview.jobId } },
            })
          : null;

      if (application) {
        await this.prisma.applicationEvent.create({
          data: {
            applicationId: application.id,
            fromStatus: application.status,
            toStatus: application.status,
            note: `AI Mock Interview completed with score ${avgScore}%. Focus skills: ${detectedWeakSkills.join(', ') || 'General review'}.`,
          },
        });

        // Update application nextAction
        await this.prisma.application.update({
          where: { id: application.id },
          data: {
            nextAction: `Review interview report (${avgScore}% score)`,
            nextActionDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });
      }
    }

    // 2. Connect Skill Gaps to Learning System
    for (const skillName of detectedWeakSkills) {
      await this.prisma.interviewSkillGap.create({
        data: {
          userId,
          jobId: interview.jobId,
          skillName,
          gapSeverity: avgScore < 50 ? 'HIGH' : 'MEDIUM',
          recommendation: `Recommended practice module for ${skillName} based on recent mock interview score.`,
        },
      });

      // Link or create LearningGoal if skill exists in skill catalog
      try {
        const skill = await this.prisma.skill.findFirst({
          where: { name: { equals: skillName, mode: 'insensitive' } },
        });

        if (skill) {
          const existingGoal = await this.prisma.learningGoal.findFirst({
            where: { userId, targetSkillId: skill.id },
          });

          if (!existingGoal) {
            await this.prisma.learningGoal.create({
              data: {
                userId,
                targetSkillId: skill.id,
                title: `Master ${skill.name}`,
                priority: 'HIGH',
                status: 'ACTIVE',
                targetDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
              },
            });
          }
        }
      } catch (e) {
        this.logger.warn(`Failed to link skill gap ${skillName} to learning goal:`, e);
      }
    }

    // 3. Trigger Practice Completion Notification
    try {
      await this.notificationsService.queueNotification({
        userId,
        type: NotificationType.MOCK_INTERVIEW_COMPLETED,
        title: 'Mock Interview Completed! 🎉',
        message: `You scored ${avgScore}% on your ${interview.job?.title || 'Mock'} interview session. View your detailed report now.`,
        channel: NotificationChannel.PUSH,
      });
    } catch (e) {
      this.logger.warn('Failed to send session complete notification:', e);
    }
  }

  async sendInterviewApproachingReminders() {
    // Find applications in INTERVIEW status with nextActionDate in 24-48 hours
    const now = new Date();
    const targetWindow = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const upcomingApps = await this.prisma.application.findMany({
      where: {
        status: 'INTERVIEW',
        nextActionDate: { gte: now, lte: targetWindow },
      },
      include: { job: { include: { company: true } } },
    });

    for (const app of upcomingApps) {
      try {
        await this.notificationsService.queueNotification({
          userId: app.userId,
          type: NotificationType.INTERVIEW_APPROACHING,
          title: `Upcoming Interview: ${app.job.title}`,
          message: `Your interview at ${app.job.company.name} is approaching. Complete a mock practice session to boost your readiness score!`,
          channel: NotificationChannel.PUSH,
        });
      } catch (e) {
        this.logger.warn(`Failed to send interview approaching notification for app ${app.id}:`, e);
      }
    }
  }
}
