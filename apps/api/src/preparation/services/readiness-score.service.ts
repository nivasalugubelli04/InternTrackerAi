import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

export interface ReadinessScoreResult {
  overallReadiness: number;
  skillsReadiness: number;
  resumeReadiness: number;
  technicalReadiness: number;
  behavioralReadiness: number;
  eligibilityReadiness: number;
  companyKnowledge: number;
}

@Injectable()
export class ReadinessScoreService {
  constructor(private readonly prisma: PrismaService) {}

  async calculateReadinessScore(userId: string, jobId: string): Promise<ReadinessScoreResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        resume: true,
        userSkills: { include: { skill: true } },
        mockInterviews: { where: { jobId } },
        preparationPlans: { where: { jobId }, include: { tasks: true } },
      },
    });

    const job = await this.prisma.jobPosting.findUnique({
      where: { id: jobId },
      include: { company: true },
    });

    const matchScore = await this.prisma.matchScore.findUnique({
      where: { userId_jobId: { userId, jobId } },
    });

    if (!user || !job) {
      throw new Error('User or Job not found');
    }

    // 1. Skills Readiness (from MatchScore & SemanticScore)
    // Fallback to basic profile skill count if no match score
    let skillsReadiness = 0;
    if (matchScore) {
      const baseSkillScore = matchScore.skillScore;
      const semanticBonus = matchScore.semanticScore ? matchScore.semanticScore * 0.2 : 0;
      skillsReadiness = Math.min(100, baseSkillScore + semanticBonus);
    } else {
      skillsReadiness = Math.min(100, user.userSkills.length * 10);
    }

    // 2. Resume Readiness
    let resumeReadiness = 0;
    if (user.resume) {
      resumeReadiness = 70; // Has resume
      if (user.resume.fileUrl) {
        resumeReadiness += 30; // Has actual file
      }
    }

    // 3. Technical Readiness (mock interviews + prep plan tasks)
    let technicalReadiness = 50; // Baseline
    const prepPlan = user.preparationPlans[0];
    if (prepPlan) {
      const techTasks = prepPlan.tasks.filter((t) => t.category === 'TECHNICAL');
      const completedTechTasks = techTasks.filter((t) => t.status === 'COMPLETED').length;
      if (techTasks.length > 0) {
        technicalReadiness = 50 + (completedTechTasks / techTasks.length) * 50;
      }
    }

    // 4. Behavioral Readiness
    let behavioralReadiness = 50; // Baseline
    if (prepPlan) {
      const behavTasks = prepPlan.tasks.filter((t) => t.category === 'BEHAVIORAL');
      const completedBehavTasks = behavTasks.filter((t) => t.status === 'COMPLETED').length;
      if (behavTasks.length > 0) {
        behavioralReadiness = 50 + (completedBehavTasks / behavTasks.length) * 50;
      }
    }
    const mockInterviewsCount = user.mockInterviews.length;
    behavioralReadiness = Math.min(100, behavioralReadiness + mockInterviewsCount * 10);

    // 5. Eligibility Readiness
    // From matchScore CGPA, Location, Education
    let eligibilityReadiness = 80; // Assume mostly eligible unless match score says otherwise
    if (matchScore) {
      eligibilityReadiness =
        (matchScore.educationScore + matchScore.locationScore + matchScore.cgpaScore) / 3;
    }

    // 6. Company Knowledge
    let companyKnowledge = 50; // Baseline
    if (prepPlan) {
      const compTasks = prepPlan.tasks.filter((t) => t.category === 'COMPANY');
      const completedCompTasks = compTasks.filter((t) => t.status === 'COMPLETED').length;
      if (compTasks.length > 0) {
        companyKnowledge = 50 + (completedCompTasks / compTasks.length) * 50;
      }
    }

    // Blend everything into overall readiness
    const weights = {
      skills: 0.25,
      resume: 0.15,
      technical: 0.2,
      behavioral: 0.15,
      eligibility: 0.15,
      company: 0.1,
    };

    const overallReadiness = Math.round(
      skillsReadiness * weights.skills +
        resumeReadiness * weights.resume +
        technicalReadiness * weights.technical +
        behavioralReadiness * weights.behavioral +
        eligibilityReadiness * weights.eligibility +
        companyKnowledge * weights.company,
    );

    return {
      overallReadiness,
      skillsReadiness: Math.round(skillsReadiness),
      resumeReadiness: Math.round(resumeReadiness),
      technicalReadiness: Math.round(technicalReadiness),
      behavioralReadiness: Math.round(behavioralReadiness),
      eligibilityReadiness: Math.round(eligibilityReadiness),
      companyKnowledge: Math.round(companyKnowledge),
    };
  }
}
