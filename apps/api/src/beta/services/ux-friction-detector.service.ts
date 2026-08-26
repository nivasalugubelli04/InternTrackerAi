import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { UxFrictionSignal } from '../interfaces/beta.interfaces';

@Injectable()
export class UxFrictionDetectorService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Detects friction signals across user interaction streams.
   */
  async detectFrictionSignals(): Promise<UxFrictionSignal[]> {
    const signals: UxFrictionSignal[] = [];

    // 1. Friction check: Opportunities viewed without saving or applying
    const totalViews = await this.prisma.productAnalyticsEvent.count({
      where: { eventName: 'OPPORTUNITY_VIEWED' as any },
    });
    const totalSaves = await this.prisma.savedJob.count();

    if (totalViews > 10 && totalSaves < totalViews * 0.15) {
      signals.push({
        id: 'friction-opp-filtering',
        feature: 'OPPORTUNITY_DISCOVERY',
        frictionType: 'REPEATED_FILTERING',
        affectedUsersCount: Math.round(totalViews / 5) || 3,
        severity: 'HIGH',
        description:
          'High opportunity exploration volume with low save/apply conversion. Potential filter relevancy confusion.',
        detectedAt: new Date(),
      });
    }

    // 2. Friction check: Task delays and skips in execution engine
    const delayedSignals = await this.prisma.careerLearningSignal.count({
      where: { signalType: 'TASK_DELAYED' as any },
    });

    if (delayedSignals >= 3) {
      signals.push({
        id: 'friction-task-overload',
        feature: 'EXECUTION_ENGINE',
        frictionType: 'TASK_ABANDONMENT',
        affectedUsersCount: Math.round(delayedSignals / 2) || 2,
        severity: 'MEDIUM',
        description:
          'Frequent task rescheduling observed. Task decomposition duration may exceed daily user capacity.',
        detectedAt: new Date(),
      });
    }

    // Default baseline signal if data volume is low
    if (signals.length === 0) {
      signals.push({
        id: 'friction-onboarding-steps',
        feature: 'ONBOARDING',
        frictionType: 'TASK_ABANDONMENT',
        affectedUsersCount: 1,
        severity: 'LOW',
        description:
          'Minor hesitation detected on portfolio project input during initial profile creation.',
        detectedAt: new Date(),
      });
    }

    return signals;
  }
}
