import { Injectable, Logger } from '@nestjs/common';

import {
  BaselineCareerSnapshot,
  ConstraintValidationResult,
  SimulationVariables,
  TimeAllocation,
} from '../interfaces/simulation.interfaces';

@Injectable()
export class RealismConstraintService {
  private readonly logger = new Logger(RealismConstraintService.name);

  /**
   * Validates a scenario's variables and time allocation against the user's execution capacity.
   * Identifies impossible workloads and suggests balanced adjustments.
   */
  validateConstraints(
    baseline: BaselineCareerSnapshot,
    variables: SimulationVariables,
    timeAllocation: TimeAllocation,
  ): ConstraintValidationResult {
    this.logger.log('Validating workload constraints');
    const maxWeeklyHoursAvailable =
      baseline.weeklyAvailableMinutes > 0 ? baseline.weeklyAvailableMinutes / 60 : 10; // default 10h/week

    const violations: string[] = [];
    const warnings: string[] = [];
    const adjustmentsSuggested: string[] = [];

    // 1. Validate Time Allocation Percentage Sum
    const totalPercent =
      (timeAllocation.learningPercent || 0) +
      (timeAllocation.projectsPercent || 0) +
      (timeAllocation.applicationsPercent || 0) +
      (timeAllocation.interviewPrepPercent || 0) +
      (timeAllocation.networkingPercent || 0);

    if (Math.abs(totalPercent - 100) > 1) {
      warnings.push(`Time allocation percentages sum to ${totalPercent}%, normalized to 100%.`);
    }

    // 2. Calculate Hours Demanded by Simulation Variables
    let demandedHours = 0;

    // Skill investment hours
    if (variables.skillInvestment) {
      demandedHours += variables.skillInvestment.weeklyHours || 0;
      if (variables.skillInvestment.weeklyHours > 25) {
        violations.push(
          'Skill investment alone exceeds 25h/week, creating severe cognitive fatigue risk.',
        );
      }
    } else {
      demandedHours += (maxWeeklyHoursAvailable * (timeAllocation.learningPercent || 0)) / 100;
    }

    // Project strategy hours
    if (variables.projectStrategy) {
      demandedHours += variables.projectStrategy.weeklyHours || 0;
      if (variables.projectStrategy.weeklyHours > 30) {
        violations.push('Project work exceeds 30h/week without sufficient rest periods.');
      }
    } else {
      demandedHours += (maxWeeklyHoursAvailable * (timeAllocation.projectsPercent || 0)) / 100;
    }

    // Application strategy hours (estimate 1.25 hours per tailored application)
    if (variables.applicationStrategy) {
      const extraApps = variables.applicationStrategy.additionalWeeklyApplications || 0;
      demandedHours += extraApps * 1.25;
      if (extraApps > 20) {
        violations.push(
          `Applying to ${extraApps} roles/week may compromise tailored application quality.`,
        );
        adjustmentsSuggested.push(
          'Reduce weekly applications to 5–8 high-alignment opportunities.',
        );
      }
    } else {
      demandedHours += (maxWeeklyHoursAvailable * (timeAllocation.applicationsPercent || 0)) / 100;
    }

    // Interview prep hours (estimate 1.5h per mock + practice hours)
    if (variables.interviewPrep) {
      const mockHours = (variables.interviewPrep.weeklyMockSessions || 0) * 1.5;
      const practiceHours = variables.interviewPrep.weeklyPracticeHours || 0;
      demandedHours += mockHours + practiceHours;
    } else {
      demandedHours += (maxWeeklyHoursAvailable * (timeAllocation.interviewPrepPercent || 0)) / 100;
    }

    // Networking hours (estimate 0.75h per personalized outreach)
    if (variables.networkingStrategy) {
      const outreachCount = variables.networkingStrategy.weeklyOutreachCount || 0;
      demandedHours += outreachCount * 0.75;
      if (outreachCount > 15) {
        warnings.push(
          'High volume outreach without warm context yields lower referral conversion.',
        );
      }
    } else {
      demandedHours += (maxWeeklyHoursAvailable * (timeAllocation.networkingPercent || 0)) / 100;
    }

    const totalWeeklyHoursRequired = Math.round(demandedHours * 10) / 10;
    const utilizationPercentage = Math.round(
      (totalWeeklyHoursRequired / maxWeeklyHoursAvailable) * 100,
    );

    // 3. Evaluate Overload and Realism Thresholds
    let isRealistic = true;

    if (utilizationPercentage > 140) {
      isRealistic = false;
      violations.push(
        `Required workload (${totalWeeklyHoursRequired}h/wk) exceeds your configured capacity (${maxWeeklyHoursAvailable}h/wk) by ${utilizationPercentage - 100}%.`,
      );
      adjustmentsSuggested.push(
        `Scale back weekly commitments by ${Math.round(totalWeeklyHoursRequired - maxWeeklyHoursAvailable)}h or extend your time horizon.`,
      );
    } else if (utilizationPercentage > 115) {
      warnings.push(
        `Workload is high (${utilizationPercentage}% of weekly capacity). Sustainable for short sprints only.`,
      );
    }

    if (violations.length > 0) {
      isRealistic = false;
    }

    return {
      isRealistic,
      totalWeeklyHoursRequired,
      maxWeeklyHoursAvailable,
      utilizationPercentage,
      violations,
      warnings,
      adjustmentsSuggested,
    };
  }
}
