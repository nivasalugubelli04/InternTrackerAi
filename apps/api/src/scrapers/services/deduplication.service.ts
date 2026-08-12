import { Injectable, Logger } from '@nestjs/common';
import { JobPostingStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import type { NormalizedJobData } from './normalizer.service';

export interface DeduplicationResult {
  added: number;
  updated: number;
  unchanged: number;
}

@Injectable()
export class DeduplicationService {
  private readonly logger = new Logger(DeduplicationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Persists normalized jobs safely into the database, preventing duplicates via SHA-256 hash or externalJobId.
   */
  async processJobPostings(
    companyId: string,
    normalizedJobs: NormalizedJobData[],
  ): Promise<DeduplicationResult> {
    let added = 0;
    let updated = 0;
    let unchanged = 0;

    for (const job of normalizedJobs) {
      try {
        const existingJob = await this.prisma.jobPosting.findUnique({
          where: { hash: job.hash },
        });

        if (!existingJob) {
          // Check by externalJobId & companyId if hash didn't match
          let existingByExternalId = null;
          if (job.externalJobId) {
            existingByExternalId = await this.prisma.jobPosting.findFirst({
              where: {
                companyId,
                externalJobId: job.externalJobId,
              },
            });
          }

          if (existingByExternalId) {
            await this.prisma.jobPosting.update({
              where: { id: existingByExternalId.id },
              data: {
                title: job.title,
                department: job.department ?? null,
                employmentType: job.employmentType ?? null,
                experienceLevel: job.experienceLevel ?? null,
                location: job.location ?? null,
                workMode: job.workMode ?? null,
                stipend: job.stipend ?? null,
                salary: job.salary ?? null,
                duration: job.duration ?? null,
                description: job.description ?? null,
                requirements: job.requirements,
                responsibilities: job.responsibilities,
                benefits: job.benefits,
                applicationUrl: job.applicationUrl,
                status: JobPostingStatus.ACTIVE,
                updatedAt: new Date(),
              },
            });
            updated++;
          } else {
            await this.prisma.jobPosting.create({
              data: {
                companyId,
                externalJobId: job.externalJobId ?? null,
                title: job.title,
                department: job.department ?? null,
                employmentType: job.employmentType ?? null,
                experienceLevel: job.experienceLevel ?? null,
                location: job.location ?? null,
                workMode: job.workMode ?? null,
                stipend: job.stipend ?? null,
                salary: job.salary ?? null,
                duration: job.duration ?? null,
                description: job.description ?? null,
                requirements: job.requirements,
                responsibilities: job.responsibilities,
                benefits: job.benefits,
                applicationUrl: job.applicationUrl,
                postedDate: job.postedDate ?? null,
                deadline: job.deadline ?? null,
                status: JobPostingStatus.ACTIVE,
                source: job.source,
                hash: job.hash,
              },
            });
            added++;
          }
        } else {
          // Hash matched - update timestamp / minor changes if needed
          await this.prisma.jobPosting.update({
            where: { id: existingJob.id },
            data: {
              status: JobPostingStatus.ACTIVE,
              updatedAt: new Date(),
            },
          });
          unchanged++;
        }
      } catch (err) {
        this.logger.error(
          `Error persisting job "${job.title}" (${job.hash}): ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    this.logger.log(
      `Deduplication finished for company ${companyId}: ${added} added, ${updated} updated, ${unchanged} unchanged.`,
    );
    return { added, updated, unchanged };
  }

  /**
   * Persists raw job payloads snapshot.
   */
  async saveRawJobPosting(
    companyId: string,
    rawPayloads: any[],
    htmlSnapshotUrl?: string,
    parserVersion = '1.0.0',
  ): Promise<void> {
    try {
      await this.prisma.rawJobPosting.create({
        data: {
          companyId,
          rawJson: rawPayloads,
          htmlSnapshotUrl: htmlSnapshotUrl ?? null,
          parserVersion,
        },
      });
    } catch (err) {
      this.logger.error(
        `Failed to save raw job posting for company ${companyId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
