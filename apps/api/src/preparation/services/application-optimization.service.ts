import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';

import { AIProvider, AI_PROVIDER_TOKEN } from '../../ai/providers/ai-provider.interface';
import { CareerEventsService } from '../../career-center/services/career-events.service';
import { KeywordNormalizerService } from '../../matching/services/keyword-normalizer.service';
import { EvidenceGraphService } from '../../portfolio/services/evidence-graph.service';
import { PrismaService } from '../../prisma/prisma.service';

import { ReadinessScoreService } from './readiness-score.service';

export interface ExtractedRequirement {
  name: string;
  type: 'SKILL' | 'EDUCATION' | 'EXPERIENCE' | 'OTHER';
  classification: 'REQUIRED' | 'PREFERRED' | 'OPTIONAL' | 'UNKNOWN';
  sourceText: string;
}

@Injectable()
export class ApplicationOptimizationService {
  private readonly logger = new Logger(ApplicationOptimizationService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(AI_PROVIDER_TOKEN) private readonly aiProvider: AIProvider,
    private readonly evidenceGraph: EvidenceGraphService,
    private readonly keywordNormalizer: KeywordNormalizerService,
    private readonly careerEvents: CareerEventsService,
    private readonly readinessScore: ReadinessScoreService,
  ) {}

  // ── 1. REQUIREMENT EXTRACTION & NORMALIZATION ────────────────────────────

