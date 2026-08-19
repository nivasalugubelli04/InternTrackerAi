import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

export interface InterviewReadinessBreakdown {
  overallReadiness: number;
  technicalReadiness: number;
  roleAlignment: number;
  behavioralReadiness: number;
  communication: number;
  confidence: number;
  skillCoverage: number;
  practicePerformance: number;
  completedMockCount: number;
  strongAreas: string[];
  weakAreas: string[];
  recommendedActions: string[];
}

@Injectable()
export class InterviewReadinessService {
  constructor(private readonly prisma: PrismaService) {}

  async getReadiness(userId: string, jobId?: string): Promise<InterviewReadinessBreakdown> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userSkills: { include: { skill: true } },
        mockInterviews: {
          where: { ...(jobId ? { jobId } : {}) },
          include: { questions: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    let jobRequirements: string[] = [];
    if (jobId) {
      const job = await this.prisma.jobPosting.findUnique({ where: { id: jobId } });
      if (job?.requirements) jobRequirements = job.requirements;
    }

    const userSkillNames = new Set(user.userSkills.map((us) => us.skill.name.toLowerCase()));
    const strongSkills = jobRequirements.filter((req) => userSkillNames.has(req.toLowerCase()));
    const missingSkills = jobRequirements.filter((req) => !userSkillNames.has(req.toLowerCase()));

    const skillCoverage =
      jobRequirements.length > 0
        ? Math.round((strongSkills.length / jobRequirements.length) * 100)
        : 75;

    const completedMocks = user.mockInterviews.filter((m) => m.status === 'COMPLETED');
    const mockScores = completedMocks.map((m) => m.score || 0);
    const avgPracticeScore =
      mockScores.length > 0
        ? Math.round(mockScores.reduce((a, b) => a + b, 0) / mockScores.length)
        : 60;

    const technicalReadiness = Math.round(skillCoverage * 0.5 + avgPracticeScore * 0.5);
    const roleAlignment = Math.min(100, Math.round(skillCoverage * 0.7 + 25));
    const behavioralReadiness = Math.min(100, 60 + completedMocks.length * 8);
    const communication = Math.min(100, 70 + completedMocks.length * 5);
    const confidence = Math.min(100, 65 + completedMocks.length * 6);

    // Weighted Overall Interview Readiness
    const overallReadiness = Math.round(
      technicalReadiness * 0.3 +
        roleAlignment * 0.2 +
        behavioralReadiness * 0.15 +
        skillCoverage * 0.15 +
        avgPracticeScore * 0.1 +
        communication * 0.1,
    );

    const weakAreas =
      missingSkills.length > 0
        ? missingSkills.slice(0, 3)
        : ['STAR structure quantifiers', 'System design trade-offs'];
    const strongAreasList =
      strongSkills.length > 0
        ? strongSkills.slice(0, 3)
        : ['Core technical concepts', 'Problem solving'];

    const recommendedActions: string[] = [];
    if (completedMocks.length === 0) {
      recommendedActions.push('Complete your first 5-minute Quick Practice Mock.');
    }
    if (missingSkills.length > 0) {
      recommendedActions.push(`Focus practice on: ${missingSkills[0]}`);
    }
    if (behavioralReadiness < 70) {
      recommendedActions.push('Practice behavioral STAR stories for leadership & teamwork.');
    }
    if (recommendedActions.length === 0) {
      recommendedActions.push('Run a Full Mock Interview to keep skills sharp.');
    }

    return {
      overallReadiness,
      technicalReadiness,
      roleAlignment,
      behavioralReadiness,
      communication,
      confidence,
      skillCoverage,
      practicePerformance: avgPracticeScore,
      completedMockCount: completedMocks.length,
      strongAreas: strongAreasList,
      weakAreas,
      recommendedActions,
    };
  }
}
