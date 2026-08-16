import { Injectable } from '@nestjs/common';
import { AssignmentStatus, HiringInterviewStatus, OfferStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class HiringAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getRecruiterHiringAnalytics(recruiterOrgId: string) {
    const [assignments, interviews, offers, pipelineEntries] = await Promise.all([
      this.prisma.assessmentAssignment.findMany({
        where: { recruiterOrgId },
      }),
      this.prisma.hiringInterview.findMany({
        where: { recruiterOrgId },
      }),
      this.prisma.offer.findMany({
        where: { recruiterOrgId },
      }),
      this.prisma.recruitmentPipelineEntry.findMany({
        where: { pipeline: { recruiterOrgId } },
      }),
    ]);

    // 1. Assessment completion rate
    const totalAssignments = assignments.length;
    const completedAssignments = assignments.filter(
      (a) => a.status === AssignmentStatus.SUBMITTED || a.status === AssignmentStatus.EVALUATED,
    ).length;
    const assessmentCompletionRate =
      totalAssignments > 0
        ? Number(((completedAssignments / totalAssignments) * 100).toFixed(2))
        : 0;

    // 2. Interview attendance & no-show rates
    const totalInterviews = interviews.length;
    const completedInterviews = interviews.filter(
      (i) => i.status === HiringInterviewStatus.COMPLETED,
    ).length;
    const candidateNoShows = interviews.filter(
      (i) => i.status === HiringInterviewStatus.NO_SHOW_CANDIDATE,
    ).length;
    const interviewerNoShows = interviews.filter(
      (i) => i.status === HiringInterviewStatus.NO_SHOW_INTERVIEWER,
    ).length;
    const noShowRate =
      totalInterviews > 0
        ? Number((((candidateNoShows + interviewerNoShows) / totalInterviews) * 100).toFixed(2))
        : 0;

    // 3. Offer conversion
    const totalOffers = offers.length;
    const acceptedOffers = offers.filter((o) => o.status === OfferStatus.ACCEPTED).length;
    const offerConversionRate =
      totalOffers > 0 ? Number(((acceptedOffers / totalOffers) * 100).toFixed(2)) : 0;

    // 4. Candidate stage distribution
    const stageDistribution: Record<string, number> = {};
    pipelineEntries.forEach((entry) => {
      stageDistribution[entry.stage] = (stageDistribution[entry.stage] || 0) + 1;
    });

    // 5. Time-to-hire computation (average days from pipeline entry to offer accepted)
    let totalHireDays = 0;
    let hiresCount = 0;

    for (const offer of offers) {
      if (offer.status === OfferStatus.ACCEPTED && offer.acceptedAt) {
        const entry = pipelineEntries.find(
          (e) => e.candidateId === offer.candidateId && e.jobId === offer.jobId,
        );
        if (entry) {
          const diffMs = offer.acceptedAt.getTime() - entry.movedAt.getTime();
          const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
          totalHireDays += diffDays;
          hiresCount++;
        }
      }
    }

    const averageTimeToHireDays =
      hiresCount > 0 ? Number((totalHireDays / hiresCount).toFixed(1)) : 0;

    return {
      recruiterOrgId,
      summary: {
        totalCandidatesTracked: pipelineEntries.length,
        totalAssessmentsAssigned: totalAssignments,
        assessmentCompletionRate,
        totalInterviewsScheduled: totalInterviews,
        completedInterviews,
        noShowRate,
        totalOffersSent: totalOffers,
        acceptedOffers,
        offerConversionRate,
        averageTimeToHireDays,
      },
      stageDistribution,
    };
  }
}
