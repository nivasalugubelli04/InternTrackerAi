import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface ApplicationRiskIndicator {
  level: 'LOW RISK' | 'MEDIUM RISK' | 'HIGH ATTENTION';
  signals: string[];
}

@Injectable()
export class ApplicationFollowUpService {
  constructor(private readonly prisma: PrismaService) {}

  async getFollowUpGuidance(userId: string, applicationId: string) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: { job: true },
    });

    if (!application || application.userId !== userId) {
      throw new Error('Application not found');
    }

    const readinessScore = await this.prisma.preparationPlan.findFirst({
      where: { userId, jobId: application.jobId },
    });

    const indicator = this.calculateRisk(application, readinessScore);

    return {
      applicationId,
      status: application.status,
      indicator,
      guidance: this.generateGuidance(application.status, indicator.level),
    };
  }

  private calculateRisk(application: any, plan: any): ApplicationRiskIndicator {
    const signals: string[] = [];
    let riskPoints = 0;

    // Check preparation plan
    if (!plan || plan.overallReadiness < 40) {
      riskPoints += 2;
      signals.push('Low overall preparation readiness');
    } else if (plan.overallReadiness < 70) {
      riskPoints += 1;
      signals.push('Preparation plan needs improvement');
    }

    // Check time since apply
    if (application.status === 'APPLIED' && application.appliedAt) {
      const daysSinceApply = (Date.now() - application.appliedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceApply > 14) {
        riskPoints += 1;
        signals.push('Application pending for more than 2 weeks');
      }
    }

    if (riskPoints >= 3) {
      return { level: 'HIGH ATTENTION', signals };
    } else if (riskPoints >= 1) {
      return { level: 'MEDIUM RISK', signals };
    }
    return { level: 'LOW RISK', signals };
  }

  private generateGuidance(status: string, riskLevel: string): string[] {
    const guidance = [];
    if (status === 'APPLIED') {
      if (riskLevel === 'HIGH ATTENTION') {
        guidance.push('Review job requirements immediately');
        guidance.push('Start a mock interview session');
      }
      guidance.push('Follow-up suggested if no response in 2 weeks');
      guidance.push('Prepare for possible interview');
    } else if (status === 'INTERVIEW') {
      guidance.push('Focus exclusively on Behavioral and Technical mock interviews');
      guidance.push('Research the company deeply');
    }
    return guidance;
  }
}
