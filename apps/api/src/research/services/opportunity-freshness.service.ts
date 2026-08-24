import { Injectable, Logger } from '@nestjs/common';
import { FreshnessStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OpportunityFreshnessService {
  private readonly logger = new Logger(OpportunityFreshnessService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Computes the freshness lifecycle status for an opportunity.
   */
  computeFreshnessStatus(
    createdAt: Date,
    deadline?: Date | null,
    lastVerifiedAt: Date = new Date(),
  ): {
    status: FreshnessStatus;
    deadlineDaysLeft: number | null;
    isExpired: boolean;
  } {
    const now = new Date();

    let deadlineDaysLeft: number | null = null;

    if (deadline) {
      const diffMs = deadline.getTime() - now.getTime();
      deadlineDaysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (deadlineDaysLeft < 0) {
        return { status: FreshnessStatus.EXPIRED, deadlineDaysLeft, isExpired: true };
      }
      if (deadlineDaysLeft <= 3) {
        return { status: FreshnessStatus.DEADLINE_SOON, deadlineDaysLeft, isExpired: false };
      }
    }

    const ageHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    if (ageHours <= 48) {
      return { status: FreshnessStatus.NEW, deadlineDaysLeft, isExpired: false };
    }

    const verificationAgeDays = (now.getTime() - lastVerifiedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (verificationAgeDays > 14) {
      return { status: FreshnessStatus.POSSIBLY_EXPIRED, deadlineDaysLeft, isExpired: false };
    }

    if (ageHours <= 168) {
      return { status: FreshnessStatus.RECENT, deadlineDaysLeft, isExpired: false };
    }

    return { status: FreshnessStatus.ACTIVE, deadlineDaysLeft, isExpired: false };
  }

  /**
   * Records or refreshes the OpportunityFreshness state for a job posting.
   */
  async recordFreshness(
    jobPostingId: string,
    deadline?: Date | null,
    verificationSource = 'OFFICIAL_PAGE',
  ) {
    const job = await this.prisma.jobPosting.findUnique({
      where: { id: jobPostingId },
      select: { createdAt: true },
    });

    const createdAt = job?.createdAt || new Date();
    const { status, deadlineDaysLeft, isExpired } = this.computeFreshnessStatus(
      createdAt,
      deadline,
    );

    return this.prisma.opportunityFreshness.upsert({
      where: { jobPostingId },
      create: {
        jobPostingId,
        freshnessStatus: status,
        verificationSource,
        deadlineDaysLeft,
        isExpired,
        lastVerifiedAt: new Date(),
        expiredAt: isExpired ? new Date() : null,
      },
      update: {
        freshnessStatus: status,
        verificationSource,
        deadlineDaysLeft,
        isExpired,
        lastVerifiedAt: new Date(),
        expiredAt: isExpired ? new Date() : null,
      },
    });
  }

  /**
   * Runs periodic background check to mark expired opportunities.
   */
  async sweepExpiredOpportunities(): Promise<number> {
    this.logger.log('Sweeping for expired opportunity deadlines');
    const now = new Date();

    const expiredJobs = await this.prisma.jobPosting.findMany({
      where: {
        status: 'ACTIVE',
        deadline: { lt: now },
      },
      select: { id: true },
    });

    if (expiredJobs.length === 0) return 0;

    await this.prisma.jobPosting.updateMany({
      where: { id: { in: expiredJobs.map((j) => j.id) } },
      data: { status: 'EXPIRED' },
    });

    for (const job of expiredJobs) {
      await this.prisma.opportunityFreshness.upsert({
        where: { jobPostingId: job.id },
        create: {
          jobPostingId: job.id,
          freshnessStatus: FreshnessStatus.EXPIRED,
          isExpired: true,
          expiredAt: now,
          lastVerifiedAt: now,
        },
        update: {
          freshnessStatus: FreshnessStatus.EXPIRED,
          isExpired: true,
          expiredAt: now,
          lastVerifiedAt: now,
        },
      });
    }

    this.logger.log(`Marked ${expiredJobs.length} opportunities as expired.`);
    return expiredJobs.length;
  }
}
