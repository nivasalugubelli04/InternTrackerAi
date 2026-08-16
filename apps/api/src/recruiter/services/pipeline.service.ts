import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RecruitmentPipelineStage } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const ALLOWED_TRANSITIONS: Record<RecruitmentPipelineStage, RecruitmentPipelineStage[]> = {
  [RecruitmentPipelineStage.DISCOVERED]: [
    RecruitmentPipelineStage.SHORTLISTED,
    RecruitmentPipelineStage.WITHDRAWN,
  ],
  [RecruitmentPipelineStage.SHORTLISTED]: [
    RecruitmentPipelineStage.CONTACTED,
    RecruitmentPipelineStage.WITHDRAWN,
  ],
  [RecruitmentPipelineStage.CONTACTED]: [
    RecruitmentPipelineStage.ASSESSMENT,
    RecruitmentPipelineStage.INTERVIEW,
    RecruitmentPipelineStage.WITHDRAWN,
  ],
  [RecruitmentPipelineStage.ASSESSMENT]: [
    RecruitmentPipelineStage.ASSESSMENT_COMPLETED,
    RecruitmentPipelineStage.WITHDRAWN,
  ],
  [RecruitmentPipelineStage.ASSESSMENT_COMPLETED]: [
    RecruitmentPipelineStage.INTERVIEW,
    RecruitmentPipelineStage.WITHDRAWN,
  ],
  [RecruitmentPipelineStage.INTERVIEW]: [
    RecruitmentPipelineStage.FINAL_INTERVIEW,
    RecruitmentPipelineStage.OFFER,
    RecruitmentPipelineStage.REJECTED,
    RecruitmentPipelineStage.WITHDRAWN,
  ],
  [RecruitmentPipelineStage.FINAL_INTERVIEW]: [
    RecruitmentPipelineStage.OFFER,
    RecruitmentPipelineStage.REJECTED,
    RecruitmentPipelineStage.WITHDRAWN,
  ],
  [RecruitmentPipelineStage.OFFER]: [
    RecruitmentPipelineStage.HIRED,
    RecruitmentPipelineStage.REJECTED,
    RecruitmentPipelineStage.WITHDRAWN,
  ],
  [RecruitmentPipelineStage.HIRED]: [RecruitmentPipelineStage.WITHDRAWN],
  [RecruitmentPipelineStage.REJECTED]: [RecruitmentPipelineStage.WITHDRAWN],
  [RecruitmentPipelineStage.WITHDRAWN]: [],
};

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
    userId?: string,
    isAdminCorrection?: boolean,
  ) {
    const pipeline = await this.prisma.recruiterPipeline.findFirst({
      where: { id: pipelineId, recruiterOrgId },
    });
    if (!pipeline) throw new NotFoundException('Pipeline not found');

    const entry = await this.prisma.recruitmentPipelineEntry.findUnique({
      where: { pipelineId_candidateId: { pipelineId, candidateId } },
    });
    if (!entry) throw new NotFoundException('Candidate entry not found in pipeline');

    if (entry.stage !== newStage && !isAdminCorrection) {
      const allowed = ALLOWED_TRANSITIONS[entry.stage] || [];
      if (!allowed.includes(newStage)) {
        throw new BadRequestException(
          `Transition from ${entry.stage} to ${newStage} is not allowed without administrative correction`,
        );
      }
    }

    if (isAdminCorrection && userId) {
      await this.prisma.recruiterAuditEvent.create({
        data: {
          userId,
          recruiterOrgId,
          action: 'PIPELINE_STAGE_ADMIN_CORRECTION',
          resourceType: 'RecruitmentPipelineEntry',
          resourceId: entry.id,
          metadata: {
            fromStage: entry.stage,
            toStage: newStage,
            candidateId,
          },
        },
      });
    }

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

  /**
   * Candidate Hiring Profile for authorized recruiters.
   * EXCLUDES private candidate AI conversations, private notes, private prep data.
   */
  async getCandidateHiringProfile(recruiterOrgId: string, candidateId: string) {
    const settings = await this.prisma.recruiterDiscoverabilitySettings.findUnique({
      where: { userId: candidateId },
    });
    if (!settings || settings.discoverabilityLevel === 'PRIVATE') {
      throw new ForbiddenException('Candidate profile is private');
    }

    const candidate = await this.prisma.user.findUnique({
      where: { id: candidateId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        profile: true,
        userSkills: { include: { skill: true } },
        resume: true,
        careerPreference: true,
      },
    });
    if (!candidate) throw new NotFoundException('Candidate not found');

    const [assessments, interviews, offers, pipelineEntries] = await Promise.all([
      this.prisma.assessmentAssignment.findMany({
        where: { candidateId, recruiterOrgId },
        include: { assessment: true, job: true },
      }),
      this.prisma.hiringInterview.findMany({
        where: { candidateId, recruiterOrgId },
        include: {
          job: true,
          feedbackList: {
            select: {
              id: true,
              rating: true,
              strengths: true,
              concerns: true,
              recommendation: true,
              submittedAt: true,
            },
          },
        },
      }),
      this.prisma.offer.findMany({
        where: { candidateId, recruiterOrgId },
        include: { job: true },
      }),
      this.prisma.recruitmentPipelineEntry.findMany({
        where: { candidateId, pipeline: { recruiterOrgId } },
        include: { pipeline: true, job: true },
      }),
    ]);

    return {
      candidate: {
        id: candidate.id,
        email: candidate.email,
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        profile: candidate.profile,
        skills: candidate.userSkills.map((s) => ({
          name: s.skill.name,
          category: s.skill.category,
          proficiency: s.proficiency,
        })),
        education: (candidate.profile as any)?.education || (candidate.profile as any)?.educationJson,
        experience: (candidate.profile as any)?.experience || (candidate.profile as any)?.experienceJson,
        resume: settings.resumeVisible ? candidate.resume : null,
      },
      assessments,
      interviews,
      offers,
      pipelineEntries,
    };
  }
}

