import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ApplicationStatus, Prisma } from '@prisma/client';

import { AiService } from '../ai/services/ai.service';
import { EngagementTrackerService } from '../engagement/services/engagement-tracker.service';
import { NotificationsService } from '../notifications/services/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

import { ChangeApplicationStatusDto } from './dto/change-status.dto';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';

const VALID_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  [ApplicationStatus.DISCOVERED]: [
    ApplicationStatus.SAVED,
    ApplicationStatus.APPLICATION_STARTED,
    ApplicationStatus.APPLIED,
    ApplicationStatus.WITHDRAWN,
    ApplicationStatus.EXPIRED,
  ],
  [ApplicationStatus.SAVED]: [
    ApplicationStatus.APPLICATION_STARTED,
    ApplicationStatus.APPLIED,
    ApplicationStatus.WITHDRAWN,
    ApplicationStatus.EXPIRED,
  ],
  [ApplicationStatus.APPLICATION_STARTED]: [
    ApplicationStatus.APPLIED,
    ApplicationStatus.WITHDRAWN,
    ApplicationStatus.REJECTED,
  ],
  [ApplicationStatus.APPLIED]: [
    ApplicationStatus.ASSESSMENT,
    ApplicationStatus.INTERVIEW,
    ApplicationStatus.FINAL_ROUND,
    ApplicationStatus.OFFER,
    ApplicationStatus.REJECTED,
    ApplicationStatus.WITHDRAWN,
  ],
  [ApplicationStatus.ASSESSMENT]: [
    ApplicationStatus.INTERVIEW,
    ApplicationStatus.FINAL_ROUND,
    ApplicationStatus.OFFER,
    ApplicationStatus.REJECTED,
    ApplicationStatus.WITHDRAWN,
  ],
  [ApplicationStatus.INTERVIEW]: [
    ApplicationStatus.FINAL_ROUND,
    ApplicationStatus.OFFER,
    ApplicationStatus.REJECTED,
    ApplicationStatus.WITHDRAWN,
  ],
  [ApplicationStatus.FINAL_ROUND]: [
    ApplicationStatus.OFFER,
    ApplicationStatus.REJECTED,
    ApplicationStatus.WITHDRAWN,
  ],
  [ApplicationStatus.OFFER]: [
    ApplicationStatus.ACCEPTED,
    ApplicationStatus.REJECTED,
    ApplicationStatus.WITHDRAWN,
  ],
  [ApplicationStatus.ACCEPTED]: [ApplicationStatus.WITHDRAWN],
  [ApplicationStatus.REJECTED]: [ApplicationStatus.SAVED, ApplicationStatus.APPLIED],
  [ApplicationStatus.WITHDRAWN]: [ApplicationStatus.SAVED, ApplicationStatus.APPLIED],
  [ApplicationStatus.EXPIRED]: [ApplicationStatus.SAVED, ApplicationStatus.APPLIED],
};

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly engagementTracker: EngagementTrackerService,
    private readonly aiService: AiService,
  ) {}

  async calculatePriority(
    userId: string,
    jobId: string,
    status: ApplicationStatus,
    nextActionDate?: Date | null,
  ) {
    let score = 0;

    // 1. Deadline Closeness
    const job = await this.prisma.jobPosting.findUnique({
      where: { id: jobId },
      select: { deadline: true },
    });

    if (job?.deadline) {
      const now = new Date();
      const diffMs = new Date(job.deadline).getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays <= 0) {
        score += 50;
      } else if (diffDays <= 1) {
        score += 40;
      } else if (diffDays <= 3) {
        score += 30;
      } else if (diffDays <= 7) {
        score += 15;
      }
    }

    // 2. Interview Proximity
    const nextInterview = await this.prisma.hiringInterview.findFirst({
      where: { candidateId: userId, jobId, status: { not: 'COMPLETED' } as any },
      orderBy: { scheduledStart: 'asc' },
    });
    if (nextInterview) {
      const now = new Date();
      const diffMs = new Date(nextInterview.scheduledStart).getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays <= 1) {
        score += 45;
      } else if (diffDays <= 3) {
        score += 35;
      } else if (diffDays <= 7) {
        score += 20;
      } else {
        score += 10;
      }
    }

    // 3. Assessment Assignment Proximity/Due
    const activeAssessment = await this.prisma.assessmentAssignment.findFirst({
      where: { candidateId: userId, jobId, status: 'ASSIGNED' },
    });
    if (activeAssessment) {
      score += 20;
    }

    // 4. Match Score
    const matchScore = await this.prisma.matchScore.findUnique({
      where: { userId_jobId: { userId, jobId } },
    });
    if (matchScore) {
      score += Math.floor((matchScore.overallScore ?? 0) * 0.15); // max 15 points
    }

    // 5. Status weight
    if (status === ApplicationStatus.OFFER) {
      score += 35;
    } else if (status === ApplicationStatus.FINAL_ROUND) {
      score += 30;
    } else if (status === ApplicationStatus.INTERVIEW) {
      score += 25;
    } else if (status === ApplicationStatus.ASSESSMENT) {
      score += 20;
    } else if (status === ApplicationStatus.APPLICATION_STARTED) {
      score += 10;
    }

    // 6. Next action date proximity
    if (nextActionDate) {
      const now = new Date();
      const diffMs = new Date(nextActionDate).getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays <= 1) {
        score += 25;
      } else if (diffDays <= 3) {
        score += 15;
      }
    }

    const finalScore = Math.min(score, 100);

    let label = 'LOW';
    const isUrgent =
      finalScore >= 80 ||
      (nextInterview &&
        new Date(nextInterview.scheduledStart).getTime() - new Date().getTime() <=
          24 * 60 * 60 * 1000) ||
      (job?.deadline &&
        new Date(job.deadline).getTime() - new Date().getTime() <= 24 * 60 * 60 * 1000) ||
      status === ApplicationStatus.OFFER;

    if (isUrgent) {
      label = 'URGENT';
    } else if (finalScore >= 60) {
      label = 'HIGH';
    } else if (finalScore >= 40) {
      label = 'MEDIUM';
    } else {
      label = 'LOW';
    }

    return { score: finalScore, label };
  }

  async create(userId: string, dto: CreateApplicationDto) {
    const existing = await this.prisma.application.findUnique({
      where: { userId_jobId: { userId, jobId: dto.jobId } },
    });
    if (existing) {
      throw new ConflictException('You have already tracked an application for this job.');
    }

    const job = await this.prisma.jobPosting.findUnique({
      where: { id: dto.jobId },
      include: { company: true },
    });
    if (!job) {
      throw new NotFoundException('Job posting not found');
    }

    const targetStatus = dto.status ?? ApplicationStatus.SAVED;
    const priority = await this.calculatePriority(
      userId,
      dto.jobId,
      targetStatus,
      dto.nextActionDate ? new Date(dto.nextActionDate) : null,
    );

    const application = await this.prisma.application.create({
      data: {
        userId,
        jobId: dto.jobId,
        status: targetStatus,
        appliedAt: targetStatus === ApplicationStatus.APPLIED ? new Date() : null,
        applicationUrl: dto.applicationUrl ?? job.applicationUrl ?? null,
        notes: dto.notes ?? null,
        salaryExpectation: dto.salaryExpectation ?? null,
        source: dto.source ?? null,
        nextAction: dto.nextAction ?? null,
        nextActionDate: dto.nextActionDate ? new Date(dto.nextActionDate) : null,
        companyNameSnapshot: job.company.name,
        jobTitleSnapshot: job.title,
        locationSnapshot: job.location,
        priorityScore: priority.score,
        priorityLabel: priority.label,
        resumeVersionId: dto.resumeVersionId ?? null,
        coverLetterText: dto.coverLetterText ?? null,
        portfolioUrl: dto.portfolioUrl ?? null,
        transcriptUrl: dto.transcriptUrl ?? null,
        rejectionReason: dto.rejectionReason ?? null,
        rejectionFeedback: dto.rejectionFeedback ?? null,
        events: {
          create: {
            toStatus: targetStatus,
            note: 'Application tracked',
          },
        },
      },
    });

    if (application.nextActionDate) {
      await this.scheduleReminder(
        userId,
        application.id,
        application.nextActionDate,
        application.nextAction ?? undefined,
      );
    }

    await this.engagementTracker.trackAction(userId, 'APPLICATION_CREATED');
    return application;
  }

  async findAll(
    userId: string,
    query?: {
      status?: string | undefined;
      priority?: string | undefined;
      q?: string | undefined;
      sort?: string | undefined;
      limit?: number | undefined;
      cursor?: string | undefined;
    },
  ) {
    const take = Math.min(query?.limit || 20, 50);
    const where: Prisma.ApplicationWhereInput = { userId };

    if (query?.status) {
      if (query.status === 'CLOSED') {
        where.status = {
          in: [ApplicationStatus.REJECTED, ApplicationStatus.WITHDRAWN, ApplicationStatus.EXPIRED],
        };
      } else if (query.status === 'INTERVIEW') {
        where.status = { in: [ApplicationStatus.INTERVIEW, ApplicationStatus.FINAL_ROUND] };
      } else if (query.status === 'OFFER') {
        where.status = { in: [ApplicationStatus.OFFER, ApplicationStatus.ACCEPTED] };
      } else {
        where.status = query.status as ApplicationStatus;
      }
    }
    if (query?.priority) {
      where.priorityLabel = query.priority;
    }
    if (query?.q) {
      where.OR = [
        { companyNameSnapshot: { contains: query.q, mode: 'insensitive' } },
        { jobTitleSnapshot: { contains: query.q, mode: 'insensitive' } },
        { notes: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    if (query?.sort === 'priority') {
      orderBy.priorityScore = 'desc';
    } else if (query?.sort === 'deadline') {
      orderBy.job = { deadline: 'asc' };
    } else if (query?.sort === 'oldest') {
      orderBy.createdAt = 'asc';
    } else if (query?.sort === 'match') {
      orderBy.job = { matchScores: { _count: 'desc' } }; // placeholder structure or overallScore order handled programmatically
    } else {
      orderBy.createdAt = 'desc'; // newest
    }

    const queryOpts: any = {
      where,
      take: take + 1,
      orderBy,
      include: {
        job: { select: { company: { select: { logoUrl: true } }, deadline: true } },
      },
    };
    if (query?.cursor) queryOpts.cursor = { id: query.cursor };

    const applications = await this.prisma.application.findMany(queryOpts);

    let nextCursor: string | null = null;
    if (applications.length > take) {
      const nextItem = applications.pop();
      nextCursor = nextItem?.id ?? null;
    }

    return { data: applications, nextCursor };
  }

  async findOne(userId: string, id: string) {
    const application = await this.prisma.application.findUnique({
      where: { id },
      include: {
        job: {
          include: {
            company: true,
            matchScores: { where: { userId } },
          },
        },
        resumeVersion: {
          include: {
            resumeDocument: true,
          },
        },
        documents: true,
        events: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!application || application.userId !== userId) {
      throw new NotFoundException('Application not found');
    }

    // Dynamic checks for scheduled interviews, assessments, and offers
    const interviews = await this.prisma.hiringInterview.findMany({
      where: { candidateId: userId, jobId: application.jobId },
      orderBy: { scheduledStart: 'desc' },
    });

    const assessments = await this.prisma.assessmentAssignment.findMany({
      where: { candidateId: userId, jobId: application.jobId },
      include: { assessment: true },
      orderBy: { createdAt: 'desc' },
    });

    const offers = await this.prisma.offer.findMany({
      where: { candidateId: userId, jobId: application.jobId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      ...application,
      interviews,
      assessments,
      offers,
    };
  }

  async getTimeline(userId: string, id: string) {
    await this.findOne(userId, id);
    return this.prisma.applicationEvent.findMany({
      where: { applicationId: id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(userId: string, id: string, dto: UpdateApplicationDto) {
    const application = await this.findOne(userId, id);

    const data: any = {};
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.salaryExpectation !== undefined) data.salaryExpectation = dto.salaryExpectation;
    if (dto.source !== undefined) data.source = dto.source;
    if (dto.applicationUrl !== undefined) data.applicationUrl = dto.applicationUrl;
    if (dto.nextAction !== undefined) data.nextAction = dto.nextAction;
    if (dto.nextActionDate !== undefined)
      data.nextActionDate = dto.nextActionDate ? new Date(dto.nextActionDate) : null;

    if (dto.resumeVersionId !== undefined) data.resumeVersionId = dto.resumeVersionId;
    if (dto.coverLetterText !== undefined) data.coverLetterText = dto.coverLetterText;
    if (dto.portfolioUrl !== undefined) data.portfolioUrl = dto.portfolioUrl;
    if (dto.transcriptUrl !== undefined) data.transcriptUrl = dto.transcriptUrl;
    if (dto.rejectionReason !== undefined) data.rejectionReason = dto.rejectionReason;
    if (dto.rejectionFeedback !== undefined) data.rejectionFeedback = dto.rejectionFeedback;

    const nextActionDateObj =
      dto.nextActionDate !== undefined
        ? dto.nextActionDate
          ? new Date(dto.nextActionDate)
          : null
        : application.nextActionDate;
    const priority = await this.calculatePriority(
      userId,
      application.jobId,
      application.status,
      nextActionDateObj,
    );
    data.priorityScore = priority.score;
    data.priorityLabel = priority.label;

    const updated = await this.prisma.application.update({
      where: { id },
      data,
    });

    if (dto.nextActionDate) {
      await this.scheduleReminder(
        userId,
        updated.id,
        new Date(dto.nextActionDate),
        updated.nextAction ?? undefined,
      );
    }

    return updated;
  }

  async changeStatus(userId: string, id: string, dto: ChangeApplicationStatusDto) {
    const application = await this.findOne(userId, id);

    if (application.status === dto.status) {
      return application;
    }

    // Transition Validation
    const allowed = VALID_TRANSITIONS[application.status] ?? [];
    const isSpecialExit = (
      [
        ApplicationStatus.REJECTED,
        ApplicationStatus.WITHDRAWN,
        ApplicationStatus.EXPIRED,
      ] as ApplicationStatus[]
    ).includes(dto.status);

    if (!allowed.includes(dto.status) && !isSpecialExit) {
      throw new BadRequestException(
        `Invalid status transition from ${application.status} to ${dto.status}`,
      );
    }

    const priority = await this.calculatePriority(
      userId,
      application.jobId,
      dto.status,
      application.nextActionDate,
    );

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.application.update({
        where: { id },
        data: {
          status: dto.status,
          priorityScore: priority.score,
          priorityLabel: priority.label,
          appliedAt:
            dto.status === ApplicationStatus.APPLIED && !application.appliedAt
              ? new Date()
              : application.appliedAt,
          closedAt: (
            [
              ApplicationStatus.REJECTED,
              ApplicationStatus.WITHDRAWN,
              ApplicationStatus.OFFER,
            ] as ApplicationStatus[]
          ).includes(dto.status)
            ? new Date()
            : application.closedAt,
        },
      });

      await tx.applicationEvent.create({
        data: {
          applicationId: id,
          fromStatus: application.status,
          toStatus: dto.status,
          note: dto.note || `Status changed to ${dto.status}`,
        },
      });

      return updated;
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.application.delete({ where: { id } });
  }

  async getStats(userId: string) {
    const stats = await this.prisma.application.groupBy({
      by: ['status'],
      where: { userId },
      _count: true,
    });

    const summary = {
      totalApplications: 0,
      active: 0,
      saved: 0,
      applied: 0,
      assessments: 0,
      interviews: 0,
      offers: 0,
      rejected: 0,
      withdrawn: 0,
      expired: 0,
      discovered: 0,
    };

    for (const stat of stats) {
      summary.totalApplications += stat._count;
      if (stat.status === ApplicationStatus.SAVED) summary.saved = stat._count;
      else if (stat.status === ApplicationStatus.APPLIED) summary.applied = stat._count;
      else if (stat.status === ApplicationStatus.ASSESSMENT) summary.assessments = stat._count;
      else if (
        stat.status === ApplicationStatus.INTERVIEW ||
        stat.status === ApplicationStatus.FINAL_ROUND
      )
        summary.interviews += stat._count;
      else if (
        stat.status === ApplicationStatus.OFFER ||
        stat.status === ApplicationStatus.ACCEPTED
      )
        summary.offers += stat._count;
      else if (stat.status === ApplicationStatus.REJECTED) summary.rejected = stat._count;
      else if (stat.status === ApplicationStatus.WITHDRAWN) summary.withdrawn = stat._count;
      else if (stat.status === ApplicationStatus.EXPIRED) summary.expired = stat._count;
      else if (stat.status === ApplicationStatus.DISCOVERED) summary.discovered = stat._count;
    }

    summary.active = summary.saved + summary.applied + summary.assessments + summary.interviews;

    const interviewRate = summary.active > 0 ? (summary.interviews / summary.active) * 100 : 0;
    const successRate =
      summary.totalApplications > 0 ? (summary.offers / summary.totalApplications) * 100 : 0;

    // Factual Average response time calculation
    const applications = await this.prisma.application.findMany({
      where: { userId },
      include: { events: { orderBy: { createdAt: 'asc' } } },
    });

    let totalDiff = 0;
    let count = 0;
    for (const app of applications) {
      if (app.appliedAt) {
        const responseEvent = app.events.find(
          (e) =>
            app.appliedAt &&
            e.createdAt > app.appliedAt &&
            (
              [
                ApplicationStatus.INTERVIEW,
                ApplicationStatus.FINAL_ROUND,
                ApplicationStatus.OFFER,
                ApplicationStatus.REJECTED,
              ] as ApplicationStatus[]
            ).includes(e.toStatus),
        );
        if (responseEvent) {
          totalDiff += responseEvent.createdAt.getTime() - app.appliedAt.getTime();
          count++;
        }
      }
    }
    const avgResponseTimeDays = count > 0 ? totalDiff / (1000 * 60 * 60 * 24 * count) : 0;

    // Grouping analytics
    const applicationsBySource = await this.prisma.application.groupBy({
      by: ['source'],
      where: { userId, source: { not: null } },
      _count: true,
    });

    return {
      ...summary,
      interviewRate,
      successRate,
      avgResponseTimeDays,
      sources: applicationsBySource.map((s) => ({ source: s.source, count: s._count })),
    };
  }

  async getDailyActions(userId: string) {
    const actions: any[] = [];
    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;

    // 1. Interviews scheduled
    const upcomingInterviews = await this.prisma.hiringInterview.findMany({
      where: {
        candidateId: userId,
        status: { not: 'COMPLETED' } as any,
        scheduledStart: { gte: now },
      },
      orderBy: { scheduledStart: 'asc' },
      take: 2,
    });
    for (const interview of upcomingInterviews) {
      actions.push({
        id: `action-interview-${interview.id}`,
        type: 'INTERVIEW_PREP',
        priority: 'URGENT',
        title: `Prepare for: ${interview.title}`,
        description: `Scheduled for ${new Date(interview.scheduledStart).toLocaleDateString()} at ${new Date(interview.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
        jobId: interview.jobId,
        actionUrl: `/interviews/${interview.id}`,
      });
    }

    // 2. Assessment assignments
    const activeAssessments = await this.prisma.assessmentAssignment.findMany({
      where: { candidateId: userId, status: 'ASSIGNED' },
      include: { assessment: true },
      take: 2,
    });
    for (const assignment of activeAssessments) {
      actions.push({
        id: `action-assessment-${assignment.id}`,
        type: 'ASSESSMENT_COMPLETION',
        priority: 'HIGH',
        title: `Complete: ${assignment.assessment.title}`,
        description: `Assigned technical assessment. Practice and attempt.`,
        jobId: assignment.jobId,
        actionUrl: `/assessments/${assignment.id}`,
      });
    }

    // 3. Submitted age followups (> 5 days since submission)
    const fiveDaysAgo = new Date(now.getTime() - 5 * oneDay);
    const pendingFollowups = await this.prisma.application.findMany({
      where: {
        userId,
        status: ApplicationStatus.APPLIED,
        appliedAt: { lte: fiveDaysAgo },
      },
      take: 2,
    });
    for (const app of pendingFollowups) {
      actions.push({
        id: `action-followup-${app.id}`,
        type: 'FOLLOW_UP',
        priority: 'MEDIUM',
        title: `Follow up with ${app.companyNameSnapshot}`,
        description: `It has been over 5 days since you submitted your application for ${app.jobTitleSnapshot}.`,
        jobId: app.jobId,
        applicationId: app.id,
        actionUrl: `/applications/${app.id}`,
      });
    }

    // 4. Missing skill gaps on user's strongest match posting (match score >= 75%)
    const matchScores = await this.prisma.matchScore.findMany({
      where: { userId, overallScore: { gte: 75 } },
      include: {
        job: { select: { title: true, requirements: true, company: { select: { name: true } } } },
      },
      orderBy: { overallScore: 'desc' },
      take: 3,
    });

    const userSkills = await this.prisma.userSkill.findMany({
      where: { userId },
      include: { skill: true },
    });
    const skillsSet = new Set(userSkills.map((us) => us.skill.name.toLowerCase()));

    const missingSkillsFreq: Record<string, number> = {};
    for (const score of matchScores) {
      const reqs = score.job?.requirements ?? [];
      for (const req of reqs) {
        if (!skillsSet.has(req.toLowerCase())) {
          missingSkillsFreq[req] = (missingSkillsFreq[req] ?? 0) + 1;
        }
      }
    }

    const sortedGaps = Object.entries(missingSkillsFreq)
      .sort((a, b) => b[1] - a[1])
      .map((entry) => entry[0]);

    if (sortedGaps.length > 0) {
      const topGap = sortedGaps[0];
      actions.push({
        id: `action-skill-${topGap}`,
        type: 'SKILL_UPGRADE',
        priority: 'MEDIUM',
        title: `Learn and practice ${topGap}`,
        description: `Highly requested skill in your top matching postings.`,
        actionUrl: `/skills`,
      });
    }

    if (actions.length === 0) {
      actions.push({
        id: 'action-explore-fallback',
        type: 'EXPLORE',
        priority: 'LOW',
        title: 'Discover new matching internships',
        description: "You're all caught up! Search and discover new opportunities.",
        actionUrl: `/opportunities`,
      });
    }

    return actions;
  }

  async getPrioritizedApplications(userId: string) {
    const apps = await this.prisma.application.findMany({
      where: { userId },
      orderBy: { priorityScore: 'desc' },
      include: { job: { select: { company: true } } },
    });

    return {
      urgent: apps.filter((a) => a.priorityLabel === 'URGENT'),
      high: apps.filter((a) => a.priorityLabel === 'HIGH'),
      medium: apps.filter((a) => a.priorityLabel === 'MEDIUM'),
      low: apps.filter((a) => a.priorityLabel === 'LOW'),
    };
  }

  async analyzeApplication(userId: string, id: string) {
    const app = await this.findOne(userId, id);
    const profile = await this.prisma.profile.findUnique({ where: { userId } });

    // 1. Calculate readiness score
    const hasResume = !!app.resumeVersionId;
    const hasCoverLetter = !!app.coverLetterText;
    const hasPortfolio = !!app.portfolioUrl;

    let completenessPoints = 0;
    if (profile?.degree && profile?.college && profile?.cgpa) completenessPoints = 20;
    const resumePoints = hasResume ? 30 : 0;
    const coverLetterPoints = hasCoverLetter ? 20 : 0;
    const portfolioPoints = hasPortfolio ? 10 : 0;

    let skillPoints = 0;
    const matchScore = app.job.matchScores[0];
    if (matchScore) {
      skillPoints = Math.floor((matchScore.skillScore ?? 0) * 0.2); // max 20%
    }

    const readinessScore =
      completenessPoints + resumePoints + coverLetterPoints + portfolioPoints + skillPoints;

    // 2. Perform Resume Alignment Analysis
    let resumeText = '';
    if (app.resumeVersion) {
      const content = app.resumeVersion.contentJson as any;
      resumeText = content?.resumeText || JSON.stringify(content) || '';
    }

    // Call AI service if available and configured
    try {
      if (app.resumeVersion && app.job.description) {
        const aiAnalysis = await this.aiService.analyzeResume(
          userId,
          `Job Title: ${app.job.title}\nJob Description: ${app.job.description}\n\nCandidate Resume:\n${resumeText}`,
        );
        return {
          readinessScore,
          strengths: aiAnalysis.keyStrengths || [
            'Your experience lines up with general requirements.',
          ],
          potentialWeaknesses: aiAnalysis.improvements || [],
          missingKeywords: aiAnalysis.missingKeywords || [],
          resumeAlignment: aiAnalysis.summary || 'Strong general fit.',
        };
      }
    } catch {
      // Fallback
    }

    const matchedSkills: string[] = [];
    const missingSkills: string[] = [];
    const jobReqs = app.job.requirements ?? [];

    const userSkills = await this.prisma.userSkill.findMany({
      where: { userId },
      include: { skill: true },
    });
    const skillsSet = new Set(userSkills.map((us) => us.skill.name.toLowerCase()));

    for (const req of jobReqs) {
      if (skillsSet.has(req.toLowerCase())) {
        matchedSkills.push(req);
      } else {
        missingSkills.push(req);
      }
    }

    return {
      readinessScore,
      strengths:
        matchedSkills.length > 0
          ? [`Matches core skills: ${matchedSkills.slice(0, 3).join(', ')}`]
          : ['General alignment.'],
      potentialWeaknesses:
        missingSkills.length > 0
          ? [`Missing desired skills: ${missingSkills.slice(0, 3).join(', ')}`]
          : [],
      missingKeywords: missingSkills,
      resumeAlignment:
        'Deterministic local comparison: please link or generate an AI-tailored resume version for in-depth insights.',
    };
  }

  async generateCoverLetter(userId: string, id: string) {
    const app = await this.findOne(userId, id);
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    const userSkills = await this.prisma.userSkill.findMany({
      where: { userId },
      include: { skill: true },
    });

    const skills = userSkills.map((us) => us.skill.name).join(', ');

    try {
      const generated = await this.aiService.generateCoverLetter(userId, app.jobId);
      if (generated?.content) {
        await this.prisma.application.update({
          where: { id },
          data: { coverLetterText: generated.content },
        });
        return { content: generated.content };
      }
    } catch {
      // Fallback
    }

    // Factual cover letter template
    const content = `Dear Hiring Team at ${app.companyNameSnapshot},

I am writing to express my strong interest in the ${app.jobTitleSnapshot} position. With my background in ${profile?.degree || 'Computer Science'} at ${profile?.college || 'University'} and skills in ${skills || 'software engineering'}, I am excited for the opportunity to contribute to your team.

Thank you for your time and consideration.

Sincerely,
${profile?.degree ? 'Candidate' : 'Applicant'}`;

    await this.prisma.application.update({
      where: { id },
      data: { coverLetterText: content },
    });

    return { content };
  }

  async generateFollowUp(userId: string, id: string) {
    const app = await this.findOne(userId, id);
    const profile = await this.prisma.profile.findUnique({ where: { userId } });

    const subject = `Following up regarding ${app.jobTitleSnapshot} application`;
    const body = `Dear Hiring Team at ${app.companyNameSnapshot},

I hope this email finds you well. 

I am writing to follow up on my application for the ${app.jobTitleSnapshot} position, which I submitted on ${app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : 'recently'}. I remain highly interested in the internship opportunity and would love to provide any additional information if needed.

Thank you again for your time and consideration.

Sincerely,
${profile?.degree ? 'Candidate' : 'Applicant'}`;

    return { subject, body };
  }

  private async scheduleReminder(
    userId: string,
    applicationId: string,
    date: Date,
    action?: string,
  ) {
    if (date > new Date()) {
      try {
        await this.notificationsService.queueNotification({
          userId,
          type: 'SYSTEM' as any,
          title: 'Application Action Required',
          message: `Reminder: ${action || 'Follow up on your application'}`,
          channel: 'PUSH' as any,
          scheduledFor: date,
        });
      } catch (e) {
        console.error(`Failed to schedule reminder for ${applicationId}`, e);
      }
    }
  }
}
