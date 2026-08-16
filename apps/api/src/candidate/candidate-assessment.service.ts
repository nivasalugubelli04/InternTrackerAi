import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AssignmentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AssessmentSandboxService } from '../recruiter/services/assessment-sandbox.service';

export interface SubmitAttemptDto {
  answers: Record<string, string>; // questionId -> answer (code or text or selected option)
}

@Injectable()
export class CandidateAssessmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sandboxService: AssessmentSandboxService,
  ) {}

  async listCandidateAssignments(candidateId: string) {
    return this.prisma.assessmentAssignment.findMany({
      where: { candidateId },
      include: {
        assessment: {
          select: {
            id: true,
            title: true,
            description: true,
            instructions: true,
            duration: true,
            deadline: true,
            totalScore: true,
            type: true,
          },
        },
        job: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAssignmentDetails(candidateId: string, assignmentId: string) {
    const assignment = await this.prisma.assessmentAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        assessment: {
          include: {
            questions: {
              orderBy: { orderIndex: 'asc' },
              select: {
                id: true,
                question: true,
                type: true,
                difficulty: true,
                points: true,
                timeLimit: true,
                options: true,
                orderIndex: true,
                // CRITICAL PRIVACY: DO NOT EXPOSE correctAnswer, evaluationCriteria, or testCases
              },
            },
          },
        },
        job: { select: { id: true, title: true } },
      },
    });

    if (!assignment || assignment.candidateId !== candidateId) {
      throw new NotFoundException('Assessment assignment not found');
    }

    return assignment;
  }

  async startAssignment(candidateId: string, assignmentId: string) {
    const assignment = await this.prisma.assessmentAssignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment || assignment.candidateId !== candidateId) {
      throw new NotFoundException('Assessment assignment not found');
    }

    if (assignment.status === AssignmentStatus.EXPIRED || assignment.status === AssignmentStatus.CANCELLED) {
      throw new BadRequestException(`Assessment is ${assignment.status.toLowerCase()}`);
    }

    if (assignment.status === AssignmentStatus.SUBMITTED || assignment.status === AssignmentStatus.EVALUATED) {
      throw new BadRequestException('Assessment has already been submitted');
    }

    return this.prisma.assessmentAssignment.update({
      where: { id: assignmentId },
      data: {
        status: AssignmentStatus.IN_PROGRESS,
        startedAt: assignment.startedAt || new Date(),
      },
    });
  }

  async submitAssignment(candidateId: string, assignmentId: string, dto: SubmitAttemptDto) {
    const assignment = await this.prisma.assessmentAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        assessment: {
          include: {
            questions: true,
          },
        },
      },
    });

    if (!assignment || assignment.candidateId !== candidateId) {
      throw new NotFoundException('Assessment assignment not found');
    }

    if (assignment.status === AssignmentStatus.SUBMITTED || assignment.status === AssignmentStatus.EVALUATED) {
      throw new BadRequestException('Assessment already submitted');
    }

    let achievedScore = 0;
    const totalScore = assignment.assessment.totalScore || 100;
    const questionResults: Record<string, any> = {};
    const executionLogs: string[] = [];

    for (const question of assignment.assessment.questions) {
      const candidateAnswer = dto.answers[question.id] || '';

      if (question.type === 'MCQ') {
        const isCorrect =
          question.correctAnswer &&
          candidateAnswer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
        const score = isCorrect ? question.points : 0;
        achievedScore += score;
        questionResults[question.id] = {
          type: 'MCQ',
          score,
          points: question.points,
          passed: isCorrect,
        };
      } else if (question.type === 'CODING' && question.testCases) {
        const testCases = (question.testCases as any) || [];
        const sandboxRes = await this.sandboxService.executeCode(candidateAnswer, testCases);
        const score = sandboxRes.passed ? question.points : (sandboxRes.passedCount / (sandboxRes.totalCount || 1)) * question.points;
        achievedScore += score;
        executionLogs.push(...sandboxRes.logs);
        questionResults[question.id] = {
          type: 'CODING',
          score,
          points: question.points,
          passed: sandboxRes.passed,
          testResults: sandboxRes.testResults,
        };
      } else {
        // Short Answer / Questionnaire / Take-home
        const score = candidateAnswer.trim().length > 0 ? question.points : 0;
        achievedScore += score;
        questionResults[question.id] = {
          type: question.type,
          score,
          points: question.points,
          answered: candidateAnswer.trim().length > 0,
        };
      }
    }

    const percentage = totalScore > 0 ? (achievedScore / totalScore) * 100 : 0;
    const passed = percentage >= (assignment.assessment.passingScore || 70);

    const attempt = await this.prisma.assessmentAttempt.create({
      data: {
        assignmentId,
        candidateId,
        answers: dto.answers,
        score: achievedScore,
        percentage,
        passed,
        questionResults,
        ...(executionLogs.length > 0 && { executionLogs }),
        startedAt: assignment.startedAt || new Date(),
        completedAt: new Date(),
      },
    });

    const updatedAssignment = await this.prisma.assessmentAssignment.update({
      where: { id: assignmentId },
      data: {
        status: AssignmentStatus.SUBMITTED,
        score: achievedScore,
        percentage,
        passed,
        submittedAt: new Date(),
      },
    });

    return {
      message: 'Assessment submitted successfully',
      attemptId: attempt.id,
      score: achievedScore,
      percentage,
      passed,
      status: updatedAssignment.status,
    };
  }
}
