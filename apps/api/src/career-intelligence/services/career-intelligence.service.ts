import { Injectable, Inject, Logger } from '@nestjs/common';
import { TrajectoryPhase, CareerMomentumState, PathAlignmentCategory } from '@prisma/client';

import { AIProvider, AI_PROVIDER_TOKEN } from '../../ai/providers/ai-provider.interface';
import { ReadinessCalculatorService } from '../../career-center/services/readiness-calculator.service';
import { EvidenceGraphService } from '../../portfolio/services/evidence-graph.service';
import { PrismaService } from '../../prisma/prisma.service';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface CareerState {
  userId: string;
  targetRole: string | null;
  skills: Array<{ name: string; category: string; proficiency: string }>;
  projects: Array<{ title: string; description: string | null; skills: string[] }>;
  portfolioMaturity: 'NONE' | 'STARTER' | 'DEVELOPING' | 'STRONG';
  applicationCount: number;
  interviewCount: number;
  mockInterviewAvgScore: number | null;
  completedLearningModules: number;
  networkingContactCount: number;
  evidenceNodeCount: number;
  careerGoals: string[];
  dataLimitations: string[];
}

export interface CareerPathResult {
  pathTitle: string;
  alignmentCategory: PathAlignmentCategory;
  alignmentScore: number;
  isPrimary: boolean;
  alignmentReasons: string[];
  strengths: string[];
  gaps: string[];
  tradeoffs: string[];
  transferableSkills: string[];
  recommendedActions: string[];
  dataLimitations: string[];
}

export interface TrajectoryResult {
  phase: TrajectoryPhase;
  momentum: CareerMomentumState;
  primaryPathTitle: string | null;
  alternativePathTitles: string[];
  exploratoryPathTitles: string[];
  potentialBottlenecks: string[];
  signals: string[];
  explanation: string;
  dataLimitations: string[];
}

export interface ScenarioInput {
  title: string;
  actionDescription: string;
  targetPathTitle?: string;
  estimatedEffortWeeks?: number;
}

export interface ScenarioResult {
  title: string;
  actionDescription: string;
  targetPathTitle: string | null;
  potentialEvidenceImprovements: string[];
  potentialSkillDevelopment: string[];
  potentialAlignmentDelta: string;
  remainingGaps: string[];
  portfolioValueChange: string;
  confidence: string;
  dataLimitations: string[];
  aiNarrative: string | null;
}

export interface ReadinessDimension {
  name: string;
  state: 'STRONG' | 'DEVELOPING' | 'NEEDS_ATTENTION' | 'INSUFFICIENT_DATA';
  evidence: string[];
  recommendation: string;
}

export interface BottleneckResult {
  label: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  explanation: string;
  suggestedAction: string;
}

