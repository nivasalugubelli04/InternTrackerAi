import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FeedbackRecommendation } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface SubmitFeedbackDto {
  rating: number; // 1 to 5 scale
  strengths?: string;
  concerns?: string;
  technicalAssessment?: string;
  communicationAssessment?: string;
  recommendation: FeedbackRecommendation;
  privateNotes?: string;
}

@Injectable()
export class InterviewFeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  async submitFeedback(
    interviewId: string,
    interviewerId: string,
    dto: SubmitFeedbackDto,
  ) {
    const interview = await this.prisma.hiringInterview.findUnique({
      where: { id: interviewId },
      include: { participants: true },
    });

    if (!interview) throw new NotFoundException('Interview not found');

    const isParticipant = interview.participants.some((p) => p.userId === interviewerId);
    if (!isParticipant && interview.createdBy !== interviewerId) {
      throw new ForbiddenException('You are not authorized to submit feedback for this interview');
    }

    if (dto.rating < 1 || dto.rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    const feedback = await this.prisma.interviewFeedback.upsert({
      where: {
        interviewId_interviewerId: { interviewId, interviewerId },
      },
      create: {
        interviewId,
        interviewerId,
        rating: dto.rating,
        strengths: dto.strengths ?? null,
        concerns: dto.concerns ?? null,
        technicalAssessment: dto.technicalAssessment ?? null,
        communicationAssessment: dto.communicationAssessment ?? null,
        recommendation: dto.recommendation,
        privateNotes: dto.privateNotes ?? null,
      },
      update: {
        rating: dto.rating,
        strengths: dto.strengths ?? null,
        concerns: dto.concerns ?? null,
        technicalAssessment: dto.technicalAssessment ?? null,
        communicationAssessment: dto.communicationAssessment ?? null,
        recommendation: dto.recommendation,
        privateNotes: dto.privateNotes ?? null,
        submittedAt: new Date(),
      },
    });

    return feedback;
  }

  async getAggregatedFeedback(interviewId: string, recruiterOrgId: string) {
    const interview = await this.prisma.hiringInterview.findFirst({
      where: { id: interviewId, recruiterOrgId },
    });
    if (!interview) throw new NotFoundException('Interview not found');

    const feedbacks = await this.prisma.interviewFeedback.findMany({
      where: { interviewId },
      include: {
        interviewer: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (feedbacks.length === 0) {
      return {
        interviewId,
        totalFeedback: 0,
        averageRating: 0,
        consensus: 'NO_FEEDBACK_SUBMITTED',
        recommendationsBreakdown: {},
        strengths: [],
        concerns: [],
        feedbacks: [],
      };
    }

    const totalRating = feedbacks.reduce((acc, f) => acc + f.rating, 0);
    const averageRating = Number((totalRating / feedbacks.length).toFixed(2));

    const recommendationsBreakdown: Record<string, number> = {};
    feedbacks.forEach((f) => {
      recommendationsBreakdown[f.recommendation] = (recommendationsBreakdown[f.recommendation] || 0) + 1;
    });

    const recommendationTypes = Object.keys(recommendationsBreakdown);
    let consensus = '';
    if (recommendationTypes.length === 1) {
      consensus = `Unanimous ${recommendationTypes[0]}`;
    } else {
      const details = Object.entries(recommendationsBreakdown)
        .map(([rec, count]) => `${count} ${rec}`)
        .join(', ');
      consensus = `Mixed interviewer feedback (${details})`;
    }

    const strengths = feedbacks.map((f) => f.strengths).filter(Boolean) as string[];
    const concerns = feedbacks.map((f) => f.concerns).filter(Boolean) as string[];

    return {
      interviewId,
      totalFeedback: feedbacks.length,
      averageRating,
      consensus,
      recommendationsBreakdown,
      strengths,
      concerns,
      feedbacks: feedbacks.map((f) => ({
        id: f.id,
        interviewerName: `${f.interviewer.firstName || ''} ${f.interviewer.lastName || ''}`.trim() || f.interviewer.email,
        rating: f.rating,
        recommendation: f.recommendation,
        strengths: f.strengths,
        concerns: f.concerns,
        technicalAssessment: f.technicalAssessment,
        communicationAssessment: f.communicationAssessment,
        privateNotes: f.privateNotes,
        submittedAt: f.submittedAt,
      })),
    };
  }
}
