import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RecruitmentPipelineStage } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ShortlistService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Shortlist CRUD ────────────────────────────────────────────────────────

  async createShortlist(
    userId: string,
    recruiterOrgId: string,
    name: string,
    description?: string,
  ) {
    const profile = await this.prisma.recruiterProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Recruiter profile not found');

    return this.prisma.candidateShortlist.create({
      data: {
        recruiterOrgId,
        ownerId: profile.id,
        name,
        description: description ?? null,
      },
    });
  }

  async listShortlists(recruiterOrgId: string) {
    return this.prisma.candidateShortlist.findMany({
      where: { recruiterOrgId },
      include: { candidates: { select: { id: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getShortlist(shortlistId: string, recruiterOrgId: string) {
    const sl = await this.prisma.candidateShortlist.findFirst({
      where: { id: shortlistId, recruiterOrgId },
      include: {
        candidates: {
          include: {
            // Privacy: only safe fields
            shortlist: false,
          },
        },
      },
    });
    if (!sl) throw new NotFoundException('Shortlist not found');
    return sl;
  }

  // ─── Candidate Operations ──────────────────────────────────────────────────

  async addCandidate(
    shortlistId: string,
    recruiterOrgId: string,
    candidateId: string,
    note?: string,
  ) {
    const sl = await this.prisma.candidateShortlist.findFirst({
      where: { id: shortlistId, recruiterOrgId },
    });
    if (!sl) throw new NotFoundException('Shortlist not found');

    // Verify candidate has consented to recruiter visibility
    const settings = await this.prisma.recruiterDiscoverabilitySettings.findUnique({
      where: { userId: candidateId },
    });
    if (!settings || settings.discoverabilityLevel === 'PRIVATE') {
      throw new ForbiddenException({
        code: 'CANDIDATE_CONSENT_REQUIRED',
        message: 'Candidate has not consented to recruiter discoverability',
      });
    }

    const existing = await this.prisma.shortlistCandidate.findUnique({
      where: { shortlistId_candidateId: { shortlistId, candidateId } },
    });
    if (existing) throw new ConflictException('Candidate already in shortlist');

    return this.prisma.shortlistCandidate.create({
      data: {
        shortlistId,
        candidateId,
        recruiterNote: note ?? null,
        stage: RecruitmentPipelineStage.SHORTLISTED,
      },
    });
  }

  async removeCandidate(shortlistId: string, recruiterOrgId: string, candidateId: string) {
    const sl = await this.prisma.candidateShortlist.findFirst({
      where: { id: shortlistId, recruiterOrgId },
    });
    if (!sl) throw new NotFoundException('Shortlist not found');

    await this.prisma.shortlistCandidate.deleteMany({
      where: { shortlistId, candidateId },
    });

    return { message: 'Candidate removed from shortlist' };
  }

  async updateCandidateStage(
    shortlistId: string,
    recruiterOrgId: string,
    candidateId: string,
    stage: RecruitmentPipelineStage,
    note?: string,
  ) {
    const sl = await this.prisma.candidateShortlist.findFirst({
      where: { id: shortlistId, recruiterOrgId },
    });
    if (!sl) throw new NotFoundException('Shortlist not found');

    return this.prisma.shortlistCandidate.update({
      where: { shortlistId_candidateId: { shortlistId, candidateId } },
      data: {
        stage,
        ...(note !== undefined && { recruiterNote: note }),
      },
    });
  }

  /**
   * Returns shortlist candidates with safe candidate info only.
   * CRITICAL: Never returns private notes to candidates.
   * CRITICAL: Never exposes email/phone of candidates.
   */
  async getShortlistCandidates(shortlistId: string, recruiterOrgId: string) {
    const sl = await this.prisma.candidateShortlist.findFirst({
      where: { id: shortlistId, recruiterOrgId },
    });
    if (!sl) throw new NotFoundException('Shortlist not found');

    return this.prisma.shortlistCandidate.findMany({
      where: { shortlistId },
      orderBy: { addedAt: 'desc' },
    });
  }
}