export interface GoalConflict {
  type: 'OVERLOAD' | 'CONTRADICTION' | 'SYNERGY';
  description: string;
  recommendation: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class CareerIntelligenceService {
  private readonly logger = new Logger(CareerIntelligenceService.name);

  // Curated career path definitions — no fabricated market data
  private readonly CAREER_PATH_DEFINITIONS: Record<
    string,
    { skillSignals: string[]; projectSignals: string[]; description: string }
  > = {
    'AI Engineer': {
      skillSignals: [
        'python',
        'machine learning',
        'deep learning',
        'tensorflow',
        'pytorch',
        'nlp',
        'ai',
      ],
      projectSignals: ['ai', 'ml', 'recommendation', 'neural', 'model', 'classifier', 'prediction'],
      description: 'Builds and deploys AI/ML systems and models in production.',
    },
    'Data Engineer': {
      skillSignals: [
        'python',
        'sql',
        'spark',
        'kafka',
        'airflow',
        'data pipeline',
        'etl',
        'database',
      ],
      projectSignals: ['data', 'pipeline', 'warehouse', 'analytics', 'etl', 'ingestion'],
      description: 'Designs and maintains data infrastructure and pipelines.',
    },
    'Machine Learning Engineer': {
      skillSignals: [
        'python',
        'machine learning',
        'mlops',
        'docker',
        'kubernetes',
        'tensorflow',
        'scikit',
      ],
      projectSignals: ['ml', 'model', 'training', 'inference', 'deployment', 'mlops'],
      description: 'Productionizes ML models and builds ML infrastructure.',
    },
    'Backend Engineer': {
      skillSignals: [
        'java',
        'python',
        'node',
        'spring',
        'rest api',
        'sql',
        'postgresql',
        'microservices',
      ],
      projectSignals: ['api', 'backend', 'server', 'database', 'booking', 'management', 'system'],
      description: 'Builds scalable server-side systems and APIs.',
    },
    'Full-Stack Engineer': {
      skillSignals: ['javascript', 'react', 'node', 'html', 'css', 'typescript', 'rest api'],
      projectSignals: ['web', 'frontend', 'fullstack', 'dashboard', 'app', 'ui', 'portal'],
      description: 'Develops both client-side and server-side application layers.',
    },
    'Data Scientist': {
      skillSignals: [
        'python',
        'statistics',
        'machine learning',
        'r',
        'pandas',
        'numpy',
        'visualization',
      ],
      projectSignals: [
        'analysis',
        'statistics',
        'visualization',
        'prediction',
        'dataset',
        'research',
      ],
      description: 'Extracts insights from data using statistical and ML methods.',
    },
    'DevOps Engineer': {
      skillSignals: [
        'docker',
        'kubernetes',
        'ci/cd',
        'linux',
        'terraform',
        'aws',
        'azure',
        'gcp',
        'devops',
      ],
      projectSignals: [
        'deployment',
        'infrastructure',
        'automation',
        'pipeline',
        'cloud',
        'monitoring',
      ],
      description: 'Manages deployment infrastructure and continuous delivery pipelines.',
    },
    'Mobile Engineer': {
      skillSignals: ['react native', 'flutter', 'swift', 'kotlin', 'android', 'ios', 'mobile'],
      projectSignals: ['mobile', 'app', 'android', 'ios', 'react native', 'flutter'],
      description: 'Builds native and cross-platform mobile applications.',
    },
  };

  constructor(
    private readonly prisma: PrismaService,
    @Inject(AI_PROVIDER_TOKEN) private readonly aiProvider: AIProvider,
    private readonly evidenceGraph: EvidenceGraphService,
    private readonly readinessCalculator: ReadinessCalculatorService,
  ) {}

  // ─── 1. CAREER STATE BUILDER ───────────────────────────────────────────────

  async buildCareerState(userId: string): Promise<CareerState> {
    this.logger.log(`Building Career State for user ${userId}`);

    const [
      user,
      userSkills,
      portfolio,
      applications,
      mockInterviews,
      learningEnrollments,
      contacts,
      careerGoals,
    ] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true },
      }),
      this.prisma.userSkill.findMany({
        where: { userId },
        include: { skill: true },
      }),
      this.prisma.portfolio.findUnique({
        where: { userId },
      }),
      this.prisma.application.findMany({ where: { userId } }),
      this.prisma.mockInterview.findMany({
        where: { userId, status: 'COMPLETED' },
      }),
      this.prisma.learningEnrollment.findMany({
        where: { userId, status: 'COMPLETED' },
      }),
      this.prisma.professionalContact.findMany({ where: { userId } }),
      this.prisma.careerGoal.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: 3,
      }),
    ]);

    if (!user) {
      throw new Error('User not found');
    }

    // Build project list from portfolio contentJson
    const projects: CareerState['projects'] = [];
    if (portfolio?.contentJson) {
      const content = portfolio.contentJson as any;
      if (Array.isArray(content?.projects)) {
        for (const p of content.projects) {
          projects.push({
            title: p.title || 'Untitled Project',
            description: p.description || null,
            skills: Array.isArray(p.technologies) ? p.technologies : [],
          });
        }
      }
    }

    // Portfolio maturity
    let portfolioMaturity: CareerState['portfolioMaturity'] = 'NONE';
    if (portfolio) {
      if (projects.length >= 3) portfolioMaturity = 'STRONG';
      else if (projects.length >= 2) portfolioMaturity = 'DEVELOPING';
      else if (projects.length >= 1) portfolioMaturity = 'STARTER';
    }

    // Mock interview average score
    let mockInterviewAvgScore: number | null = null;
    if (mockInterviews.length > 0) {
      const totalScore = mockInterviews.reduce((sum, m) => sum + (m.score ?? 0), 0);
      mockInterviewAvgScore = totalScore / mockInterviews.length;
    }

    // Evidence node count via Phase 39
    let evidenceNodeCount = 0;
    try {
      const graph = await this.evidenceGraph.getEvidenceGraph(userId);
      evidenceNodeCount = graph.length;
    } catch {
      // Non-fatal — evidence graph may be empty
    }

    // Data limitations
    const dataLimitations: string[] = [];
    if (userSkills.length === 0) dataLimitations.push('No skills recorded.');
    if (projects.length === 0) dataLimitations.push('No portfolio projects found.');
    if (applications.length === 0) dataLimitations.push('No application history.');
    if (mockInterviews.length === 0) dataLimitations.push('No mock interview data.');
    if (careerGoals.length === 0) dataLimitations.push('No career goals set.');

    return {
      userId,
      targetRole: careerGoals[0]?.targetRole ?? null,
      skills: userSkills.map((us) => ({
        name: us.skill.name,
        category: us.skill.category,
        proficiency: us.proficiency,
      })),
      projects,
      portfolioMaturity,
      applicationCount: applications.length,
      interviewCount: mockInterviews.length,
      mockInterviewAvgScore,
      completedLearningModules: learningEnrollments.length,
      networkingContactCount: contacts.length,
      evidenceNodeCount,
      careerGoals: careerGoals.map((g) => g.targetRole),
      dataLimitations,
    };
  }

  // ─── 2. CAREER TRAJECTORY ─────────────────────────────────────────────────

  async computeTrajectory(userId: string): Promise<TrajectoryResult> {
    this.logger.log(`Computing Career Trajectory for user ${userId}`);
    const state = await this.buildCareerState(userId);
    const paths = await this.generateCareerPaths(userId);

    const primaryPath = paths.find((p) => p.isPrimary) ?? paths[0] ?? null;
    const altPaths = paths
      .filter((p) => !p.isPrimary && p.alignmentCategory !== 'EXPLORATORY')
      .slice(0, 2);
    const exploratoryPaths = paths.filter((p) => p.alignmentCategory === 'EXPLORATORY').slice(0, 2);

    // Determine trajectory phase
    let phase: TrajectoryPhase = TrajectoryPhase.EXPLORING;
    const signals: string[] = [];

    if (state.skills.length === 0 && state.projects.length === 0) {
      phase = TrajectoryPhase.EXPLORING;
      signals.push('No skill or project evidence recorded yet.');
    } else if (state.careerGoals.length > 0 && primaryPath) {
      if (primaryPath.alignmentScore >= 70) {
        phase = TrajectoryPhase.SPECIALIZING;
        signals.push(`Strong alignment toward ${primaryPath.pathTitle} detected.`);
      } else if (primaryPath.alignmentScore >= 50) {
        phase = TrajectoryPhase.FOCUSING;
        signals.push(`Emerging focus toward ${primaryPath.pathTitle}.`);
      } else {
        phase = TrajectoryPhase.BUILDING;
        signals.push('Active skill and project building across multiple paths.');
      }
    } else if (state.skills.length > 0 || state.projects.length > 0) {
      phase = TrajectoryPhase.BUILDING;
      signals.push('Skills and/or projects recorded — building career foundation.');
    }

    // Career goal changes signal transitioning
    if (state.careerGoals.length >= 2 && state.careerGoals[0] !== state.careerGoals[1]) {
      phase = TrajectoryPhase.TRANSITIONING;
      signals.push('Recent career goal change detected — possible path transition.');
    }

    // Momentum
    let momentum: CareerMomentumState = CareerMomentumState.INSUFFICIENT_DATA;
    if (
      state.applicationCount > 0 ||
      state.completedLearningModules > 0 ||
      state.evidenceNodeCount > 0
    ) {
      if (state.applicationCount >= 5 && state.evidenceNodeCount >= 3) {
        momentum = CareerMomentumState.ACCELERATING;
      } else if (state.applicationCount >= 2 || state.evidenceNodeCount >= 2) {
        momentum = CareerMomentumState.STEADY;
      } else {
        momentum = CareerMomentumState.SLOWING;
      }
    }

    // Bottlenecks
    const bottlenecks = await this.detectBottleneckLabels(state, primaryPath);

    const explanation = this.buildTrajectoryExplanation(phase, momentum, primaryPath, signals);

    // Persist trajectory
    await this.prisma.careerTrajectory.upsert({
      where: { userId } as any,
      create: {
        userId,
        phase,
        momentum,
        primaryPathTitle: primaryPath?.pathTitle ?? null,
        alternativePathTitles: altPaths.map((p) => p.pathTitle),
        exploratoryPathTitles: exploratoryPaths.map((p) => p.pathTitle),
        potentialBottlenecks: bottlenecks,
        signals,
        explanation,
        dataLimitations: state.dataLimitations,
      },
      update: {
        phase,
        momentum,
        primaryPathTitle: primaryPath?.pathTitle ?? null,
        alternativePathTitles: altPaths.map((p) => p.pathTitle),
        exploratoryPathTitles: exploratoryPaths.map((p) => p.pathTitle),
        potentialBottlenecks: bottlenecks,
        signals,
        explanation,
        dataLimitations: state.dataLimitations,
        updatedAt: new Date(),
      },
    });

    return {
      phase,
      momentum,
      primaryPathTitle: primaryPath?.pathTitle ?? null,
      alternativePathTitles: altPaths.map((p) => p.pathTitle),
      exploratoryPathTitles: exploratoryPaths.map((p) => p.pathTitle),
      potentialBottlenecks: bottlenecks,
      signals,
      explanation,
      dataLimitations: state.dataLimitations,
    };
  }

  // ─── 3. CAREER PATH GENERATION ────────────────────────────────────────────

  async generateCareerPaths(userId: string): Promise<CareerPathResult[]> {
    this.logger.log(`Generating Career Paths for user ${userId}`);
    const state = await this.buildCareerState(userId);

    const userSkillNames = state.skills.map((s) => s.name.toLowerCase());
    const projectTokens = state.projects
      .flatMap((p) => [
        ...(p.title?.toLowerCase().split(/\s+/) ?? []),
        ...(p.description?.toLowerCase().split(/\s+/) ?? []),
        ...p.skills.map((s) => s.toLowerCase()),
      ])
      .filter(Boolean);

    const results: CareerPathResult[] = [];

    for (const [pathTitle, def] of Object.entries(this.CAREER_PATH_DEFINITIONS)) {
      // Skill match
      const skillMatches = def.skillSignals.filter((sig) =>
        userSkillNames.some((us) => us.includes(sig) || sig.includes(us)),
      );
      const skillScore = (skillMatches.length / def.skillSignals.length) * 50;

      // Project match
      const projectMatches = def.projectSignals.filter((sig) =>
        projectTokens.some((pt) => pt.includes(sig) || sig.includes(pt)),
      );
      const projectScore = Math.min((projectMatches.length / def.projectSignals.length) * 35, 35);

      // Career goal alignment
      const goalScore = state.careerGoals.some((g) => {
        const firstWord = g.toLowerCase().split(' ')[0] ?? '';
        return (
          g.toLowerCase().includes(pathTitle.toLowerCase()) ||
          pathTitle.toLowerCase().includes(firstWord)
        );
      })
        ? 15
        : 0;

      const total = Math.round(skillScore + projectScore + goalScore);

      // Derive alignment category
      let alignmentCategory: PathAlignmentCategory;
      if (total >= 65) alignmentCategory = PathAlignmentCategory.STRONG_ALIGNMENT;
      else if (total >= 45) alignmentCategory = PathAlignmentCategory.GOOD_ALIGNMENT;
      else if (total >= 25) alignmentCategory = PathAlignmentCategory.EMERGING_ALIGNMENT;
      else if (total >= 10) alignmentCategory = PathAlignmentCategory.EXPLORATORY;
      else alignmentCategory = PathAlignmentCategory.INSUFFICIENT_DATA;

      // Build reasons
      const alignmentReasons: string[] = [];
      if (skillMatches.length > 0) {
        alignmentReasons.push(`Skill evidence: ${skillMatches.slice(0, 3).join(', ')}`);
      }
      if (projectMatches.length > 0) {
        alignmentReasons.push(`Project signals: ${projectMatches.slice(0, 3).join(', ')}`);
      }
      if (goalScore > 0) {
        alignmentReasons.push('Matches your stated career goal.');
      }

      // Strengths
      const strengths = skillMatches.slice(0, 4).map((s) => `${s} skill evidence present`);

      // Gaps — skills missing from path definition
      const gaps = def.skillSignals
        .filter((sig) => !userSkillNames.some((us) => us.includes(sig) || sig.includes(us)))
        .slice(0, 4)
        .map((s) => `${s} evidence not yet recorded`);

      // Tradeoffs
      const tradeoffs = this.buildTradeoffs(pathTitle, gaps);

      // Transferable skills
      const transferableSkills = skillMatches.slice(0, 4);

      // Recommended actions
      const recommendedActions = this.buildRecommendedActions(pathTitle, gaps, state);

      // Data limitations
      const dataLimitations: string[] = [];
      if (state.dataLimitations.length > 0) {
        dataLimitations.push('Analysis is limited by incomplete profile data.');
      }
      if (total < 25) {
        dataLimitations.push('Insufficient evidence to make confident alignment assessment.');
      }

      results.push({
        pathTitle,
        alignmentCategory,
        alignmentScore: total,
        isPrimary: false, // set after sorting
        alignmentReasons:
          alignmentReasons.length > 0 ? alignmentReasons : ['No strong signals detected yet.'],
        strengths,
        gaps,
        tradeoffs,
        transferableSkills,
        recommendedActions,
        dataLimitations,
      });
    }

    // Sort by score descending
    results.sort((a, b) => b.alignmentScore - a.alignmentScore);

    // Mark primary only if score is above 25
    if (results.length > 0) {
      const top = results[0];
      if (top && top.alignmentScore >= 25) {
        top.isPrimary = true;
      }
    }

    // Persist analyses
    await this.persistPathAnalyses(userId, results);

    return results;
  }

  // ─── 4. SCENARIO PLANNER ──────────────────────────────────────────────────

  async runScenario(userId: string, input: ScenarioInput): Promise<ScenarioResult> {
    this.logger.log(`Running Scenario for user ${userId}: ${input.title}`);
    const state = await this.buildCareerState(userId);
    const actionLower = input.actionDescription.toLowerCase();

    const potentialEvidenceImprovements: string[] = [];
    const potentialSkillDevelopment: string[] = [];
    let potentialAlignmentDelta = 'No significant alignment change estimated.';
    const remainingGaps: string[] = [];
    let portfolioValueChange = 'No portfolio change estimated.';

    // ── Deterministic analysis by action keywords ──
    if (actionLower.includes('deploy') || actionLower.includes('cloud')) {
      potentialEvidenceImprovements.push('Deployment experience evidence added to portfolio.');
      potentialSkillDevelopment.push(
        'Cloud deployment skills (potential: Docker, CI/CD, cloud platform).',
      );
      portfolioValueChange = 'Portfolio gains a production deployment evidence node.';
      if (input.targetPathTitle?.includes('AI')) {
        potentialAlignmentDelta =
          'AI Engineer alignment may improve — production ML deployment is a common gap.';
      }
      if (input.targetPathTitle?.includes('DevOps') || input.targetPathTitle?.includes('Backend')) {
        potentialAlignmentDelta = 'Backend/DevOps alignment may improve significantly.';
      }
      remainingGaps.push('Infrastructure monitoring evidence still absent.');
      remainingGaps.push('Scalability and load testing evidence not yet recorded.');
    }

    if (actionLower.includes('project') || actionLower.includes('build')) {
      potentialEvidenceImprovements.push(
        'New project evidence node added to Professional Evidence Graph.',
      );
      potentialEvidenceImprovements.push('Portfolio maturity may improve from current state.');
      potentialSkillDevelopment.push('Practical implementation skills for selected technology.');
      portfolioValueChange = 'Portfolio gains one additional project evidence node.';
      remainingGaps.push('Deployment and production evidence may still be missing.');
    }

    if (
      actionLower.includes('certification') ||
      actionLower.includes('course') ||
      actionLower.includes('learn')
    ) {
      potentialSkillDevelopment.push('Structured learning evidence added.');
      potentialEvidenceImprovements.push('Learning module completion evidence strengthened.');
      portfolioValueChange = 'Learning progress section gains a verified completion record.';
      remainingGaps.push('Practical project application of the learned skill still needed.');
    }

    if (
      actionLower.includes('apply') ||
      actionLower.includes('application') ||
      actionLower.includes('internship')
    ) {
      potentialEvidenceImprovements.push('Application funnel activity evidence increases.');
      potentialAlignmentDelta = 'Active application evidence suggests career direction focus.';
      remainingGaps.push('Interview preparation may still be needed.');
    }

    if (
      actionLower.includes('network') ||
      actionLower.includes('connect') ||
      actionLower.includes('referral')
    ) {
      potentialEvidenceImprovements.push(
        'Professional network coverage for target companies improves.',
      );
      potentialSkillDevelopment.push('Professional communication and outreach experience.');
      remainingGaps.push('Referral depends on relationship depth — cannot be guaranteed.');
    }

    // Fallback if no keywords matched
    if (potentialEvidenceImprovements.length === 0) {
      potentialEvidenceImprovements.push(
        'Evidence improvements depend on specifics of the action taken.',
      );
    }

    // Data limitations
    const dataLimitations: string[] = [...state.dataLimitations];
    dataLimitations.push(
      'Scenario results are estimates only — actual outcomes depend on execution quality and external factors.',
    );
    dataLimitations.push('This scenario does NOT guarantee job placement or career outcomes.');

    // Confidence
    let confidence = 'LOW — based on limited profile data';
    const totalSignals = state.skills.length + state.projects.length + state.applicationCount;
    if (totalSignals >= 10) confidence = 'MODERATE — based on recorded profile evidence';
    if (totalSignals >= 20) confidence = 'MODERATE-HIGH — based on substantial profile evidence';

    // AI Narrative (optional — falls back gracefully)
    let aiNarrative: string | null = null;
    try {
      aiNarrative = await this.generateScenarioNarrative(state, input, {
        potentialEvidenceImprovements,
        potentialSkillDevelopment,
        potentialAlignmentDelta,
        remainingGaps,
        portfolioValueChange,
        confidence,
        dataLimitations,
        targetPathTitle: input.targetPathTitle ?? null,
      });
    } catch {
      this.logger.warn('AI narrative unavailable — returning deterministic result only.');
    }

    const result: ScenarioResult = {
      title: input.title,
      actionDescription: input.actionDescription,
      targetPathTitle: input.targetPathTitle ?? null,
      potentialEvidenceImprovements,
      potentialSkillDevelopment,
      potentialAlignmentDelta,
      remainingGaps,
      portfolioValueChange,
      confidence,
      dataLimitations,
      aiNarrative,
    };

    // Persist scenario
    await this.prisma.careerScenario.create({
      data: {
        userId,
        title: input.title,
        actionDescription: input.actionDescription,
        targetPathTitle: input.targetPathTitle ?? null,
        inputJson: input as any,
        resultJson: result as any,
        aiNarrative,
        confidence,
        dataLimitations,
      },
    });

    // Emit CareerEvent for Phase 38
    await this.prisma.careerEvent.create({
      data: {
        userId,
        eventType: 'CareerScenarioCreated',
        source: 'CAREER_INTELLIGENCE',
        entityType: 'CareerScenario',
        entityId: null,
        importance: 'INFO',
        metadata: { title: input.title, targetPath: input.targetPathTitle },
      },
    });

    return result;
  }

  // ─── 5. CAREER READINESS DIMENSIONS ───────────────────────────────────────

  async getCareerReadinessDimensions(userId: string): Promise<ReadinessDimension[]> {
    const state = await this.buildCareerState(userId);
    const baseReadiness = await this.readinessCalculator.calculateReadiness(userId);

    const map = (base: string): ReadinessDimension['state'] => {
      if (base === 'READY') return 'STRONG';
      if (base === 'DEVELOPING') return 'DEVELOPING';
      if (base === 'NEEDS ATTENTION') return 'NEEDS_ATTENTION';
      return 'INSUFFICIENT_DATA';
    };

    return [
      {
        name: 'Technical Foundation',
        state: map(baseReadiness.skills),
        evidence: state.skills.slice(0, 5).map((s) => `${s.name} (${s.proficiency})`),
        recommendation:
          baseReadiness.skills === 'READY'
            ? 'Strong technical foundation. Consider deepening specialization.'
            : 'Add more skill evidence — learning completions and projects strengthen this dimension.',
      },
      {
        name: 'Practical Projects',
        state:
          state.projects.length >= 3
            ? 'STRONG'
            : state.projects.length >= 1
              ? 'DEVELOPING'
              : 'NEEDS_ATTENTION',
        evidence: state.projects.slice(0, 3).map((p) => p.title),
        recommendation:
          state.projects.length >= 3
            ? 'Strong project portfolio. Consider deploying projects publicly.'
            : 'Build 2–3 focused projects aligned to your target role.',
      },
      {
        name: 'Portfolio Evidence',
        state:
          state.portfolioMaturity === 'STRONG'
            ? 'STRONG'
            : state.portfolioMaturity === 'DEVELOPING'
              ? 'DEVELOPING'
              : state.portfolioMaturity === 'STARTER'
                ? 'NEEDS_ATTENTION'
                : 'INSUFFICIENT_DATA',
        evidence:
          state.evidenceNodeCount > 0
            ? [`${state.evidenceNodeCount} evidence nodes in Professional Evidence Graph`]
            : ['No evidence graph nodes yet'],
        recommendation:
          state.portfolioMaturity === 'STRONG'
            ? 'Portfolio is strong. Ensure each project has a clear description and deployed link.'
            : 'Add portfolio projects with descriptions, technologies, and deployment links.',
      },
      {
        name: 'Application Activity',
        state: map(baseReadiness.applications),
        evidence:
          state.applicationCount > 0
            ? [`${state.applicationCount} applications tracked`]
            : ['No applications tracked'],
        recommendation:
          baseReadiness.applications === 'READY'
            ? 'Active application pipeline. Monitor conversion rates in Career Analytics.'
            : 'Begin applying to opportunities aligned with your career goals.',
      },
      {
        name: 'Interview Readiness',
        state: map(baseReadiness.interviews),
        evidence:
          state.interviewCount > 0
            ? [
                `${state.interviewCount} mock interviews completed`,
                state.mockInterviewAvgScore !== null
                  ? `Average score: ${state.mockInterviewAvgScore.toFixed(1)}%`
                  : '',
              ].filter(Boolean)
            : ['No mock interview data'],
        recommendation:
          baseReadiness.interviews === 'READY'
            ? 'Strong interview preparation. Review behavioral question frameworks.'
            : 'Complete mock interviews in the Interview Intelligence module.',
      },
      {
        name: 'Networking Readiness',
        state:
          state.networkingContactCount >= 5
            ? 'STRONG'
            : state.networkingContactCount >= 2
              ? 'DEVELOPING'
              : state.networkingContactCount >= 1
                ? 'NEEDS_ATTENTION'
                : 'INSUFFICIENT_DATA',
        evidence:
          state.networkingContactCount > 0
            ? [`${state.networkingContactCount} professional contacts tracked`]
            : ['No professional contacts tracked'],
        recommendation:
          state.networkingContactCount >= 5
            ? 'Good network coverage. Focus on deepening key relationships toward referral readiness.'
            : 'Add professional contacts from target companies in the Networking module.',
      },
      {
        name: 'Career Clarity',
        state: state.careerGoals.length > 0 ? 'STRONG' : 'NEEDS_ATTENTION',
        evidence:
          state.careerGoals.length > 0
            ? state.careerGoals.slice(0, 2).map((g) => `Career Goal: ${g}`)
            : ['No career goals set'],
        recommendation:
          state.careerGoals.length > 0
            ? 'Career goal is set. Regularly review alignment with your activity patterns.'
            : 'Set a career goal in the Career Strategy module to guide all recommendations.',
      },
      {
        name: 'Execution Consistency',
        state: map(baseReadiness.learning),
        evidence:
          state.completedLearningModules > 0
            ? [`${state.completedLearningModules} learning modules completed`]
            : ['No learning module completions'],
        recommendation:
          baseReadiness.learning === 'READY'
            ? 'Strong learning execution. Maintain consistency as goals evolve.'
            : 'Complete at least one active learning module to demonstrate consistent execution.',
      },
    ];
  }

  // ─── 6. BOTTLENECK DETECTION ──────────────────────────────────────────────

  async detectBottlenecks(userId: string): Promise<BottleneckResult[]> {
    const state = await this.buildCareerState(userId);
    const paths = await this.generateCareerPaths(userId);
    const primaryPath = paths.find((p) => p.isPrimary);
    const bottlenecks: BottleneckResult[] = [];

    if (state.dataLimitations.length >= 4) {
      bottlenecks.push({
        label: 'Insufficient profile data',
        severity: 'HIGH',
        explanation:
          'Based on your current recorded profile, there is not enough data to identify specific gaps.',
        suggestedAction: 'Complete your profile: add skills, projects, and a career goal.',
      });
      return bottlenecks;
    }

    // Deployment gap
    const hasDeploymentSkill = state.skills.some((s) =>
      ['docker', 'kubernetes', 'ci/cd', 'aws', 'azure', 'gcp', 'heroku', 'vercel'].some((kw) =>
        s.name.toLowerCase().includes(kw),
      ),
    );
    const hasAiProjects = state.projects.some((p) =>
      ['ai', 'ml', 'model', 'recommendation'].some(
        (kw) =>
          p.title.toLowerCase().includes(kw) || (p.description?.toLowerCase() ?? '').includes(kw),
      ),
    );
    if (hasAiProjects && !hasDeploymentSkill) {
      bottlenecks.push({
        label: 'Production deployment evidence missing',
        severity: 'HIGH',
        explanation:
          'Based on your current recorded profile, you have AI/ML projects but no deployment skill evidence. This is a potential gap for AI Engineer and ML Engineer roles.',
        suggestedAction:
          'Deploy an existing project using Docker, cloud platforms, or CI/CD pipelines.',
      });
    }

    // Portfolio gap
    if (state.portfolioMaturity === 'NONE' || state.portfolioMaturity === 'STARTER') {
      bottlenecks.push({
        label: 'Limited portfolio evidence',
        severity: 'MEDIUM',
        explanation:
          'Based on your current recorded profile, your portfolio has limited project evidence.',
        suggestedAction:
          'Add at least 2–3 projects with clear descriptions, technology stacks, and links.',
      });
    }

    // Interview preparation gap
    if (state.applicationCount >= 3 && state.interviewCount === 0) {
      bottlenecks.push({
        label: 'No mock interview preparation recorded',
        severity: 'MEDIUM',
        explanation:
          'Based on your current recorded profile, you are applying to opportunities but have no completed mock interview evidence.',
        suggestedAction:
          'Complete mock interviews in the Interview Intelligence module before next applications.',
      });
    }

    // Networking gap for target company
    if (state.networkingContactCount === 0 && state.applicationCount >= 5) {
      bottlenecks.push({
        label: 'No professional network coverage',
        severity: 'LOW',
        explanation:
          'Based on your current recorded profile, you have no professional contacts at target companies.',
        suggestedAction: 'Add relevant contacts from target companies in the Networking module.',
      });
    }

    // Primary path specific gaps
    if (primaryPath && primaryPath.gaps.length > 0) {
      for (const gap of primaryPath.gaps.slice(0, 2)) {
        bottlenecks.push({
          label: `Potential gap: ${gap}`,
          severity: 'LOW',
          explanation: `Based on your current recorded profile, this skill appears in ${primaryPath.pathTitle} requirements but is not yet evidenced.`,
          suggestedAction: `Consider learning or practicing ${gap.replace(' evidence not yet recorded', '')}.`,
        });
      }
    }

    return bottlenecks;
  }

  // ─── 7. GOAL CONFLICT DETECTION ───────────────────────────────────────────

  async detectGoalConflicts(userId: string): Promise<GoalConflict[]> {
    const [goals, userGoals, learningGoals] = await Promise.all([
      this.prisma.careerGoal.findMany({ where: { userId } }),
      this.prisma.userGoal.findMany({ where: { userId, status: 'ACTIVE' } }),
      this.prisma.learningGoal.findMany({ where: { userId, status: 'ACTIVE' } }),
    ]);

    const conflicts: GoalConflict[] = [];
    const totalActive = userGoals.length + learningGoals.length;

    // Overload detection
    if (totalActive >= 5) {
      conflicts.push({
        type: 'OVERLOAD',
        description: `Your current plan includes ${totalActive} active goals. This may be difficult to execute consistently.`,
        recommendation:
          'Consider pausing lower-priority goals and focusing on 2–3 key objectives. Use the Priority Engine to rank them.',
      });
    }

    // Multiple career goals — possible contradiction
    if (goals.length >= 2) {
      const roles = goals.map((g) => g.targetRole);
      const hasAI = roles.some(
        (r) => r.toLowerCase().includes('ai') || r.toLowerCase().includes('ml'),
      );
      const hasBackend = roles.some((r) => r.toLowerCase().includes('backend'));
      const hasData = roles.some((r) => r.toLowerCase().includes('data'));

      if (hasAI && hasBackend && hasData) {
        conflicts.push({
          type: 'CONTRADICTION',
          description:
            'You have career goals across AI/ML, Backend, and Data — these may pull skill development in different directions.',
          recommendation:
            'Consider selecting a primary path. Alternative paths can still be pursued as secondary priorities.',
        });
      }

      if (hasAI && hasData) {
        conflicts.push({
          type: 'SYNERGY',
          description:
            'AI Engineer and Data Engineering goals have significant skill overlap (Python, data pipelines, ML).',
          recommendation:
            'These paths are complementary. Building ML skills while learning data engineering is efficient.',
        });
      }
    }

    return conflicts;
  }

  // ─── 8. CAREER EVOLUTION (SNAPSHOT HISTORY) ───────────────────────────────

  async getCareerEvolution(userId: string) {
    const snapshots = await this.prisma.careerProfileSnapshot.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    if (snapshots.length === 0) {
      return {
        snapshots: [],
        message:
          'No historical snapshots yet. Career evolution tracking starts after the first snapshot is taken.',
      };
    }

    return {
      snapshots: snapshots.map((s) => ({
        id: s.id,
        trajectoryPhase: s.trajectoryPhase,
        momentum: s.momentum,
        summary: s.summary,
        keySignals: s.keySignals,
        createdAt: s.createdAt,
      })),
    };
  }

  // ─── 9. PATH COMPARISON ───────────────────────────────────────────────────

  async compareCareerPaths(userId: string, pathTitleA: string, pathTitleB: string) {
    const paths = await this.generateCareerPaths(userId);
    const pathA = paths.find((p) => p.pathTitle.toLowerCase() === pathTitleA.toLowerCase());
    const pathB = paths.find((p) => p.pathTitle.toLowerCase() === pathTitleB.toLowerCase());

    if (!pathA || !pathB) {
      return {
        error: 'One or both paths could not be found or assessed for your profile.',
        availablePaths: paths.map((p) => p.pathTitle),
      };
    }

    // Shared strengths (transferable between both)
    const sharedStrengths = pathA.transferableSkills.filter((s) =>
      pathB.transferableSkills.includes(s),
    );

    return {
      pathA: {
        title: pathA.pathTitle,
        alignmentCategory: pathA.alignmentCategory,
        strengths: pathA.strengths,
        gaps: pathA.gaps,
        tradeoffs: pathA.tradeoffs,
        transferableSkills: pathA.transferableSkills,
        recommendedActions: pathA.recommendedActions,
        dataLimitations: pathA.dataLimitations,
      },
      pathB: {
        title: pathB.pathTitle,
        alignmentCategory: pathB.alignmentCategory,
        strengths: pathB.strengths,
        gaps: pathB.gaps,
        tradeoffs: pathB.tradeoffs,
        transferableSkills: pathB.transferableSkills,
        recommendedActions: pathB.recommendedActions,
        dataLimitations: pathB.dataLimitations,
      },
      sharedStrengths,
      disclaimer:
        'This comparison is based on your current recorded profile. It does not predict career success or suitability.',
    };
  }

  // ─── 10. CAREER OVERVIEW ──────────────────────────────────────────────────

  async getCareerOverview(userId: string) {
    const [state, trajectory, paths, readiness, bottlenecks, conflicts] = await Promise.all([
      this.buildCareerState(userId),
      this.computeTrajectory(userId),
      this.generateCareerPaths(userId),
      this.getCareerReadinessDimensions(userId),
      this.detectBottlenecks(userId),
      this.detectGoalConflicts(userId),
    ]);

    const primaryPath = paths.find((p) => p.isPrimary) ?? null;
    const altPaths = paths
      .filter(
        (p) => !p.isPrimary && p.alignmentCategory !== PathAlignmentCategory.INSUFFICIENT_DATA,
      )
      .slice(0, 3);

    return {
      careerState: state,
      trajectory,
      primaryPath,
      alternativePaths: altPaths,
      readinessDimensions: readiness,
      potentialBottlenecks: bottlenecks.slice(0, 3),
      goalConflicts: conflicts,
      disclaimer:
        'Career intelligence is decision support, not a guarantee. All insights are based on your current recorded profile data.',
    };
  }

  // ─── PRIVATE HELPERS ──────────────────────────────────────────────────────

  private async detectBottleneckLabels(
    state: CareerState,
    primaryPath: CareerPathResult | null | undefined,
  ): Promise<string[]> {
    const labels: string[] = [];
    const hasDeployment = state.skills.some((s) =>
      ['docker', 'kubernetes', 'aws', 'azure', 'gcp', 'heroku', 'vercel', 'ci/cd'].some((kw) =>
        s.name.toLowerCase().includes(kw),
      ),
    );
    const hasAiProjects = state.projects.some((p) =>
      ['ai', 'ml', 'model'].some(
        (kw) =>
          p.title.toLowerCase().includes(kw) || (p.description?.toLowerCase() ?? '').includes(kw),
      ),
    );
    if (hasAiProjects && !hasDeployment) labels.push('Production deployment evidence missing');
    if (state.portfolioMaturity === 'NONE') labels.push('No portfolio evidence');
    if (state.applicationCount >= 3 && state.interviewCount === 0)
      labels.push('No mock interview preparation');
    if (primaryPath && primaryPath.gaps.length > 0) {
      const firstGap = primaryPath.gaps[0];
      if (firstGap) labels.push(firstGap);
    }
    return labels;
  }

  private buildTrajectoryExplanation(
    phase: TrajectoryPhase,
    momentum: CareerMomentumState,
    primaryPath: CareerPathResult | null | undefined,
    _signals: string[],
  ): string {
    const phaseText: Record<TrajectoryPhase, string> = {
      EXPLORING: 'Based on your current recorded profile, your career direction is still emerging.',
      BUILDING:
        'Based on your current recorded profile, you are actively building skills and projects.',
      FOCUSING: `Based on your current recorded profile, a focus toward ${primaryPath?.pathTitle ?? 'a path'} is emerging.`,
      SPECIALIZING: `Based on your current recorded profile, you appear to be specializing in ${primaryPath?.pathTitle ?? 'your chosen path'}.`,
      TRANSITIONING:
        'Based on your current recorded profile, a career path transition signal has been detected.',
    };
    const momentumText: Record<CareerMomentumState, string> = {
      ACCELERATING: 'Your career activity is accelerating.',
      STEADY: 'Your career activity is steady.',
      SLOWING: 'Your career activity appears to be slowing — consider reviewing your action plan.',
      REFOCUSING: 'A recent goal or strategy change suggests you are refocusing.',
      INSUFFICIENT_DATA: 'More activity is needed to determine career momentum.',
    };
    return `${phaseText[phase]} ${momentumText[momentum]}`;
  }

  private buildTradeoffs(pathTitle: string, gaps: string[]): string[] {
    const tradeoffs: string[] = [];
    if (gaps.length > 0) {
      tradeoffs.push(
        `Requires building: ${gaps
          .slice(0, 2)
          .map((g) => g.replace(' evidence not yet recorded', ''))
          .join(', ')}.`,
      );
    }
    const pathSpecific: Record<string, string> = {
      'AI Engineer': 'Requires strong production deployment and MLOps evidence.',
      'Data Engineer': 'Requires data pipeline and infrastructure specialization.',
      'Machine Learning Engineer': 'Requires MLOps and model productionization evidence.',
      'Backend Engineer': 'Requires deeper API design and systems programming evidence.',
      'Full-Stack Engineer': 'Requires both frontend and backend project evidence.',
      'Data Scientist': 'Requires strong statistics and data analysis project evidence.',
      'DevOps Engineer': 'Requires strong infrastructure and automation project evidence.',
      'Mobile Engineer': 'Requires native or cross-platform mobile project evidence.',
    };
    const pathSpecificEntry = pathSpecific[pathTitle];
    if (pathSpecificEntry) tradeoffs.push(pathSpecificEntry);
    return tradeoffs;
  }

  private buildRecommendedActions(pathTitle: string, gaps: string[], state: CareerState): string[] {
    const actions: string[] = [];
    if (gaps.length > 0) {
      const topGap = (gaps[0] ?? '').replace(' evidence not yet recorded', '');
      if (topGap) actions.push(`Learn or practice: ${topGap}`);
    }
    if (state.portfolioMaturity === 'NONE' || state.portfolioMaturity === 'STARTER') {
      actions.push('Build a focused project for this path and add it to your portfolio.');
    }
    if (state.applicationCount === 0) {
      actions.push(
        'Search for opportunities aligned with this path in the Opportunity Discovery module.',
      );
    }
    if (state.networkingContactCount === 0) {
      actions.push(`Connect with ${pathTitle} professionals in the Networking module.`);
    }
    return actions.slice(0, 3);
  }

  private async persistPathAnalyses(userId: string, paths: CareerPathResult[]): Promise<void> {
    // Delete stale analyses and reinsert
    await this.prisma.careerPathAnalysis.deleteMany({ where: { userId } });
    await this.prisma.careerPathAnalysis.createMany({
      data: paths.map((p) => ({
        userId,
        pathTitle: p.pathTitle,
        alignmentCategory: p.alignmentCategory,
        alignmentScore: p.alignmentScore,
        isPrimary: p.isPrimary,
        alignmentReasons: p.alignmentReasons,
        strengths: p.strengths,
        gaps: p.gaps,
        tradeoffs: p.tradeoffs,
        transferableSkills: p.transferableSkills,
        recommendedActions: p.recommendedActions,
        dataLimitations: p.dataLimitations,
      })),
    });
  }

  private async generateScenarioNarrative(
    state: CareerState,
    input: ScenarioInput,
    result: Omit<ScenarioResult, 'title' | 'actionDescription' | 'aiNarrative'>,
  ): Promise<string> {
    const prompt = `
You are a career intelligence assistant providing honest, grounded career decision support.

IMPORTANT RULES:
- Do NOT guarantee any career outcomes.
- Do NOT claim the user WILL get a job.
- Do NOT invent skills, achievements, or market data.
- Use language like "may improve", "could strengthen", "based on your current profile".
- Keep the response under 150 words.

USER CURRENT PROFILE (validated data only):
- Skills: ${
      state.skills
        .slice(0, 5)
        .map((s) => s.name)
        .join(', ') || 'None recorded'
    }
- Projects: ${
      state.projects
        .slice(0, 3)
        .map((p) => p.title)
        .join(', ') || 'None'
    }
- Career Goal: ${state.targetRole ?? 'Not set'}
- Applications: ${state.applicationCount}

SCENARIO: ${input.title}
ACTION: ${input.actionDescription}
TARGET PATH: ${input.targetPathTitle ?? 'Not specified'}

DETERMINISTIC RESULT:
- Potential evidence improvements: ${result.potentialEvidenceImprovements.join('; ')}
- Potential skill development: ${result.potentialSkillDevelopment.join('; ')}
- Alignment delta: ${result.potentialAlignmentDelta}
- Remaining gaps: ${result.remainingGaps.join('; ')}

Write a brief, honest, evidence-grounded narrative explaining this scenario's potential impact.
Do NOT add new facts beyond what is provided above.
`;
    const textResult = await this.aiProvider.generateText(prompt);
    return textResult.text;
  }
}
