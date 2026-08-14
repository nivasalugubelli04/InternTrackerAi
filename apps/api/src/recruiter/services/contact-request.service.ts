import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContactRequestStatus, RecruiterOrgVerificationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RecruiterOrgService } from './recruiter-org.service';

@Injectable()
export class ContactRequestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly recruiterOrgService: RecruiterOrgService,
  ) {}

  /**
   * Recruiter sends a contact request to a candidate.
   * Only allowed if:
   *  1. RecruiterOrg is VERIFIED
   *  2. Candidate has contactPermitted = true in discoverability settings
   *  3. No duplicate pending request exists
   */
  async sendContactRequest(
    senderId: string,
    receiverId: string,
    recruiterOrgId: string,
    jobId: string | undefined,
    message: string,
  ) {
    if (!message?.trim()) throw new BadRequestException('Contact message is required');
    if (message.length > 2000)
      throw new BadRequestException('Message must not exceed 2000 characters');

    // Verify org is VERIFIED
    const recruiterOrg = await this.prisma.recruiterOrganization.findUnique({
      where: { id: recruiterOrgId },
    });
    if (!recruiterOrg) throw new NotFoundException('Recruiter organization not found');
    if (recruiterOrg.verificationStatus !== RecruiterOrgVerificationStatus.VERIFIED) {
      throw new ForbiddenException({
        code: 'ORG_NOT_VERIFIED',
        message: 'Your organization must be verified to send contact requests',
      });
    }

    // Verify recruiter profile
    const recruiterProfile = await this.prisma.recruiterProfile.findUnique({
      where: { userId: senderId },
    });
    if (!recruiterProfile) throw new NotFoundException('Recruiter profile not found');

    // Verify candidate consent
    const settings = await this.prisma.recruiterDiscoverabilitySettings.findUnique({
      where: { userId: receiverId },
    });
    if (!settings || !settings.contactPermitted) {
      throw new ForbiddenException({
        code: 'CONTACT_NOT_PERMITTED',
        message: 'Candidate has not permitted recruiter contact',
      });
    }

    // Prevent duplicate pending requests
    const existingRequest = await this.prisma.contactRequest.findFirst({
      where: {
        senderId,
        receiverId,
        jobId: jobId ?? null,
        status: ContactRequestStatus.PENDING,
      },
    });
    if (existingRequest)
      throw new ConflictException('A pending contact request already exists for this candidate');

    const contactRequest = await this.prisma.contactRequest.create({
      data: {
        recruiterOrgId,
        recruiterId: recruiterProfile.id,
        senderId,
        receiverId,
        jobId: jobId ?? null,
        message,
        status: ContactRequestStatus.PENDING,
      },
    });

    // Log audit event
    await this.recruiterOrgService.logAudit(
      senderId,
      'CONTACT_REQUESTED',
      'ContactRequest',
      contactRequest.id,
      recruiterOrgId,
      { candidateId: receiverId },
    );

    return contactRequest;
  }

  /** Candidate approves a contact request, opening a MessageThread. */
  async approveContactRequest(contactRequestId: string, candidateUserId: string) {
    const request = await this.prisma.contactRequest.findUnique({
      where: { id: contactRequestId },
    });
    if (!request) throw new NotFoundException('Contact request not found');
    if (request.receiverId !== candidateUserId)
      throw new ForbiddenException('You can only respond to your own contact requests');
    if (request.status !== ContactRequestStatus.PENDING)
      throw new BadRequestException('Contact request is no longer pending');

    const [updatedRequest, thread] = await this.prisma.$transaction([
      this.prisma.contactRequest.update({
        where: { id: contactRequestId },
        data: { status: ContactRequestStatus.APPROVED, approvedAt: new Date() },
      }),
      this.prisma.messageThread.create({
        data: {
          contactRequestId,
          recruiterOrgId: request.recruiterOrgId,
          participantIds: [request.senderId, request.receiverId],
        },
      }),
    ]);

    return { contactRequest: updatedRequest, thread };
  }

  /** Candidate rejects a contact request. */
  async rejectContactRequest(contactRequestId: string, candidateUserId: string) {
    const request = await this.prisma.contactRequest.findUnique({
      where: { id: contactRequestId },
    });
    if (!request) throw new NotFoundException('Contact request not found');
    if (request.receiverId !== candidateUserId)
      throw new ForbiddenException('You can only respond to your own contact requests');
    if (request.status !== ContactRequestStatus.PENDING)
      throw new BadRequestException('Contact request is no longer pending');

    return this.prisma.contactRequest.update({
      where: { id: contactRequestId },
      data: { status: ContactRequestStatus.REJECTED, rejectedAt: new Date() },
    });
  }

  /** Recruiter withdraws a pending contact request. */
  async withdrawContactRequest(contactRequestId: string, recruiterUserId: string) {
    const request = await this.prisma.contactRequest.findUnique({
      where: { id: contactRequestId },
    });
    if (!request) throw new NotFoundException('Contact request not found');
    if (request.senderId !== recruiterUserId)
      throw new ForbiddenException('You can only withdraw your own contact requests');
    if (request.status !== ContactRequestStatus.PENDING)
      throw new BadRequestException('Contact request is no longer pending');

    return this.prisma.contactRequest.update({
      where: { id: contactRequestId },
      data: { status: ContactRequestStatus.WITHDRAWN },
    });
  }

  /** List contact requests for a candidate. */
  async listCandidateContactRequests(candidateUserId: string) {
    return this.prisma.contactRequest.findMany({
      where: { receiverId: candidateUserId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        message: true,
        status: true,
        createdAt: true,
        jobId: true,
        recruiterOrg: {
          include: { organization: { select: { name: true, logoUrl: true } } },
        },
      },
    });
  }

  /** List contact requests sent by a recruiter org. */
  async listRecruiterContactRequests(recruiterOrgId: string) {
    return this.prisma.contactRequest.findMany({
      where: { recruiterOrgId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        receiverId: true,
        message: true,
        status: true,
        jobId: true,
        createdAt: true,
        approvedAt: true,
      },
    });
  }
}
