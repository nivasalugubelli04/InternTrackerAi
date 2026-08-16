import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssessmentQuestionType,
  AssessmentStatus,
  AssessmentType,
  AssignmentStatus,
  QuestionDifficulty,
} from '@prisma/client';
import { NotificationChannel, NotificationType } from '../../notifications/enums/notification.enums';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateAssessmentDto {
  title: string;
  description?: string;
  instructions?: string;
  type?: AssessmentType;
  duration?: number;
  deadline?: Date;
  totalScore?: number;
  passingScore?: number;
  attemptLimit?: number;
  questions?: Array<{
    question: string;
    type: AssessmentQuestionType;
    difficulty?: QuestionDifficulty;
    points?: number;
    timeLimit?: number;
    options?: any;
    correctAnswer?: string;
    evaluationCriteria?: string;
    testCases?: any;
  }>;
}

@Injectable()
export class AssessmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createAssessment(userId: string, recruiterOrgId: string, dto: CreateAssessmentDto) {
    const profile = await this.prisma.recruiterProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Recruiter profile not found');

    const assessment = await this.prisma.assessment.create({
      data: {
        recruiterOrgId,
        createdBy: profile.id,
        title: dto.title,
        description: dto.description ?? null,
        instructions: dto.instructions ?? null,
        type: dto.type ?? AssessmentType.CUSTOM,
        duration: dto.duration ?? 60,
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        totalScore: dto.totalScore ?? 100,
        passingScore: dto.passingScore ?? 70,
        attemptLimit: dto.attemptLimit ?? 1,
        status: AssessmentStatus.PUBLISHED,
        questions: {
          create: (dto.questions || []).map((q, idx) => ({
            question: q.question,
            type: q.type,
            difficulty: q.difficulty ?? QuestionDifficulty.MEDIUM,
            points: q.points ?? 10,
            timeLimit: q.timeLimit ?? null,
            options: q.options ?? null,
            correctAnswer: q.correctAnswer ?? null,
            evaluationCriteria: q.evaluationCriteria ?? null,
            testCases: q.testCases ?? null,
            orderIndex: idx,
          })),
        },
      },
      include: { questions: true },
    });

    return assessment;
  }

  async listAssessments(recruiterOrgId: string) {
    return this.prisma.assessment.findMany({
      where: { recruiterOrgId },
      include: {
        questions: { select: { id: true, question: true, type: true, points: true } },
        _count: { select: { assignments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAssessment(id: string, recruiterOrgId: string) {
    const assessment = await this.prisma.assessment.findFirst({
      where: { id, recruiterOrgId },
      include: {
        questions: { orderBy: { orderIndex: 'asc' } },
        assignments: { include: { candidate: true } },
      },
    });
    if (!assessment) throw new NotFoundException('Assessment not found');
    return assessment;
  }

  async updateAssessment(id: string, recruiterOrgId: string, dto: Partial<CreateAssessmentDto>) {
    const assessment = await this.prisma.assessment.findFirst({ where: { id, recruiterOrgId } });
    if (!assessment) throw new NotFoundException('Assessment not found');

    return this.prisma.assessment.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.instructions !== undefined && { instructions: dto.instructions }),
        ...(dto.type && { type: dto.type }),
        ...(dto.duration && { duration: dto.duration }),
        ...(dto.deadline !== undefined && { deadline: dto.deadline ? new Date(dto.deadline) : null }),
        ...(dto.totalScore !== undefined && { totalScore: dto.totalScore }),
        ...(dto.passingScore !== undefined && { passingScore: dto.passingScore }),
        ...(dto.attemptLimit !== undefined && { attemptLimit: dto.attemptLimit }),
      },
      include: { questions: true },
    });
  }

  async assignAssessment(
    userId: string,
    recruiterOrgId: string,
    assessmentId: string,
    candidateIds: string[],
    jobId?: string,
  ) {
    const profile = await this.prisma.recruiterProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Recruiter profile not found');

    const assessment = await this.prisma.assessment.findFirst({
      where: { id: assessmentId, recruiterOrgId },
    });
    if (!assessment) throw new NotFoundException('Assessment not found');

    const assignedResults = [];

    for (const candidateId of candidateIds) {
      const assignment = await this.prisma.assessmentAssignment.upsert({
        where: {
          assessmentId_candidateId_jobId: {
            assessmentId,
            candidateId,
            jobId: jobId || ('00000000-0000-0000-0000-000000000000' as any),
          },
        },
        create: {
          assessmentId,
          candidateId,
          jobId: jobId ?? null,
          recruiterOrgId,
          assignedBy: profile.id,
          status: AssignmentStatus.ASSIGNED,
        },
        update: {
          status: AssignmentStatus.ASSIGNED,
        },
      });

      assignedResults.push(assignment);

      // Reuse Phase 6 Notification Engine
      await this.notificationsService.queueNotification({
        userId: candidateId,
        type: NotificationType.INSTANT_ALERT,
        title: `Assessment Assigned: ${assessment.title}`,
        message: `You have been assigned the assessment "${assessment.title}". Please log in to complete it.`,
        channel: NotificationChannel.EMAIL,
      });
    }

    return { assignedCount: assignedResults.length, assignments: assignedResults };
  }

  async getAssessmentResults(assessmentId: string, recruiterOrgId: string) {
    const assessment = await this.prisma.assessment.findFirst({
      where: { id: assessmentId, recruiterOrgId },
    });
    if (!assessment) throw new NotFoundException('Assessment not found');

    return this.prisma.assessmentAssignment.findMany({
      where: { assessmentId },
      include: {
        candidate: { select: { id: true, firstName: true, lastName: true, email: true } },
        attempts: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }
}
