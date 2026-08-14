import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RecruitmentPipelineStage } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PipelineService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Pipeline CRUD ─────────────────────────────────────────────────────────

  async createPipeline(
    userId: string,
    recruiterOrgId: string,
    name: string,
    jobId?: string,
  ) {
    const profile = await this.prisma.recruiterProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Recruiter profile not found');

    return this.prisma.recruiterPipeline.create({
      data: {
        recruiterOrgId,
        ownerId: profile.id,
        name,
        jobId: jobId ?? null,
      },
    });
  }

  async listPipelines(recruiterOrgId: string) {
    return this.prisma.recruiterPipeline.findMany({
      where: { recruiterOrgId },
      include: { entries: { select: { id: true, stage: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPipeline(pipelineId: string, recruiterOrgId: string) {
    const pipeline = await this.prisma.recruiterPipeline.findFirst({
      where: { id: pipelineId, recruiterOrgId },
      include: {
        entries: {
          orderBy: { movedAt: 'desc' },
        },
      },
    });
    if (!pipeline) throw new NotFoundException('Pipeline not found');
    return pipeline;
  }

  // ─── Entry Operations ──────────────────────────────────────────────────────

  async addCandidateToPipeline(
    pipelineId: string,
    recruiterOrgId: string,
    candidateId: string,
    jobId?: string,
    note?: string,
  ) {
    const pipeline = await this.prisma.recruiterPipeline.findFirst({
      where: { id: pipelineId, recruiterOrgId },
    });
    if (!pipeline) throw new NotFoundException('Pipeline not found');

    // Verify consent
    const settings = await this.prisma.recruiterDiscoverabilitySettings.findUnique({
      where: { userId: candidateId },
    });
    if (!settings || settings.discoverabilityLevel === 'PRIVATE') {
      throw new ForbiddenException({
        code: 'CANDIDATE_CONSENT_REQUIRED',
        message: 'Candidate has not consented to recruiter discoverability',
      });
    }

    const existing = await this.prisma.recruitmentPipelineEntry.findUnique({
      where: { pipelineId_candidateId: { pipelineId, candidateId } },
    });
    if (existing) throw new ConflictException('Candidate already in pipeline');

    return this.prisma.recruitmentPipelineEntry.create({
      data: {
        pipelineId,
        candidateId,
        jobId: jobId ?? null,
        recruiterNote: note ?? null,
        stage: RecruitmentPipelineStage.DISCOVERED,
      },
    });
  }

  async moveCandidateStage(
    pipelineId: string,
    recruiterOrgId: string,
    candidateId: string,
    newStage: RecruitmentPipelineStage,
    note?: string,
  ) {
    const pipeline = await this.prisma.recruiterPipeline.findFirst({
      where: { id: pipelineId, recruiterOrgId },
    });
    if (!pipeline) throw new NotFoundException('Pipeline not found');

    // The recruiter pipeline is separate — do NOT overwrite student application status
    return this.prisma.recruitmentPipelineEntry.update({
      where: { pipelineId_candidateId: { pipelineId, candidateId } },
      data: {
        stage: newStage,
        ...(note !== undefined && { recruiterNote: note }),
        movedAt: new Date(),
      },
    });
  }

  async removeCandidateFromPipeline(
    pipelineId: string,
    recruiterOrgId: string,
    candidateId: string,
  ) {
    const pipeline = await this.prisma.recruiterPipeline.findFirst({
      where: { id: pipelineId, recruiterOrgId },
    });
    if (!pipeline) throw new NotFoundException('Pipeline not found');

    await this.prisma.recruitmentPipelineEntry.deleteMany({
      where: { pipelineId, candidateId },
    });

    return { message: 'Candidate removed from pipeline' };
  }

  /** Funnel counts for recruiter analytics. */
  async getPipelineFunnelCounts(pipelineId: string, recruiterOrgId: string) {
    const pipeline = await this.prisma.recruiterPipeline.findFirst({
      where: { id: pipelineId, recruiterOrgId },
    });
    if (!pipeline) throw new NotFoundException('Pipeline not found');

    const counts = await this.prisma.recruitmentPipelineEntry.groupBy({
      by: ['stage'],
      where: { pipelineId },
      _count: { id: true },
    });

    const funnel: Record<string, number> = {};
    for (const item of counts) {
      funnel[item.stage] = item._count.id;
    }
    return funnel;
  }
}
