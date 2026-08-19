import { Injectable, NotFoundException, Logger } from '@nestjs/common';

import { jobInterviewTopicsPrompt } from '../../ai/prompts/mock-interview-template';
import { AiService } from '../../ai/services/ai.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class InterviewWorkspaceService {
  private readonly logger = new Logger(InterviewWorkspaceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  async getWorkspace(userId: string, jobId: string) {
    const job = await this.prisma.jobPosting.findUnique({
      where: { id: jobId },
      include: { company: true },
    });

    if (!job) {
      throw new NotFoundException('Job posting not found');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        resume: true,
        userSkills: { include: { skill: true } },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Linked application check
    const application = await this.prisma.application.findUnique({
      where: { userId_jobId: { userId, jobId } },
    });

    // Previous mock interviews for this job
    const previousInterviews = await this.prisma.mockInterview.findMany({
      where: { userId, jobId },
      include: { questions: true },
      orderBy: { createdAt: 'desc' },
    });

    // Topic performance history
    const topicPerformances = await this.prisma.interviewTopicPerformance.findMany({
      where: { userId, jobId },
    });

    // Extract or fetch topic categories
    const topics = await this.extractTopics(job);

    // Missing skills calculation
    const userSkillNames = new Set(user.userSkills.map((us) => us.skill.name.toLowerCase()));
    const requiredSkills = job.requirements || [];
    const missingSkills = requiredSkills.filter((req) => !userSkillNames.has(req.toLowerCase()));
    const userStrengths = requiredSkills.filter((req) => userSkillNames.has(req.toLowerCase()));

    // Readiness score computation
    const readiness = await this.calculateInterviewReadiness(
      userId,
      jobId,
      job,
      previousInterviews,
      userStrengths.length,
      requiredSkills.length,
    );

    // Deadline-aware plan
    const preparationPlan = await this.getOrCreatePreparationPlan(
      userId,
      jobId,
      job,
      missingSkills,
    );

    return {
      job: {
        id: job.id,
        title: job.title,
        companyName: job.company?.name || 'Tech Company',
        companyLogo: job.company?.logoUrl,
        location: job.location,
        workMode: job.workMode,
        description: job.description,
        requirements: job.requirements,
      },
      application: application
        ? {
            id: application.id,
            status: application.status,
            appliedAt: application.appliedAt,
            nextAction: application.nextAction,
            nextActionDate: application.nextActionDate,
          }
        : null,
      topics,
      userStrengths,
      missingSkills,
      readiness,
      preparationPlan,
      previousInterviews: previousInterviews.map((interview) => ({
        id: interview.id,
        interviewType: interview.interviewType,
        mode: interview.mode,
        status: interview.status,
        score: interview.score,
        questionsCount: interview.questions.length,
        createdAt: interview.createdAt,
      })),
      topicPerformances,
    };
  }

  private async extractTopics(job: any) {
    const provider = (this.aiService as any).aiProvider;
    if (!provider) {
      return {
        technicalTopics: job.requirements.slice(0, 5),
        behavioralTopics: ['Leadership', 'Problem Solving', 'Communication'],
        roleSpecificTopics: [job.title],
      };
    }

    try {
      let prompt = jobInterviewTopicsPrompt.userPromptTemplate;
      prompt = prompt
        .replace('{{title}}', job.title)
        .replace('{{description}}', job.description || job.requirements.join(', '));
      const resText = await provider.generateCompletion(
        jobInterviewTopicsPrompt.systemPrompt,
        prompt,
        { temperature: 0.3 },
      );
      return JSON.parse(resText);
    } catch (e) {
      this.logger.warn('AI topic extraction failed, using fallback:', e);
      return {
        technicalTopics: job.requirements.slice(0, 5),
        behavioralTopics: ['Leadership', 'Problem Solving', 'Teamwork'],
        roleSpecificTopics: [job.title],
      };
    }
  }

  private async calculateInterviewReadiness(
    _userId: string,
    _jobId: string,
    _job: any,
    mockInterviews: any[],
    strengthsCount: number,
    totalReqsCount: number,
  ) {
    const skillCoverage =
      totalReqsCount > 0 ? Math.round((strengthsCount / totalReqsCount) * 100) : 70;

    const completedMocks = mockInterviews.filter((m) => m.status === 'COMPLETED');
    const avgPracticeScore =
      completedMocks.length > 0
        ? Math.round(
            completedMocks.reduce((sum, m) => sum + (m.score || 0), 0) / completedMocks.length,
          )
        : 50;

    // Component weights
    const technicalReadiness = Math.round(skillCoverage * 0.6 + avgPracticeScore * 0.4);
    const roleAlignment = Math.min(100, Math.round(skillCoverage * 0.8 + 20));
    const behavioralReadiness = Math.min(100, 60 + completedMocks.length * 10);
    const communication = Math.min(100, 70 + completedMocks.length * 5);
    const confidence = Math.min(100, 65 + completedMocks.length * 7);

    // Overall Interview Readiness
    const overallReadiness = Math.round(
      technicalReadiness * 0.3 +
        roleAlignment * 0.2 +
        behavioralReadiness * 0.15 +
        skillCoverage * 0.15 +
        avgPracticeScore * 0.1 +
        communication * 0.1,
    );

    return {
      overallReadiness,
      technicalReadiness,
      roleAlignment,
      behavioralReadiness,
      communication,
      confidence,
      skillCoverage,
      practicePerformance: avgPracticeScore,
    };
  }

  private async getOrCreatePreparationPlan(
    userId: string,
    jobId: string,
    job: any,
    missingSkills: string[],
  ) {
    const existing = await this.prisma.preparationPlan.findUnique({
      where: { userId_jobId: { userId, jobId } },
      include: { tasks: true },
    });

    if (existing) return existing;

    // Fallback basic plan
    return this.prisma.preparationPlan.create({
      data: {
        userId,
        jobId,
        planSummary: `Preparation plan for ${job.title} targeting missing skills: ${missingSkills.slice(0, 3).join(', ')}`,
        tasks: {
          create: [
            { title: 'Technical core concepts review', category: 'TECHNICAL', priority: 'HIGH' },
            { title: 'Practice STAR behavioral stories', category: 'BEHAVIORAL', priority: 'HIGH' },
            {
              title: 'Company research and recent projects',
              category: 'COMPANY',
              priority: 'MEDIUM',
            },
            {
              title: 'Complete 1 full adaptive mock interview',
              category: 'TECHNICAL',
              priority: 'CRITICAL',
            },
          ],
        },
      },
      include: { tasks: true },
    });
  }
}
