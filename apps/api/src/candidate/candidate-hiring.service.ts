import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ApplicationStatus,
  HiringInterviewStatus,
  OfferStatus,
  RecruitmentPipelineStage,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CandidateHiringService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Candidate Interview Actions ─────────────────────────────────────────────

  async listCandidateInterviews(candidateId: string) {
    return this.prisma.hiringInterview.findMany({
      where: { candidateId },
      include: {
        job: { select: { id: true, title: true, companyId: true } },
        recruiterOrg: { select: { id: true, companyWebsite: true } },
      },
      orderBy: { scheduledStart: 'asc' },
    });
  }

  async acceptInterview(candidateId: string, interviewId: string) {
    const interview = await this.prisma.hiringInterview.findUnique({
      where: { id: interviewId },
    });
    if (!interview || interview.candidateId !== candidateId) {
      throw new NotFoundException('Interview not found');
    }

    const updated = await this.prisma.hiringInterview.update({
      where: { id: interviewId },
      data: {
        status: HiringInterviewStatus.CONFIRMED,
        events: {
          create: {
            eventType: 'CANDIDATE_ACCEPTED',
            actorId: candidateId,
          },
        },
      },
    });

    return updated;
  }

  async declineInterview(candidateId: string, interviewId: string, reason?: string) {
    const interview = await this.prisma.hiringInterview.findUnique({
      where: { id: interviewId },
    });
    if (!interview || interview.candidateId !== candidateId) {
      throw new NotFoundException('Interview not found');
    }

    const updated = await this.prisma.hiringInterview.update({
      where: { id: interviewId },
      data: {
        status: HiringInterviewStatus.DECLINED,
        events: {
          create: {
            eventType: 'CANDIDATE_DECLINED',
            actorId: candidateId,
            details: { reason },
          },
        },
      },
    });

    return updated;
  }

  async requestReschedule(candidateId: string, interviewId: string, reason: string) {
    const interview = await this.prisma.hiringInterview.findUnique({
      where: { id: interviewId },
    });
    if (!interview || interview.candidateId !== candidateId) {
      throw new NotFoundException('Interview not found');
    }

    const updated = await this.prisma.hiringInterview.update({
      where: { id: interviewId },
      data: {
        status: HiringInterviewStatus.RESCHEDULE_REQUESTED,
        rescheduleReason: reason,
        rescheduleRequestedBy: 'CANDIDATE',
        events: {
          create: {
            eventType: 'CANDIDATE_RESCHEDULE_REQUESTED',
            actorId: candidateId,
            details: { reason },
          },
        },
      },
    });

    return updated;
  }

  // ── Candidate Offer Actions ─────────────────────────────────────────────────

  async listCandidateOffers(candidateId: string) {
    return this.prisma.offer.findMany({
      where: {
        candidateId,
        status: { notIn: [OfferStatus.DRAFT, OfferStatus.PENDING_APPROVAL] },
      },
      include: {
        job: { select: { id: true, title: true, location: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCandidateOffer(candidateId: string, offerId: string) {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      include: { job: true },
    });

    if (!offer || offer.candidateId !== candidateId) {
      throw new NotFoundException('Offer not found');
    }

    if (offer.status === OfferStatus.DRAFT || offer.status === OfferStatus.PENDING_APPROVAL) {
      throw new ForbiddenException('Offer is not available for viewing');
    }

    // Mark as VIEWED if in SENT status
    if (offer.status === OfferStatus.SENT) {
      await this.prisma.offer.update({
        where: { id: offerId },
        data: {
          status: OfferStatus.VIEWED,
          events: {
            create: {
              eventType: 'VIEWED',
              actorId: candidateId,
            },
          },
        },
      });
    }

    return offer;
  }

  async acceptOffer(candidateId: string, offerId: string, note?: string) {
    const offer = await this.getCandidateOffer(candidateId, offerId);

    if (offer.status === OfferStatus.ACCEPTED) {
      throw new BadRequestException('Offer already accepted');
    }

    if (offer.status === OfferStatus.EXPIRED || offer.status === OfferStatus.WITHDRAWN) {
      throw new BadRequestException(`Cannot accept an offer that is ${offer.status.toLowerCase()}`);
    }

    const updated = await this.prisma.offer.update({
      where: { id: offerId },
      data: {
        status: OfferStatus.ACCEPTED,
        acceptedAt: new Date(),
        candidateNote: note ?? null,
        events: {
          create: {
            eventType: 'ACCEPTED',
            actorId: candidateId,
            metadata: { note },
          },
        },
      },
    });

    // Update recruiter pipeline entry stage to HIRED
    await this.prisma.recruitmentPipelineEntry.updateMany({
      where: { candidateId, jobId: offer.jobId },
      data: { stage: RecruitmentPipelineStage.HIRED, movedAt: new Date() },
    });

    // Sync candidate Application status in Phase 9 Application tracker
    await this.prisma.application.updateMany({
      where: { userId: candidateId, jobId: offer.jobId },
      data: { status: ApplicationStatus.OFFER },
    });

    return updated;
  }

  async declineOffer(candidateId: string, offerId: string, reason?: string) {
    const offer = await this.getCandidateOffer(candidateId, offerId);

    if (offer.status === OfferStatus.DECLINED) {
      throw new BadRequestException('Offer already declined');
    }

    const updated = await this.prisma.offer.update({
      where: { id: offerId },
      data: {
        status: OfferStatus.DECLINED,
        declinedAt: new Date(),
        declineReason: reason ?? null,
        events: {
          create: {
            eventType: 'DECLINED',
            actorId: candidateId,
            metadata: { reason },
          },
        },
      },
    });

    return updated;
  }
}
