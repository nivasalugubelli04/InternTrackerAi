import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { RecordedSignal } from '../interfaces/optimization.interfaces';

@Injectable()
export class SignalCollectorService {
  private readonly logger = new Logger(SignalCollectorService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validates and records a standardized learning signal.
   */
  async recordSignal(params: RecordedSignal) {
    // 1. Data Quality Check
    const qualityPassed = this.validateSignalQuality(params);

    this.logger.debug(
      `Recording signal [${params.signalType}] from [${params.sourceEngine}] for user ${params.userId} (quality: ${qualityPassed})`,
    );

    return this.prisma.careerLearningSignal.create({
      data: {
        userId: params.userId,
        signalType: params.signalType as any,
        sourceEngine: params.sourceEngine,
        entityType: params.entityType || null,
        entityId: params.entityId || null,
        payload: params.payload || {},
        confidence: params.confidence ?? 1.0,
        qualityPassed,
      },
    });
  }

  /**
   * Retrieves signals for pattern analysis within an observation window.
   */
  async getSignals(userId: string, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return this.prisma.careerLearningSignal.findMany({
      where: {
        userId,
        createdAt: { gte: since },
        qualityPassed: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Checks signal data sufficiency for a user.
   */
  async checkDataSufficiency(userId: string): Promise<{
    isSufficient: boolean;
    totalSignals: number;
    message: string;
  }> {
    const totalSignals = await this.prisma.careerLearningSignal.count({
      where: { userId, qualityPassed: true },
    });

    if (totalSignals < 5) {
      return {
        isSufficient: false,
        totalSignals,
        message:
          'We are still learning from your career activity. Complete more tasks to unlock personalized optimization insights.',
      };
    }

    return {
      isSufficient: true,
      totalSignals,
      message: `Analysis grounded in ${totalSignals} verified career activity signals.`,
    };
  }

  private validateSignalQuality(params: RecordedSignal): boolean {
    if (!params.userId || !params.signalType || !params.sourceEngine) {
      return false;
    }
    if (params.confidence !== undefined && (params.confidence < 0 || params.confidence > 1)) {
      return false;
    }
    return true;
  }
}
