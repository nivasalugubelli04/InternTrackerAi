import * as crypto from 'crypto';

import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AiCacheService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Computes a SHA-256 hash of a JSON payload to uniquely identify the prompt parameters.
   */
  generateInputHash(payload: Record<string, any>): string {
    const serialized = JSON.stringify(payload);
    return crypto.createHash('sha256').update(serialized).digest('hex');
  }

  /**
   * Retrieves a cached analysis record if the input hash matches.
   */
  async getAnalysis(
    userId: string,
    jobId: string | null,
    analysisType: string,
    inputHash: string,
  ): Promise<any | null> {
    const analysis = await this.prisma.aiAnalysis.findFirst({
      where: {
        userId,
        jobId,
        analysisType,
        inputHash,
      },
    });

    return analysis ? analysis.resultJson : null;
  }

  /**
   * Saves or updates an analysis cache record.
   */
  async saveAnalysis(
    userId: string,
    jobId: string | null,
    analysisType: string,
    inputHash: string,
    resultJson: any,
    provider: string,
    model: string,
  ): Promise<void> {
    const existing = await this.prisma.aiAnalysis.findFirst({
      where: {
        userId,
        jobId,
        analysisType,
      },
    });

    if (existing) {
      await this.prisma.aiAnalysis.update({
        where: { id: existing.id },
        data: {
          inputHash,
          resultJson,
          provider,
          model,
        },
      });
    } else {
      await this.prisma.aiAnalysis.create({
        data: {
          userId,
          jobId,
          analysisType,
          inputHash,
          resultJson,
          provider,
          model,
        },
      });
    }
  }
}
