import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import {
  BaselineCareerSnapshot,
  CareerPathComparisonItem,
  ConfidenceLevel,
  ImpactAssessment,
  OpportunityForecastItem,
  OpportunityReadinessTrend,
  SimulationVariables,
} from '../interfaces/simulation.interfaces';

@Injectable()
export class OpportunityForecastingService {
  private readonly logger = new Logger(OpportunityForecastingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Evaluates user's tracked opportunities and forecasts readiness trends under simulated changes.
   * Does NOT output fabricated certainty or guarantee selection.
   */
  async forecastOpportunities(
    userId: string,
    baseline: BaselineCareerSnapshot,
    variables: SimulationVariables,
    impact: ImpactAssessment,
  ): Promise<OpportunityForecastItem[]> {
    this.logger.log(`Forecasting opportunity readiness trends for user ${userId}`);

    // Fetch user's active applications / saved jobs
    const applications = await this.prisma.application.findMany({
      where: { userId },
      take: 5,
      orderBy: { createdAt: 'desc' },
    });

    const confidence: ConfidenceLevel =
      baseline.dataCompletenessScore >= 70
        ? 'HIGH'
        : baseline.dataCompletenessScore >= 40
          ? 'MEDIUM'
          : 'LIMITED';

    // If user has tracked applications, forecast based on them
    if (applications.length > 0) {
      return applications.map((app: any) => {
        const currentMatch = 65; // baseline estimate
        let boost = 0;

        const keyPositiveFactors: string[] = [];
        const remainingGaps: string[] = [];

        if (variables.projectStrategy?.deployToPublic) {
          boost += 12;
          keyPositiveFactors.push(
            'Deployed project provides direct verification of technical implementation skills.',
          );
        }

        if (variables.skillInvestment) {
          boost += 10;
          keyPositiveFactors.push(
            `Investment in ${variables.skillInvestment.skillName} closes key requirements.`,
          );
        }

        if (variables.interviewPrep) {
          boost += 8;
          keyPositiveFactors.push(
            `Prep focus in ${variables.interviewPrep.focusArea} increases technical screen readiness.`,
          );
        }

        if (boost === 0) {
          remainingGaps.push(
            'No targeted project or skill additions to differentiate from general applicant pool.',
          );
        }

        const forecastedMatch = Math.min(95, currentMatch + boost);
        const readinessTrend: OpportunityReadinessTrend =
          forecastedMatch >= currentMatch + 8
            ? 'STRONGER'
            : forecastedMatch >= currentMatch
              ? 'STABLE'
              : 'NEEDS_IMPROVEMENT';

        return {
          companyName: app.companyName || app.company?.name || 'Target Company',
          jobTitle: app.jobTitle || baseline.targetRole || 'Software Engineering Intern',
          currentMatchScore: currentMatch,
          forecastedMatchScore: forecastedMatch,
          readinessTrend,
          keyPositiveFactors:
            keyPositiveFactors.length > 0
              ? keyPositiveFactors
              : ['Maintains active baseline pipeline presence.'],
          remainingGaps:
            remainingGaps.length > 0
              ? remainingGaps
              : ['Continued behavioral and technical mock interview polish recommended.'],
          confidence,
        };
      });
    }

    // Default forecast items when no applications exist yet
    const target = baseline.targetRole || 'Software Engineering Intern';
    return [
      {
        companyName: 'Tier 1 Tech & High-Growth Startups',
        jobTitle: target,
        currentMatchScore: 55,
        forecastedMatchScore: Math.min(92, 55 + (impact.dimensions.PORTFOLIO_STRENGTH.delta || 15)),
        readinessTrend: impact.dimensions.PORTFOLIO_STRENGTH.delta >= 10 ? 'STRONGER' : 'STABLE',
        keyPositiveFactors: [
          'Portfolio expansion increases resume screening pass rate.',
          'Demonstrated end-to-end deployment capability reduces onboarding risk.',
        ],
        remainingGaps: ['Direct referral contacts not yet established for priority companies.'],
        confidence,
      },
      {
        companyName: 'Mid-Market & Specialized Labs',
        jobTitle: `${target} (Domain Focus)`,
        currentMatchScore: 60,
        forecastedMatchScore: Math.min(95, 60 + (impact.dimensions.SKILL_DEVELOPMENT.delta || 12)),
        readinessTrend: 'STRONGER',
        keyPositiveFactors: [
          'Targeted skill building directly addresses specialized technical stacks.',
        ],
        remainingGaps: [
          'Complete live project demonstration required to validate advanced concepts.',
        ],
        confidence,
      },
    ];
  }

  /**
   * Compares the current career trajectory against adjacent career paths.
   */
  compareCareerPaths(
    baseline: BaselineCareerSnapshot,
    impact: ImpactAssessment,
  ): CareerPathComparisonItem[] {
    const userSkills = baseline.skills.map((s) => s.name.toLowerCase());

    const paths = [
      {
        pathTitle: 'AI & Machine Learning Engineer',
        coreSkills: [
          'python',
          'pytorch',
          'tensorflow',
          'machine learning',
          'docker',
          'sql',
          'llm',
          'nlp',
        ],
        estimatedWeeks: 6,
        tradeOffs: [
          'Requires dedicated focus on statistical modeling and GPU/pipeline infrastructure.',
        ],
      },
      {
        pathTitle: 'Full-Stack Software Engineer',
        coreSkills: ['typescript', 'react', 'nodejs', 'postgresql', 'docker', 'rest api', 'nestjs'],
        estimatedWeeks: 4,
        tradeOffs: [
          'Broader competition pool; requires strong full-stack project portfolio and system design.',
        ],
      },
      {
        pathTitle: 'Cloud & DevOps Engineer',
        coreSkills: ['docker', 'kubernetes', 'aws', 'ci/cd', 'linux', 'terraform', 'monitoring'],
        estimatedWeeks: 8,
        tradeOffs: ['Steep initial infrastructure learning curve; less focus on product UI/UX.'],
      },
    ];

    return paths.map((path) => {
      const matched = path.coreSkills.filter((cs) => userSkills.some((us) => us.includes(cs)));
      const gaps = path.coreSkills.filter((cs) => !userSkills.some((us) => us.includes(cs)));
      const baseAlignment = Math.round((matched.length / path.coreSkills.length) * 100);
      const simulatedAlignment = Math.min(
        95,
        baseAlignment + Math.round(impact.dimensions.SKILL_DEVELOPMENT.delta * 0.8),
      );

      return {
        pathTitle: path.pathTitle,
        currentAlignmentScore: Math.max(25, baseAlignment),
        simulatedAlignmentScore: Math.max(35, simulatedAlignment),
        skillGapsToClose: gaps.slice(0, 3).map((g) => g.toUpperCase()),
        transferableSkills: matched.slice(0, 4).map((m) => m.toUpperCase()),
        estimatedWeeksToReadiness: path.estimatedWeeks,
        tradeOffs: path.tradeOffs,
      };
    });
  }
}
