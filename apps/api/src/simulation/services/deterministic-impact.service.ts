import { Injectable, Logger } from '@nestjs/common';

import {
  BaselineCareerSnapshot,
  ConstraintValidationResult,
  DimensionScore,
  ImpactAssessment,
  ImpactDimension,
  ImpactDirection,
  SimulationVariables,
  TimeAllocation,
} from '../interfaces/simulation.interfaces';

@Injectable()
export class DeterministicImpactService {
  private readonly logger = new Logger(DeterministicImpactService.name);

  /**
   * Calculates deterministic 9-dimension impact ratings, trade-offs, risks, and sensitivity analysis.
   * No hallucinations or fake certainty — calculated directly from user signals and scenario variables.
   */
  calculateImpact(
    baseline: BaselineCareerSnapshot,
    variables: SimulationVariables,
    timeAllocation: TimeAllocation,
    constraints: ConstraintValidationResult,
  ): ImpactAssessment {
    this.logger.log('Calculating deterministic impact scores');
    const dimensions: Record<ImpactDimension, DimensionScore> = {} as any;
    const benefits: string[] = [];
    const tradeOffs: string[] = [];
    const risks: ImpactAssessment['risks'] = [];
    const sensitivityFactors: ImpactAssessment['sensitivityFactors'] = [];

    // ─── 1. SKILL DEVELOPMENT ────────────────────────────────────────────────
    const skillBase = Math.min(85, baseline.skills.length * 10);
    let skillDelta = 0;
    if (variables.skillInvestment) {
      const hours = variables.skillInvestment.weeklyHours;
      skillDelta = Math.round(hours * 2.5);
      benefits.push(
        `Accelerates mastery of ${variables.skillInvestment.skillName} (+${skillDelta} pts).`,
      );
      sensitivityFactors.push({
        variable: 'Skill Investment Hours',
        leverage: 'HIGH',
        impactExplanation: `Directly raises technical qualification for target roles requiring ${variables.skillInvestment.skillName}.`,
      });
    } else {
      skillDelta = Math.round(((timeAllocation.learningPercent || 0) / 100) * 15);
    }
    const skillScore = Math.min(95, Math.max(10, skillBase + skillDelta));
    dimensions.SKILL_DEVELOPMENT = {
      score: skillScore,
      delta: skillDelta,
      direction:
        skillDelta >= 12 ? 'STRONG_INCREASE' : skillDelta > 0 ? 'MODERATE_INCREASE' : 'NEUTRAL',
      summary: `Estimated skill progression: ${skillDelta > 0 ? `+${skillDelta} delta` : 'steady baseline'}.`,
    };

    // ─── 2. PORTFOLIO STRENGTH ──────────────────────────────────────────────
    let portBase = baseline.projects.length * 20;
    if (baseline.projects.some((p) => p.isDeployed)) portBase += 20;
    portBase = Math.min(80, Math.max(15, portBase));

    let portDelta = 0;
    if (variables.projectStrategy?.deployToPublic) {
      portDelta += 25;
      benefits.push(
        `Deploying ${variables.projectStrategy.projectTitle} publicly adds verified live evidence.`,
      );
      sensitivityFactors.push({
        variable: 'Public Project Deployment',
        leverage: 'HIGH',
        impactExplanation:
          'Live demo links provide verifiable proof of engineering competency to recruiters.',
      });
    } else if (variables.portfolioStrategy?.linkLiveDemos) {
      portDelta += 15;
    } else {
      portDelta = Math.round(((timeAllocation.projectsPercent || 0) / 100) * 18);
    }
    const portScore = Math.min(98, portBase + portDelta);
    dimensions.PORTFOLIO_STRENGTH = {
      score: portScore,
      delta: portDelta,
      direction:
        portDelta >= 20 ? 'STRONG_INCREASE' : portDelta > 0 ? 'MODERATE_INCREASE' : 'NEUTRAL',
      summary: `Portfolio evidence depth: ${portDelta > 0 ? `+${portDelta} delta` : 'unchanged'}.`,
    };

    // ─── 3. APPLICATION READINESS ───────────────────────────────────────────
    const appBase = baseline.activeApplicationCount > 0 ? 55 : 30;
    let appDelta = 0;
    if (variables.applicationStrategy) {
      const extra = variables.applicationStrategy.additionalWeeklyApplications || 0;
      appDelta = Math.min(35, extra * 4);
      benefits.push(
        `Submitting ${extra} additional tailored applications per week broadens pipeline reach.`,
      );
      sensitivityFactors.push({
        variable: 'Application Volume',
        leverage: 'MEDIUM',
        impactExplanation:
          'Higher volume increases interview opportunity probability when match score is maintained.',
      });
    } else {
      appDelta = Math.round(((timeAllocation.applicationsPercent || 0) / 100) * 12);
    }
    const appScore = Math.min(95, appBase + appDelta);
    dimensions.APPLICATION_READINESS = {
      score: appScore,
      delta: appDelta,
      direction:
        appDelta >= 20 ? 'STRONG_INCREASE' : appDelta > 0 ? 'MODERATE_INCREASE' : 'NEUTRAL',
      summary: `Application pipeline momentum: ${appDelta > 0 ? `+${appDelta} delta` : 'steady'}.`,
    };

    // ─── 4. INTERVIEW READINESS ─────────────────────────────────────────────
    const intBase = baseline.mockInterviewAvgScore || 40;
    let intDelta = 0;
    if (variables.interviewPrep) {
      const mocks = variables.interviewPrep.weeklyMockSessions || 0;
      const practice = variables.interviewPrep.weeklyPracticeHours || 0;
      intDelta = Math.min(30, mocks * 8 + practice * 2);
      benefits.push(
        `Structured interview prep (${variables.interviewPrep.focusArea}) sharpens technical communication.`,
      );
      sensitivityFactors.push({
        variable: 'Interview Prep Sessions',
        leverage: 'HIGH',
        impactExplanation:
          'Mock interviews directly increase conversion from initial screen to offer.',
      });
    } else {
      intDelta = Math.round(((timeAllocation.interviewPrepPercent || 0) / 100) * 14);
    }
    const intScore = Math.min(95, intBase + intDelta);
    dimensions.INTERVIEW_READINESS = {
      score: intScore,
      delta: intDelta,
      direction:
        intDelta >= 15 ? 'STRONG_INCREASE' : intDelta > 0 ? 'MODERATE_INCREASE' : 'NEUTRAL',
      summary: `Interview performance readiness: ${intDelta > 0 ? `+${intDelta} delta` : 'baseline'}.`,
    };

    // ─── 5. NETWORKING MOMENTUM ─────────────────────────────────────────────
    const netBase = Math.min(70, baseline.networkingContactCount * 12 + 20);
    let netDelta = 0;
    if (variables.networkingStrategy) {
      const outreach = variables.networkingStrategy.weeklyOutreachCount || 0;
      netDelta = Math.min(30, outreach * 5);
      benefits.push(`Outreach to ${outreach} contacts/week builds warm referral possibilities.`);
    } else {
      netDelta = Math.round(((timeAllocation.networkingPercent || 0) / 100) * 10);
    }
    const netScore = Math.min(90, netBase + netDelta);
    dimensions.NETWORKING_MOMENTUM = {
      score: netScore,
      delta: netDelta,
      direction:
        netDelta >= 15 ? 'STRONG_INCREASE' : netDelta > 0 ? 'MODERATE_INCREASE' : 'NEUTRAL',
      summary: `Professional network engagement: ${netDelta > 0 ? `+${netDelta} delta` : 'steady'}.`,
    };

    // ─── 6. CAREER ALIGNMENT ────────────────────────────────────────────────
    const alignmentBase = baseline.targetRole ? 65 : 40;
    const alignmentDelta = Math.round(skillDelta * 0.4 + portDelta * 0.4 + intDelta * 0.2);
    const alignmentScore = Math.min(95, alignmentBase + alignmentDelta);
    dimensions.CAREER_ALIGNMENT = {
      score: alignmentScore,
      delta: alignmentDelta,
      direction:
        alignmentDelta >= 15
          ? 'STRONG_INCREASE'
          : alignmentDelta > 0
            ? 'MODERATE_INCREASE'
            : 'NEUTRAL',
      summary: `Alignment with target role (${baseline.targetRole || 'Engineering'}): +${alignmentDelta} delta.`,
    };

    // ─── 7. EXECUTION LOAD ──────────────────────────────────────────────────
    const loadScore = Math.min(100, constraints.utilizationPercentage);
    let loadDirection: ImpactDirection = 'NEUTRAL';
    if (loadScore > 130) loadDirection = 'HIGH_RISK';
    else if (loadScore > 105) loadDirection = 'MODERATE_DECREASE';
    else if (loadScore >= 80) loadDirection = 'STRONG_INCREASE'; // healthy load

    dimensions.EXECUTION_LOAD = {
      score: loadScore,
      delta: loadScore - 100,
      direction: loadDirection,
      summary: `${loadScore}% of weekly capacity (${constraints.totalWeeklyHoursRequired}h / ${constraints.maxWeeklyHoursAvailable}h).`,
    };

    // ─── 8. CAREER MOMENTUM ─────────────────────────────────────────────────
    const momentumBase =
      baseline.careerMomentum === 'ACCELERATING'
        ? 75
        : baseline.careerMomentum === 'STABLE'
          ? 55
          : 40;
    const momentumDelta = Math.round((skillDelta + portDelta + appDelta + intDelta) / 4);
    const momentumScore = Math.min(95, momentumBase + momentumDelta);
    dimensions.CAREER_MOMENTUM = {
      score: momentumScore,
      delta: momentumDelta,
      direction: momentumDelta >= 15 ? 'STRONG_INCREASE' : 'MODERATE_INCREASE',
      summary: `Trajectory velocity: +${momentumDelta} delta across all pillars.`,
    };

    // ─── 9. OPPORTUNITY READINESS ───────────────────────────────────────────
    const oppBase = Math.round(portBase * 0.35 + skillBase * 0.35 + intBase * 0.3);
    const oppDelta = Math.round(portDelta * 0.4 + skillDelta * 0.3 + intDelta * 0.3);
    const oppScore = Math.min(95, oppBase + oppDelta);
    dimensions.OPPORTUNITY_READINESS = {
      score: oppScore,
      delta: oppDelta,
      direction: oppDelta >= 15 ? 'STRONG_INCREASE' : 'MODERATE_INCREASE',
      summary: `Readiness to convert high-tier internship postings: +${oppDelta} delta.`,
    };

    // ─── TRADE-OFFS IDENTIFICATION ───────────────────────────────────────────
    if (timeAllocation.projectsPercent >= 40 && timeAllocation.applicationsPercent <= 15) {
      tradeOffs.push(
        'Heavy project focus leaves less weekly bandwidth for active application pipeline growth.',
      );
    }
    if (timeAllocation.applicationsPercent >= 40 && timeAllocation.projectsPercent <= 15) {
      tradeOffs.push(
        'High application sprint sacrifices time needed to build deeper portfolio evidence.',
      );
    }
    if (timeAllocation.interviewPrepPercent >= 45 && timeAllocation.learningPercent <= 15) {
      tradeOffs.push(
        'Intense interview prep slows down acquisition of new technical frameworks or tools.',
      );
    }
    if (timeAllocation.learningPercent >= 45 && timeAllocation.applicationsPercent <= 10) {
      tradeOffs.push(
        'Deep learning focus delays sending applications until subsequent sprint cycles.',
      );
    }
    if (tradeOffs.length === 0) {
      tradeOffs.push(
        'Balanced distribution yields steady progress across all areas without acute sacrifice.',
      );
    }

    // ─── RISKS DETECTION ────────────────────────────────────────────────────
    if (constraints.utilizationPercentage > 125) {
      risks.push({
        riskType: 'WORKLOAD_OVERLOAD',
        severity: 'HIGH',
        description: `Plan demands ${constraints.totalWeeklyHoursRequired}h/wk, which is ${constraints.utilizationPercentage}% of your configured capacity.`,
        mitigation:
          'Reduce weekly application volume or scale back mock interview sessions to avoid burnout.',
      });
    }

    if (baseline.projects.length === 0 && !variables.projectStrategy) {
      risks.push({
        riskType: 'MISSING_PORTFOLIO_PROOF',
        severity: 'MEDIUM',
        description:
          'No portfolio projects recorded. Applications may lack verifiable engineering evidence.',
        mitigation:
          'Allocate at least 25% of sprint effort to building and publishing a flagship project.',
      });
    }

    if (
      variables.applicationStrategy?.additionalWeeklyApplications &&
      variables.applicationStrategy.additionalWeeklyApplications > 12
    ) {
      risks.push({
        riskType: 'APPLICATION_QUALITY_DEGRADATION',
        severity: 'MEDIUM',
        description:
          'Applying to more than 12 roles weekly can lead to generic cover letters and lower screening response.',
        mitigation: 'Focus on 5–8 highly matched positions with tailored resumes.',
      });
    }

    if (risks.length === 0) {
      risks.push({
        riskType: 'EXECUTION_CONSISTENCY',
        severity: 'LOW',
        description: 'Success requires maintaining regular daily cadence throughout the sprint.',
        mitigation: 'Review daily action items each morning in the Phase 45 Execution Dashboard.',
      });
    }

    // Compute composite overall impact score (0 to 100)
    const dimValues = Object.values(dimensions).map((d) => d.score);
    const overallImpactScore = Math.round(dimValues.reduce((a, b) => a + b, 0) / dimValues.length);

    return {
      dimensions,
      overallImpactScore,
      benefits,
      tradeOffs,
      risks,
      sensitivityFactors,
    };
  }
}