  async analyzeOpportunity(jobId: string) {
    this.logger.log(`Analyzing opportunity requirements for job ${jobId}`);

    const job = await this.prisma.jobPosting.findUnique({
      where: { id: jobId },
      include: { company: true, intelligenceProfile: true },
    });

    if (!job) {
      throw new NotFoundException(`Job posting with ID ${jobId} not found`);
    }

    if (job.intelligenceProfile) {
      return this.prisma.opportunityIntelligenceProfile.findUnique({
        where: { id: job.intelligenceProfile.id },
        include: { requirements: true },
      });
    }

    // Call LLM for requirement extraction
    const prompt = `You are a career intelligence bot. Extract the structural requirements for the following role:
Role Title: ${job.title}
Company: ${job.company.name}
Description: ${job.description}
Requirements Text: ${job.requirements.join('\n')}
Responsibilities Text: ${job.responsibilities.join('\n')}

Output a JSON object following this schema strictly. Do not fabricate or hallucinate requirements that are not mentioned.
Schema:
{
  "requirements": [
    {
      "name": "Exact skill or requirement name (e.g. Python, SQL, Docker, Bachelor's in CS, 2 years experience)",
      "type": "SKILL" | "EDUCATION" | "EXPERIENCE" | "OTHER",
      "classification": "REQUIRED" | "PREFERRED" | "OPTIONAL" | "UNKNOWN",
      "sourceText": "The exact sentence in the job posting containing this requirement"
    }
  ]
}`;

    const jsonSchema = {
      type: 'object',
      properties: {
        requirements: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              type: { type: 'string', enum: ['SKILL', 'EDUCATION', 'EXPERIENCE', 'OTHER'] },
              classification: {
                type: 'string',
                enum: ['REQUIRED', 'PREFERRED', 'OPTIONAL', 'UNKNOWN'],
              },
              sourceText: { type: 'string' },
            },
            required: ['name', 'type', 'classification', 'sourceText'],
          },
        },
      },
      required: ['requirements'],
    };

    let aiResult;
    try {
      aiResult = await this.aiProvider.generateStructuredOutput<{
        requirements: ExtractedRequirement[];
      }>(prompt, jsonSchema, 'You are an expert technical recruiter analyzing job specifications.');
    } catch (err) {
      this.logger.error(
        'Failed to extract opportunity requirements using LLM, using fallback',
        err,
      );
      // Fallback: extract using keywords normalizer
      const extractedKeywords = this.keywordNormalizer.extractKeywordsFromText(
        `${job.title} ${job.description} ${job.requirements.join(' ')}`,
      );
      aiResult = {
        requirements: extractedKeywords.map((kw) => ({
          name: kw,
          type: 'SKILL' as const,
          classification: 'REQUIRED' as const,
          sourceText: 'Automatically matched via system taxonomy.',
        })),
      };
    }

    // Save profile and requirements
    const profile = await this.prisma.opportunityIntelligenceProfile.create({
      data: {
        jobId,
        roleTitle: job.title,
        company: job.company.name,
        employmentType: job.employmentType,
        location: job.location,
        workMode: job.workMode,
        description: job.description,
        requiredSkills: aiResult.requirements
          .filter((r) => r.type === 'SKILL' && r.classification === 'REQUIRED')
          .map((r) => this.keywordNormalizer.normalizeKeyword(r.name)),
        preferredSkills: aiResult.requirements
          .filter((r) => r.type === 'SKILL' && r.classification === 'PREFERRED')
          .map((r) => this.keywordNormalizer.normalizeKeyword(r.name)),
        technologies: aiResult.requirements
          .filter((r) => r.type === 'SKILL')
          .map((r) => this.keywordNormalizer.normalizeKeyword(r.name)),
        responsibilities: job.responsibilities,
        experienceLevel: job.experienceLevel,
        deadline: job.deadline,
        lastAnalyzedAt: new Date(),
      },
    });

    for (const req of aiResult.requirements) {
      const normalizedName =
        req.type === 'SKILL' ? this.keywordNormalizer.normalizeKeyword(req.name) : req.name;
      await this.prisma.opportunityRequirement.create({
        data: {
          profileId: profile.id,
          name: req.name,
          normalizedName,
          type: req.type,
          classification: req.classification,
          sourceText: req.sourceText,
        },
      });
    }

    return this.prisma.opportunityIntelligenceProfile.findUnique({
      where: { id: profile.id },
      include: { requirements: true },
    });
  }

  // ── 2. OPPORTUNITY ↔ USER ALIGNMENT & EVIDENCE-AWARE MATCHING ────────────

  async getOrCreateAlignment(userId: string, jobId: string) {
    this.logger.log(`Evaluating profile alignment for user ${userId} and job ${jobId}`);

    // Verify application exists (create SAVED application if missing)
    let app = await this.prisma.application.findUnique({
      where: { userId_jobId: { userId, jobId } },
    });
    if (!app) {
      const job = await this.prisma.jobPosting.findUnique({
        where: { id: jobId },
        include: { company: true },
      });
      if (!job) throw new NotFoundException('Opportunity not found');
      app = await this.prisma.application.create({
        data: {
          userId,
          jobId,
          status: 'SAVED',
          companyNameSnapshot: job.company.name,
          jobTitleSnapshot: job.title,
          locationSnapshot: job.location,
        },
      });
      // Trigger default checklist
      await this.initializeChecklist(app.id);
    }

    // Get opportunity intelligence profile
    let intelProfile = await this.prisma.opportunityIntelligenceProfile.findUnique({
      where: { jobId },
      include: { requirements: true },
    });
    if (!intelProfile) {
      const created = await this.analyzeOpportunity(jobId);
      if (!created) {
        throw new NotFoundException('Could not create opportunity profile');
      }
      intelProfile = created;
    }

    const requirements = intelProfile.requirements;

    // Fetch professional evidence graph
    const evGraph = await this.evidenceGraph.getEvidenceGraph(userId);

    // Compute evidence matches
    const evidenceMatches: any[] = [];
    const explanationItems: any[] = [];

    let matchedRequiredCount = 0;
    let totalRequiredCount = 0;
    let matchedPreferredCount = 0;
    let totalPreferredCount = 0;

    // Clear old evidence matches
    await this.prisma.applicationEvidenceMatch.deleteMany({
      where: { applicationId: app.id },
    });

    for (const req of requirements) {
      if (req.type === 'SKILL') {
        const isRequired = req.classification === 'REQUIRED';
        if (isRequired) totalRequiredCount++;
        else totalPreferredCount++;

        // Find match in evidence graph
        const normalizedName = req.normalizedName.toLowerCase();
        const node = evGraph.find((g) => g.skillName.toLowerCase() === normalizedName);

        let matchType:
          'STRONG_MATCH' | 'DEMONSTRATED_MATCH' | 'DECLARED_MATCH' | 'GROWING_MATCH' | 'MISSING' =
          'MISSING';
        let evidenceSource:
          | 'PROJECT'
          | 'EXPERIENCE'
          | 'LEARNING'
          | 'PRACTICED'
          | 'ASSESSED'
          | 'VALIDATED'
          | 'DECLARED'
          | 'NONE' = 'NONE';
        let explanation = `No evidence found for ${req.name}.`;
        const evidenceDetails: any[] = [];

        if (node) {
          const strength = node.strengthLevel;
          if (strength === 'VALIDATED' || strength === 'ASSESSED' || strength === 'EXPERIENCE') {
            matchType = 'STRONG_MATCH';
            evidenceSource = strength;
            if (isRequired) matchedRequiredCount++;
            else matchedPreferredCount++;
          } else if (strength === 'PROJECT') {
            matchType = 'DEMONSTRATED_MATCH';
            evidenceSource = 'PROJECT';
            if (isRequired) matchedRequiredCount++;
            else matchedPreferredCount++;
          } else if (strength === 'PRACTICED' || strength === 'LEARNING') {
            matchType = 'GROWING_MATCH';
            evidenceSource = strength;
          } else {
            matchType = 'DECLARED_MATCH';
            evidenceSource = 'DECLARED';
          }

          explanation = `Matched with skill '${node.skillName}' at strength ${strength}. ${node.explanation}`;
          node.nodes.forEach((n) => {
            evidenceDetails.push({
              title: n.title,
              evidenceType: n.evidenceType,
              date: n.date,
              description: n.description,
            });
          });
        }

        // Save evidence match
        await this.prisma.applicationEvidenceMatch.create({
          data: {
            applicationId: app.id,
            requirementId: req.id,
            matchType,
            evidenceSource: evidenceSource === 'NONE' ? 'NONE' : (evidenceSource as any),
            evidenceCount: evidenceDetails.length,
            evidenceDetails: evidenceDetails as any,
            explanation,
          },
        });

        evidenceMatches.push({
          requirementId: req.id,
          name: req.name,
          classification: req.classification,
          matchType,
          evidenceSource,
          explanation,
        });

        explanationItems.push({
          name: req.name,
          classification: req.classification,
          matchType,
          reason: explanation,
        });
      }
    }

    // Compute Alignment Scores
    const requiredSkillCoverage =
      totalRequiredCount > 0 ? (matchedRequiredCount / totalRequiredCount) * 100 : 100;
    const preferredSkillCoverage =
      totalPreferredCount > 0 ? (matchedPreferredCount / totalPreferredCount) * 100 : 100;

    // Fetch user experience and project details
    const projectsCount = await this.prisma.projectAnalysis.count({ where: { userId } });
    const experienceCount = await this.prisma.userSkill.count({
      where: { userId, lastEvaluatedAt: { not: null } },
    });

    // Calculate details
    const projectRelevance = projectsCount > 0 ? Math.min(100, projectsCount * 25) : 50;
    const experienceRelevance = experienceCount > 0 ? Math.min(100, experienceCount * 15) : 50;
    const portfolioRelevance = Math.round((projectRelevance + experienceRelevance) / 2);

    // Call readiness score calculator service
    const rawReadiness = await this.readinessScore.calculateReadinessScore(userId, jobId);

    const requiredWeight = 0.4;
    const preferredWeight = 0.2;
    const portfolioWeight = 0.2;
    const interviewWeight = 0.2;

    const overallAlignment = Math.round(
      requiredSkillCoverage * requiredWeight +
        preferredSkillCoverage * preferredWeight +
        portfolioRelevance * portfolioWeight +
        rawReadiness.overallReadiness * interviewWeight,
    );

    // Classification
    let readinessLevel = 'NEEDS_PREPARATION';
    let guidanceText = 'PREPARE BEFORE APPLYING';
    if (overallAlignment >= 80) {
      readinessLevel = 'READY_TO_APPLY';
      guidanceText = 'APPLY NOW';
    } else if (overallAlignment >= 65) {
      readinessLevel = 'NEEDS_SMALL_IMPROVEMENTS';
      guidanceText = 'APPLY AND IMPROVE PROFILE';
    }

    // Gaps and Quick Wins
    const gaps: string[] = [];
    const quickWins: any[] = [];

    const missingSkills = evidenceMatches.filter(
      (e) => e.matchType === 'MISSING' && e.classification === 'REQUIRED',
    );
    if (missingSkills.length > 0) {
      gaps.push(
        `Missing critical required skill(s): ${missingSkills.map((s) => s.name).join(', ')}`,
      );
      missingSkills.slice(0, 2).forEach((s) => {
        quickWins.push({
          type: 'ADD_SKILL_EVIDENCE',
          title: `Add evidence for ${s.name}`,
          description: `Add projects or pass exercises to demonstrate familiarity.`,
          effort: 'Medium',
          featureLink: `/learning`,
        });
      });
    }

    const declaredSkills = evidenceMatches.filter((e) => e.matchType === 'DECLARED_MATCH');
    if (declaredSkills.length > 0) {
      gaps.push(
        `Declared skill(s) lack supporting project or experience evidence: ${declaredSkills.map((s) => s.name).join(', ')}`,
      );
      declaredSkills.slice(0, 2).forEach((s) => {
        quickWins.push({
          type: 'HIGHLIGHT_PROJECT',
          title: `Link project validating ${s.name}`,
          description: `Update a project description to explicitly highlight your usage of ${s.name}.`,
          effort: 'Quick (2 min)',
          featureLink: `/portfolio-intelligence`,
        });
      });
    }

    // Default Quick Wins if none
    if (quickWins.length === 0) {
      quickWins.push({
        type: 'REVIEW_COMPANY',
        title: 'Review company context',
        description: 'Read verifying details about the hiring company.',
        effort: 'Quick (5 min)',
        featureLink: `/companies`,
      });
    }

    const alignment = await this.prisma.applicationAlignment.upsert({
      where: { applicationId: app.id },
      update: {
        overallAlignment,
        evidenceCoverage: requiredSkillCoverage,
        requiredSkillCoverage,
        preferredSkillCoverage,
        projectRelevance,
        experienceRelevance,
        portfolioRelevance,
        interviewReadiness: rawReadiness.overallReadiness,
        careerGoalAlignment: 85.0, // Static default
        explanationJson: { explanationItems, quickWins, gaps } as any,
        readinessLevel,
        guidanceText,
      },
      create: {
        applicationId: app.id,
        overallAlignment,
        evidenceCoverage: requiredSkillCoverage,
        requiredSkillCoverage,
        preferredSkillCoverage,
        projectRelevance,
        experienceRelevance,
        portfolioRelevance,
        interviewReadiness: rawReadiness.overallReadiness,
        careerGoalAlignment: 85.0,
        explanationJson: { explanationItems, quickWins, gaps } as any,
        readinessLevel,
        guidanceText,
      },
    });

    return {
      applicationId: app.id,
      alignment,
      evidenceMatches,
      gaps,
      quickWins,
    };
  }

  // ── 3. STRUCTURED ACTION PLAN & PROACTIVE EVENTS ────────────────────────

  async generatePreparationPlan(userId: string, jobId: string) {
    const alignmentResult = await this.getOrCreateAlignment(userId, jobId);
    const app = await this.prisma.application.findUnique({
      where: { id: alignmentResult.applicationId },
      include: { job: true },
    });

    if (!app) throw new NotFoundException('Application not found');

    const steps: any[] = [];

    // Step 1: High priority quick wins
    if (alignmentResult.quickWins.length > 0) {
      steps.push({
        title: alignmentResult.quickWins[0].title,
        priority: 'NOW',
        description: alignmentResult.quickWins[0].description,
        linkType: 'PORTFOLIO',
        linkTarget: alignmentResult.quickWins[0].featureLink,
        completed: false,
      });
    }

    // Step 2: Practice / Gaps
    const missing = alignmentResult.evidenceMatches.find((e) => e.matchType === 'MISSING');
    if (missing) {
      steps.push({
        title: `Prepare ${missing.name} fundamentals`,
        priority: 'NEXT',
        description: `Review key documentation and answer practice interview topics for ${missing.name}.`,
        linkType: 'LEARNING',
        linkTarget: `/learning`,
        completed: false,
      });
    }

    // Step 3: Default Checklist completions
    steps.push({
      title: 'Customize application resume version',
      priority: 'NEXT',
      description: 'Review resume tailoring suggestions and select the best version.',
      linkType: 'RESUME',
      linkTarget: `/applications/${app.id}/prepare?tab=resume`,
      completed: false,
    });

    steps.push({
      title: 'Review company positioning notes',
      priority: 'OPTIONAL',
      description: 'Prepare company context highlights to answer core motivation questions.',
      linkType: 'COMPANY',
      linkTarget: `/companies`,
      completed: false,
    });

    // Save/update ApplicationPreparationPlan
    const plan = await this.prisma.applicationPreparationPlan.upsert({
      where: { applicationId: app.id },
      update: { stepsJson: steps as any },
      create: { applicationId: app.id, stepsJson: steps as any },
    });

    // Sync to Phase 37 Action Engine (CareerAction)
    const deadline = app.job.deadline;
    const now = new Date();
    const daysLeft = deadline ? (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24) : 30;

    let priority = 'MEDIUM';
    if (daysLeft <= 3) priority = 'CRITICAL';
    else if (daysLeft <= 7) priority = 'HIGH';

    await this.prisma.careerAction
      .create({
        data: {
          userId,
          actionType: 'PREPARATION_PLAN',
          entityType: 'Application',
          entityId: app.id,
          priority,
          status: 'PENDING',
          expiresAt: deadline,
          explanation: `Complete your custom application preparation plan. Overall alignment score is ${alignmentResult.alignment.overallAlignment}%.`,
          draft: { steps } as any,
          relevanceScore: alignmentResult.alignment.overallAlignment,
          safetyClass: 'TYPE_A',
          isApproved: true,
        },
      })
      .catch(() => {
        // Ignore if duplicate creation constraint throws
      });

    // Trigger Phase 38 Event if deadline approaching
    if (daysLeft > 0 && daysLeft <= 5) {
      await this.careerEvents.publish({
        userId,
        eventType: 'DEADLINE_APPROACHING',
        source: 'Preparation Engine',
        entityType: 'Application',
        entityId: app.id,
        importance: 'HIGH',
        metadata: {
          jobTitle: app.jobTitleSnapshot,
          companyName: app.companyNameSnapshot,
          daysRemaining: Math.ceil(daysLeft),
        },
      });
    }

    return plan;
  }

  // ── 4. RESUME SELECTION & TAILORING DIFFS ───────────────────────────────

  async recommendResume(userId: string) {
    // Fetch user resume documents
    const doc = await this.prisma.resumeDocument.findFirst({
      where: { userId, isArchived: false },
      include: { versions: true },
    });

    if (!doc || doc.versions.length === 0) {
      return null;
    }

    // Simplistic ranking: return latest version or version that matches roles
    const sorted = doc.versions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return sorted[0];
  }

  async suggestResumeTailoring(userId: string, jobId: string) {
    const version = await this.recommendResume(userId);
    const job = await this.prisma.jobPosting.findUnique({
      where: { id: jobId },
      include: { company: true },
    });
    const app = await this.prisma.application.findUnique({
      where: { userId_jobId: { userId, jobId } },
    });

    if (!version || !job || !app) {
      throw new NotFoundException('Active resume version or application details not found.');
    }

    const content = version.contentJson as any;

    // AI optimization generator
    const prompt = `You are a professional resume optimization assistant. Suggest opportunity-specific tailoring edits for this resume targeting the following job:
Job Title: ${job.title}
Company: ${job.company.name}
Job Description: ${job.description}

Original Resume Content:
${JSON.stringify(content)}

Generate tailoring suggestions strictly keeping achievements factual without fabricating credentials. Reorder or suggest bullet adjustments. Output a side-by-side JSON format containing:
{
  "tailoredContent": {
    "summary": "Tailored summary",
    "skills": ["Python", "SQL", "Docker"],
    "experience": [
      {
        "role": "Original role name",
        "company": "Company",
        "description": "Adjusted experience description highlighting Docker and SQL."
      }
    ]
  },
  "explanations": [
    {
      "section": "summary",
      "originalText": "...",
      "suggestedText": "...",
      "reason": "Explicitly highlights ML and Python which are critical required skills for this role."
    }
  ]
}`;

    const jsonSchema = {
      type: 'object',
      properties: {
        tailoredContent: {
          type: 'object',
          properties: {
            summary: { type: 'string' },
            skills: { type: 'array', items: { type: 'string' } },
            experience: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  role: { type: 'string' },
                  company: { type: 'string' },
                  description: { type: 'string' },
                },
                required: ['role', 'company', 'description'],
              },
            },
          },
          required: ['summary', 'skills', 'experience'],
        },
        explanations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              section: { type: 'string' },
              originalText: { type: 'string' },
              suggestedText: { type: 'string' },
              reason: { type: 'string' },
            },
            required: ['section', 'originalText', 'suggestedText', 'reason'],
          },
        },
      },
      required: ['tailoredContent', 'explanations'],
    };

    let aiResult;
    try {
      aiResult = await this.aiProvider.generateStructuredOutput<any>(
        prompt,
        jsonSchema,
        'You optimize resumes with extreme grounding integrity.',
      );
    } catch (err) {
      this.logger.error('Failed to generate tailored resume version draft using AI provider', err);
      // Fallback draft (suggest original structure only)
      aiResult = {
        tailoredContent: {
          summary: content.summary || '',
          skills: content.skills || [],
          experience: (content.experience || []).map((e: any) => ({
            role: e.title || e.role || '',
            company: e.company || '',
            description: e.description || '',
          })),
        },
        explanations: [
          {
            section: 'Resume structure',
            originalText: 'Standard template',
            suggestedText: 'Highlight alignment',
            reason: 'Review skills section ordering manually.',
          },
        ],
      };
    }

    const draft = await this.prisma.resumeTailoringDraft.create({
      data: {
        applicationId: app.id,
        resumeVersionId: version.id,
        tailoredContentJson: aiResult.tailoredContent,
        originalContentJson: content,
        explanationJson: aiResult.explanations,
        status: 'DRAFT',
      },
    });

    return draft;
  }

  async approveResumeTailoring(draftId: string, userId: string) {
    const draft = await this.prisma.resumeTailoringDraft.findUnique({
      where: { id: draftId },
      include: { application: true },
    });

    if (!draft || draft.application.userId !== userId) {
      throw new NotFoundException('Tailoring draft not found.');
    }

    // Create tailored resume version in DB
    const resumeDoc = await this.prisma.resumeDocument.findFirst({ where: { userId } });
    if (!resumeDoc) {
      throw new NotFoundException('Resume document not found for user.');
    }

    const version = await this.prisma.resumeVersion.create({
      data: {
        resumeDocumentId: resumeDoc.id,
        versionName: `Tailored for ${draft.application.jobTitleSnapshot || 'Target Role'}`,
        contentJson: draft.tailoredContentJson as any,
        qualityScore: 90,
      },
    });

    // Update application to use this tailored version
    await this.prisma.application.update({
      where: { id: draft.applicationId },
      data: { resumeVersionId: version.id },
    });

    // Update draft status
    await this.prisma.resumeTailoringDraft.update({
      where: { id: draftId },
      data: { status: 'APPROVED' },
    });

    // Mark checklist item completed
    await this.completeChecklistItem(draft.applicationId, 'resume_selected', {
      versionId: version.id,
    });

    return version;
  }

  // ── 5. PORTFOLIO SELECTION & PROJECT HIGHLIGHTING ───────────────────────

  async recommendProjects(userId: string, jobId: string) {
    const app = await this.prisma.application.findUnique({
      where: { userId_jobId: { userId, jobId } },
    });
    if (!app) throw new NotFoundException('Application not found');

    const profile = await this.prisma.opportunityIntelligenceProfile.findUnique({
      where: { jobId },
    });
    if (!profile) throw new NotFoundException('Opportunity profile not found');

    // Fetch user project analyses (from Phase 39)
    const userAnalyses = await this.prisma.projectAnalysis.findMany({
      where: { userId },
    });

    const suggestions: any[] = [];
    const requirements = profile.requiredSkills;

    userAnalyses.forEach((proj, idx) => {
      // Find overlap of skills
      const projSkills = (proj.skills as string[]) || [];
      const overlap = projSkills.filter((s) => requirements.includes(s));

      let score = 50; // Baseline relevance
      if (overlap.length > 0) score += Math.min(50, overlap.length * 15);

      suggestions.push({
        projectId: proj.projectId,
        projectTitle: proj.projectId.replace(/-/g, ' ').toUpperCase(),
        rank: idx + 1,
        relevanceScore: score,
        whyHighlighted: `Demonstrates active technical usage of key role technologies: ${overlap.join(', ') || 'General engineering basics'}.`,
        tailoredContribution: `Leveraged ${projSkills.slice(0, 3).join(', ')} to design, build, and deploy custom application interfaces.`,
      });
    });

    // Sort by relevance score
    const sorted = suggestions.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Save selections
    for (let i = 0; i < sorted.length; i++) {
      const s = sorted[i];
      await this.prisma.opportunityProjectSelection.upsert({
        where: {
          applicationId_projectId: {
            applicationId: app.id,
            projectId: s.projectId,
          },
        },
        update: {
          rank: i + 1,
          relevanceScore: s.relevanceScore,
          whyHighlighted: s.whyHighlighted,
        },
        create: {
          applicationId: app.id,
          projectId: s.projectId,
          projectTitle: s.projectTitle,
          rank: i + 1,
          relevanceScore: s.relevanceScore,
          whyHighlighted: s.whyHighlighted,
          tailoredContribution: s.tailoredContribution,
        },
      });
    }

    return this.prisma.opportunityProjectSelection.findMany({
      where: { applicationId: app.id },
      orderBy: { rank: 'asc' },
    });
  }

  // ── 6. APPLICATION CHECKLISTS ──────────────────────────────────────────

  private async initializeChecklist(applicationId: string) {
    const items = [
      {
        key: 'resume_selected',
        title: 'Select resume version',
        description: 'Review suggested resume tailoring adjustments.',
      },
      {
        key: 'project_highlighted',
        title: 'Highlight portfolio project',
        description: 'Rank and highlight relevant repository evidence.',
      },
      {
        key: 'portfolio_reviewed',
        title: 'Review online portfolio',
        description: 'Double check brand consistency metrics.',
      },
      {
        key: 'cover_letter_prepared',
        title: 'Draft cover letter',
        description: 'Use Application Copilot to write customized cover letter.',
      },
      {
        key: 'interview_topics_ready',
        title: 'Identify interview topics',
        description: 'Review high-yield preparation subjects.',
      },
    ];

    for (const item of items) {
      await this.prisma.applicationChecklist.upsert({
        where: { applicationId_itemKey: { applicationId, itemKey: item.key } },
        update: {},
        create: {
          applicationId,
          itemKey: item.key,
          title: item.title,
          description: item.description,
          isCompleted: false,
        },
      });
    }
  }

  async getChecklist(applicationId: string, userId: string) {
    const app = await this.prisma.application.findUnique({ where: { id: applicationId } });
    if (!app || app.userId !== userId) throw new NotFoundException('Application not found');

    return this.prisma.applicationChecklist.findMany({
      where: { applicationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async toggleChecklistItem(
    applicationId: string,
    itemKey: string,
    isCompleted: boolean,
    userId: string,
  ) {
    const app = await this.prisma.application.findUnique({ where: { id: applicationId } });
    if (!app || app.userId !== userId) throw new NotFoundException('Application not found');

    const checklist = await this.prisma.applicationChecklist.update({
      where: { applicationId_itemKey: { applicationId, itemKey } },
      data: {
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
      },
    });

    // Re-evaluate alignment upon completion
    await this.getOrCreateAlignment(userId, app.jobId);

    return checklist;
  }

  async completeChecklistItem(applicationId: string, itemKey: string, evidence: any) {
    return this.prisma.applicationChecklist
      .update({
        where: { applicationId_itemKey: { applicationId, itemKey } },
        data: {
          isCompleted: true,
          completedAt: new Date(),
          evidenceJson: evidence,
        },
      })
      .catch(() => {
        // Ignore checklist update errors if item doesn't exist
      });
  }

  // ── 7. APPLICATION COPILOT & ANSWER GROUNDING ──────────────────────────

  async answerApplicationQuestion(userId: string, applicationId: string, question: string) {
    const app = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: { job: { include: { company: true } } },
    });

    if (!app || app.userId !== userId) {
      throw new NotFoundException('Application not found');
    }

    const evGraph = await this.evidenceGraph.getEvidenceGraph(userId);
    const projects = await this.prisma.projectAnalysis.findMany({ where: { userId } });

    const prompt = `You are a customized application assistant. Generate a grounded response to the following application question:
Question: "${question}"
Hiring Company: ${app.companyNameSnapshot}
Role Title: ${app.jobTitleSnapshot}

Guidelines:
1. Ground your answer strictly in the user's verified evidence. Do not hallucinate metrics or project contributions.
2. If evidence is missing, use cautious wording.
3. Be professional and brief.

User Evidence Context:
- Skills Evidence Graph: ${JSON.stringify(evGraph.map((g) => ({ name: g.skillName, strength: g.strengthLevel, confidence: g.confidenceScore })))}
- Projects Details: ${JSON.stringify(projects.map((p) => ({ title: p.projectId, skills: p.skills, explanation: p.explanation })))}

Answer:`;

    const result = await this.aiProvider.generateText(
      prompt,
      'You generate verified answers strictly grounded in candidate portfolio details.',
    );
    return {
      question,
      answer: result.text,
      groundedEvidence: evGraph.slice(0, 3).map((g) => g.skillName),
    };
  }

  // ── 8. POST-APPLICATION CONTEXT SNAPSHOTS ──────────────────────────────

  async saveContextSnapshot(userId: string, applicationId: string) {
    const app = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: { job: { include: { company: true } }, resumeVersion: true },
    });

    if (!app || app.userId !== userId) {
      throw new NotFoundException('Application not found');
    }

    const alignment = await this.prisma.applicationAlignment.findUnique({
      where: { applicationId },
    });

    const projects = await this.prisma.opportunityProjectSelection.findMany({
      where: { applicationId },
    });

    const snapshot = {
      jobId: app.jobId,
      jobTitle: app.jobTitleSnapshot,
      companyName: app.companyNameSnapshot,
      resumeVersionId: app.resumeVersionId,
      resumeVersionName: app.resumeVersion?.versionName || 'Original Resume',
      alignmentScore: alignment?.overallAlignment || 0,
      highlightedProjects: projects.map((p) => ({
        projectId: p.projectId,
        title: p.projectTitle,
        rank: p.rank,
      })),
      timestamp: new Date(),
    };

    return this.prisma.applicationContextSnapshot.upsert({
      where: { applicationId },
      update: { snapshotJson: snapshot as any },
      create: { applicationId, snapshotJson: snapshot as any },
    });
  }
}
