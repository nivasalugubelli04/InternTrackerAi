import { Injectable, Inject, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { EntitlementService, BILLING_FEATURES } from '../../billing/services/entitlement.service';
import { sanitizeHtml } from '../../common/utils/sanitize.util';
import type { AppConfig } from '../../config/configuration';
import { PrismaService } from '../../prisma/prisma.service';
import { PromptManager } from '../prompts/prompt-manager';
import {
  resumeAnalysisPrompt,
  jobSummaryPrompt,
  matchExplanationPrompt,
  skillGapPrompt,
  coverLetterPrompt,
  referralPrompt,
  interviewPrompt,
  comparisonPrompt,
  roadmapPrompt,
  chatPrompt,
  resumeParsingPrompt,
  resumeOptimizationPrompt,
  portfolioOptimizationPrompt,
} from '../prompts/templates';
import { AIProvider, AI_PROVIDER_TOKEN } from '../providers/ai-provider.interface';

import { AiCacheService } from './ai-cache.service';
import { AiRateLimiterService } from './ai-rate-limiter.service';
import { CostTrackerService } from './cost-tracker.service';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<AppConfig, true>,
    @Inject(AI_PROVIDER_TOKEN) private readonly aiProvider: AIProvider,
    private readonly promptManager: PromptManager,
    private readonly cacheService: AiCacheService,
    private readonly costTracker: CostTrackerService,
    private readonly rateLimiter: AiRateLimiterService,
    private readonly entitlementService: EntitlementService,
  ) {
    // Register templates
    this.promptManager.register(resumeAnalysisPrompt);
    this.promptManager.register(jobSummaryPrompt);
    this.promptManager.register(matchExplanationPrompt);
    this.promptManager.register(skillGapPrompt);
    this.promptManager.register(coverLetterPrompt);
    this.promptManager.register(referralPrompt);
    this.promptManager.register(interviewPrompt);
    this.promptManager.register(comparisonPrompt);
    this.promptManager.register(roadmapPrompt);
    this.promptManager.register(chatPrompt);
    this.promptManager.register(resumeParsingPrompt);
    this.promptManager.register(resumeOptimizationPrompt);
    this.promptManager.register(portfolioOptimizationPrompt);
  }

  private get aiConfig() {
    return this.configService.get('ai', { infer: true });
  }

  /**
   * Helper to verify if AI operations are globally enabled.
   */
  private checkAiEnabled(): void {
    if (!this.aiConfig.enabled) {
      throw new HttpException('AI features are currently disabled', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  /**
   * Feature 1: Resume Analysis
   */
  async analyzeResume(userId: string, resumeText: string): Promise<any> {
    this.checkAiEnabled();
    if (!this.aiConfig.features.resumeAnalysisEnabled) {
      throw new HttpException(
        'Resume analysis feature is disabled',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    await this.rateLimiter.checkLimit(userId, 'resume');
    await this.entitlementService.enforceUsage(userId, BILLING_FEATURES.RESUME_ANALYSIS);

    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    const prefs = await this.prisma.careerPreference.findUnique({ where: { userId } });

    const payload = {
      resumeText,
      profile: profile ? { degree: profile.degree, college: profile.college } : {},
      prefs: prefs ? { preferredRoles: prefs.preferredRoles } : {},
    };

    const hash = this.cacheService.generateInputHash(payload);
    const cached = await this.cacheService.getAnalysis(userId, null, 'RESUME_ANALYSIS', hash);
    if (cached) {
      return cached;
    }

    const { system, user } = this.promptManager.compile('resume', {
      resumeText,
      profileInfo: JSON.stringify(payload.profile),
      preferencesInfo: JSON.stringify(payload.prefs),
    });

    const startTime = Date.now();
    try {
      const template = this.promptManager.get('resume');
      const result = await this.aiProvider.generateStructuredOutput<any>(
        user,
        template.expectedSchema,
        system,
      );

      const duration = Date.now() - startTime;
      const cost = this.costTracker.recordMetrics(
        result.model,
        'ai-feature',
        result.usage.inputTokens,
        result.usage.outputTokens,
        duration,
      );

      await this.cacheService.saveAnalysis(
        userId,
        null,
        'RESUME_ANALYSIS',
        hash,
        result,
        this.aiConfig.provider,
        result.model,
      );
      await this.rateLimiter.increment(userId, 'resume');

      this.logger.log(
        {
          action: 'resume-analysis',
          userId,
          duration,
          model: result.model,
          tokens: result.usage.totalTokens,
          cost,
        },
        'AI resume analysis completed',
      );

      // Exclude token metrics from user response
      const { usage: _usage, model: _model, ...cleanResult } = result;
      return cleanResult;
    } catch (err) {
      this.logger.error({ err, userId }, 'Resume analysis failed');
      throw err;
    }
  }

  /**
   * Feature 2: Job Description Summary
   */
  async summarizeJob(userId: string, jobId: string): Promise<any> {
    this.checkAiEnabled();
    const job = await this.prisma.jobPosting.findUnique({ where: { id: jobId } });
    if (!job) {
      throw new HttpException('Job posting not found', HttpStatus.NOT_FOUND);
    }

    const payload = { jobDescription: job.description };
    const hash = this.cacheService.generateInputHash(payload);
    const cached = await this.cacheService.getAnalysis(userId, jobId, 'JOB_SUMMARY', hash);
    if (cached) {
      return cached;
    }

    const { system, user } = this.promptManager.compile('job-summary', {
      jobDescription: job.description ?? 'No description provided',
    });

    const startTime = Date.now();
    try {
      const template = this.promptManager.get('job-summary');
      const result = await this.aiProvider.generateStructuredOutput<any>(
        user,
        template.expectedSchema,
        system,
      );

      const duration = Date.now() - startTime;
      await this.cacheService.saveAnalysis(
        userId,
        jobId,
        'JOB_SUMMARY',
        hash,
        result,
        this.aiConfig.provider,
        result.model,
      );

      this.logger.log(
        {
          action: 'job-summary',
          userId,
          jobId,
          duration,
          tokens: result.usage.totalTokens,
        },
        'AI job summary completed',
      );

      const { usage: _usage, model: _model, ...cleanResult } = result;
      return cleanResult;
    } catch (err) {
      // Fallback behavior: return structured details from database
      this.logger.warn({ err, jobId }, 'Job summary failed — returning database fallback');
      return {
        roleSummary: job.title,
        responsibilities: job.responsibilities,
        requiredSkills: job.requirements,
        preferredSkills: [],
        eligibility: [],
        workMode: job.workMode ?? 'Not Specified',
        location: job.location ?? 'Not Specified',
        duration: job.duration ?? 'Not Specified',
        stipend: job.stipend ? `$${(job.stipend / 100).toFixed(2)}` : 'Not Specified',
        keyTakeaways: [job.title],
        importantRequirements: job.requirements,
      };
    }
  }

  /**
   * Feature 3: AI Match Explanation
   */
  async explainMatch(userId: string, jobId: string): Promise<any> {
    this.checkAiEnabled();
    const job = await this.prisma.jobPosting.findUnique({
      where: { id: jobId },
      include: { company: true },
    });
    if (!job) {
      throw new HttpException('Job posting not found', HttpStatus.NOT_FOUND);
    }

    const score = await this.prisma.matchScore.findUnique({
      where: { userId_jobId: { userId, jobId } },
    });
    const rec = await this.prisma.recommendation.findUnique({
      where: { userId_jobId: { userId, jobId } },
      include: { reasons: true },
    });

    if (!score) {
      throw new HttpException('No match score calculated for this job yet', HttpStatus.BAD_REQUEST);
    }

    const profile = await this.prisma.profile.findUnique({ where: { userId } });

    const payload = {
      profile: profile ? { degree: profile.degree, college: profile.college } : {},
      job: { title: job.title, company: job.company.name, requirements: job.requirements },
      score,
      reasons: rec ? rec.reasons.map((r) => r.description) : [],
    };

    const hash = this.cacheService.generateInputHash(payload);
    const cached = await this.cacheService.getAnalysis(userId, jobId, 'MATCH_EXPLANATION', hash);
    if (cached) {
      return cached;
    }

    const { system, user } = this.promptManager.compile('match-explanation', {
      profileInfo: JSON.stringify(payload.profile),
      jobInfo: JSON.stringify(payload.job),
      matchScores: JSON.stringify(payload.score),
      reasons: JSON.stringify(payload.reasons),
    });

    const startTime = Date.now();
    try {
      const template = this.promptManager.get('match-explanation');
      const result = await this.aiProvider.generateStructuredOutput<any>(
        user,
        template.expectedSchema,
        system,
      );

      const duration = Date.now() - startTime;
      await this.cacheService.saveAnalysis(
        userId,
        jobId,
        'MATCH_EXPLANATION',
        hash,
        result,
        this.aiConfig.provider,
        result.model,
      );

      this.logger.log(
        {
          action: 'match-explanation',
          userId,
          jobId,
          duration,
        },
        'AI match explanation completed',
      );

      const { usage: _usage, model: _model, ...cleanResult } = result;
      return cleanResult;
    } catch (err) {
      this.logger.warn(
        { err, jobId },
        'Match explanation failed — returning recommendation fallback',
      );
      return {
        matchSummary: `You have a deterministic match score of ${score.overallScore}%.`,
        strengths: rec?.reasons.map((r) => r.description) ?? [],
        skillMatches: [],
        preferenceMatches: [],
        potentialGaps: [],
        applicationAdvice: ['Review the job description details and requirements in the posting.'],
      };
    }
  }

  /**
   * Feature 4: Skill Gap Analysis
   */
  async analyzeSkillGap(userId: string, jobId: string): Promise<any> {
    this.checkAiEnabled();
    const job = await this.prisma.jobPosting.findUnique({ where: { id: jobId } });
    if (!job) {
      throw new HttpException('Job posting not found', HttpStatus.NOT_FOUND);
    }

    const userSkills = await this.prisma.userSkill.findMany({
      where: { userId },
      include: { skill: true },
    });

    const payload = {
      skills: userSkills.map((us) => us.skill.name),
      jobRequirements: job.requirements,
      jobTitle: job.title,
    };

    const hash = this.cacheService.generateInputHash(payload);
    const cached = await this.cacheService.getAnalysis(userId, jobId, 'SKILL_GAP', hash);
    if (cached) {
      return cached;
    }

    const { system, user } = this.promptManager.compile('skill-gap', {
      userSkills: JSON.stringify(payload.skills),
      jobSkills: JSON.stringify(payload.jobRequirements),
    });

    const startTime = Date.now();
    try {
      const template = this.promptManager.get('skill-gap');
      const result = await this.aiProvider.generateStructuredOutput<any>(
        user,
        template.expectedSchema,
        system,
      );

      const duration = Date.now() - startTime;
      await this.cacheService.saveAnalysis(
        userId,
        jobId,
        'SKILL_GAP',
        hash,
        result,
        this.aiConfig.provider,
        result.model,
      );

      this.logger.log(
        {
          action: 'skill-gap',
          userId,
          jobId,
          duration,
        },
        'AI skill gap analysis completed',
      );

      const { usage: _usage, model: _model, ...cleanResult } = result;
      return cleanResult;
    } catch (err) {
      this.logger.error({ err, jobId }, 'Skill gap analysis failed');
      throw err;
    }
  }

  /**
   * Feature 5: Cover Letter Generator
   */
  async generateCoverLetter(userId: string, jobId: string): Promise<any> {
    this.checkAiEnabled();
    if (!this.aiConfig.features.coverLetterEnabled) {
      throw new HttpException(
        'Cover letter generation is disabled',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    await this.rateLimiter.checkLimit(userId, 'cover_letter');

    const job = await this.prisma.jobPosting.findUnique({
      where: { id: jobId },
      include: { company: true },
    });
    if (!job) {
      throw new HttpException('Job posting not found', HttpStatus.NOT_FOUND);
    }

    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    const userSkills = await this.prisma.userSkill.findMany({
      where: { userId },
      include: { skill: true },
    });

    const payload = {
      profile: profile ? { degree: profile.degree, college: profile.college } : {},
      skills: userSkills.map((us) => us.skill.name),
      job: { title: job.title, description: job.description, company: job.company.name },
    };

    const { system, user } = this.promptManager.compile('cover-letter', {
      profileInfo: JSON.stringify(payload.profile) + '\nSkills: ' + JSON.stringify(payload.skills),
      jobInfo: job.description ?? 'No details provided',
      companyInfo: job.company.name,
    });

    const startTime = Date.now();
    try {
      const result = await this.aiProvider.generateText(user, system);
      const duration = Date.now() - startTime;

      const cost = this.costTracker.recordMetrics(
        result.model,
        'ai-feature',
        result.usage.inputTokens,
        result.usage.outputTokens,
        duration,
      );

      await this.prisma.generatedDocument.create({
        data: {
          userId,
          jobId,
          documentType: 'COVER_LETTER',
          content: sanitizeHtml(result.text),
        },
      });

      await this.rateLimiter.increment(userId, 'cover_letter');

      this.logger.log(
        {
          action: 'cover-letter',
          userId,
          jobId,
          duration,
          cost,
        },
        'Cover letter generated',
      );

      return { content: sanitizeHtml(result.text) };
    } catch (err) {
      this.logger.error({ err, jobId }, 'Cover letter generation failed');
      throw err;
    }
  }

  /**
   * Feature 6: Referral Message Generator
   */
  async generateReferral(userId: string, jobId: string): Promise<any> {
    this.checkAiEnabled();
    const job = await this.prisma.jobPosting.findUnique({
      where: { id: jobId },
      include: { company: true },
    });
    if (!job) {
      throw new HttpException('Job posting not found', HttpStatus.NOT_FOUND);
    }

    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    const userSkills = await this.prisma.userSkill.findMany({
      where: { userId },
      include: { skill: true },
    });

    const { system, user } = this.promptManager.compile('referral', {
      profileInfo:
        JSON.stringify(profile) +
        '\nSkills: ' +
        JSON.stringify(userSkills.map((s) => s.skill.name)),
      targetInfo: `Company: ${job.company.name}, Role: ${job.title}`,
    });

    const startTime = Date.now();
    try {
      const template = this.promptManager.get('referral');
      const result = await this.aiProvider.generateStructuredOutput<any>(
        user,
        template.expectedSchema,
        system,
      );

      const duration = Date.now() - startTime;

      await this.prisma.generatedDocument.create({
        data: {
          userId,
          jobId,
          documentType: 'REFERRAL_MESSAGE',
          content: JSON.stringify(result),
        },
      });

      this.logger.log(
        {
          action: 'referral-message',
          userId,
          jobId,
          duration,
        },
        'Referral messages generated',
      );

      const { usage: _usage, model: _model, ...cleanResult } = result;
      return cleanResult;
    } catch (err) {
      this.logger.error({ err, jobId }, 'Referral message generation failed');
      throw err;
    }
  }

  /**
   * Feature 7: Interview Preparation
   */
  async generateInterviewPrep(userId: string, jobId: string): Promise<any> {
    this.checkAiEnabled();
    if (!this.aiConfig.features.interviewEnabled) {
      throw new HttpException('Interview prep is disabled', HttpStatus.SERVICE_UNAVAILABLE);
    }

    await this.rateLimiter.checkLimit(userId, 'interview');

    const job = await this.prisma.jobPosting.findUnique({
      where: { id: jobId },
      include: { company: true },
    });
    if (!job) {
      throw new HttpException('Job posting not found', HttpStatus.NOT_FOUND);
    }

    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    const userSkills = await this.prisma.userSkill.findMany({
      where: { userId },
      include: { skill: true },
    });

    const payload = {
      profile: profile ? { degree: profile.degree } : {},
      skills: userSkills.map((us) => us.skill.name),
      job: { title: job.title, description: job.description, company: job.company.name },
    };

    const cached = await this.prisma.interviewPreparation.findFirst({
      where: { userId, jobId },
    });
    if (cached) {
      return cached.contentJson;
    }

    const { system, user } = this.promptManager.compile('interview', {
      profileInfo: JSON.stringify(payload.profile) + '\nSkills: ' + JSON.stringify(payload.skills),
      jobInfo: `Role: ${job.title}\nCompany: ${job.company.name}\nDescription: ${job.description}`,
    });

    const startTime = Date.now();
    try {
      const template = this.promptManager.get('interview');
      const result = await this.aiProvider.generateStructuredOutput<any>(
        user,
        template.expectedSchema,
        system,
      );

      const duration = Date.now() - startTime;

      const { usage: _usage, model: _model, ...cleanResult } = result;

      await this.prisma.interviewPreparation.create({
        data: {
          userId,
          jobId,
          contentJson: cleanResult,
        },
      });

      await this.rateLimiter.increment(userId, 'interview');

      this.logger.log(
        {
          action: 'interview-prep',
          userId,
          jobId,
          duration,
        },
        'Interview prep questions generated',
      );

      return cleanResult;
    } catch (err) {
      this.logger.error({ err, jobId }, 'Interview prep generation failed');
      throw err;
    }
  }

  /**
   * Feature 8: Internship Comparison
   */
  async compareInternships(userId: string, jobIds: string[]): Promise<any> {
    this.checkAiEnabled();
    if (jobIds.length < 2 || jobIds.length > 5) {
      throw new HttpException('Must compare between 2 and 5 internships', HttpStatus.BAD_REQUEST);
    }

    const jobs = await this.prisma.jobPosting.findMany({
      where: { id: { in: jobIds } },
      include: { company: true },
    });

    const scores = await this.prisma.matchScore.findMany({
      where: { userId, jobId: { in: jobIds } },
    });

    const profile = await this.prisma.profile.findUnique({ where: { userId } });

    const jobsListFormatted = jobs.map((job) => {
      const score = scores.find((s) => s.jobId === job.id)?.overallScore ?? 0;
      return {
        jobId: job.id,
        title: job.title,
        company: job.company.name,
        location: job.location,
        workMode: job.workMode,
        description: job.description,
        stipend: job.stipend,
        matchScore: score,
      };
    });

    const { system, user } = this.promptManager.compile('comparison', {
      profileInfo: JSON.stringify(profile),
      jobsList: JSON.stringify(jobsListFormatted),
    });

    const startTime = Date.now();
    try {
      const template = this.promptManager.get('comparison');
      const result = await this.aiProvider.generateStructuredOutput<any>(
        user,
        template.expectedSchema,
        system,
      );

      const duration = Date.now() - startTime;

      this.logger.log(
        {
          action: 'comparison',
          userId,
          duration,
        },
        'Internships compared',
      );

      const { usage: _usage, model: _model, ...cleanResult } = result;
      return cleanResult;
    } catch (err) {
      this.logger.error({ err, jobIds }, 'Comparison failed');
      throw err;
    }
  }

  /**
   * Feature 9: Personalized Learning Roadmap
   */
  async generateRoadmap(userId: string, targetRole: string, targetCompany?: string): Promise<any> {
    this.checkAiEnabled();
    if (!this.aiConfig.features.roadmapEnabled) {
      throw new HttpException('Learning roadmaps are disabled', HttpStatus.SERVICE_UNAVAILABLE);
    }

    const userSkills = await this.prisma.userSkill.findMany({
      where: { userId },
      include: { skill: true },
    });

    // Check if cached roadmap exists
    const cached = await this.prisma.learningRoadmap.findFirst({
      where: { userId, targetRole, targetCompany: targetCompany ?? null },
    });
    if (cached) {
      return cached.roadmapJson;
    }

    const { system, user } = this.promptManager.compile('roadmap', {
      targetRole,
      targetCompany: targetCompany ?? 'Any Top Technology Company',
      currentSkills: JSON.stringify(userSkills.map((us) => us.skill.name)),
      missingSkills: 'Skills not present in currentSkills but required for ' + targetRole,
    });

    const startTime = Date.now();
    try {
      const template = this.promptManager.get('roadmap');
      const result = await this.aiProvider.generateStructuredOutput<any>(
        user,
        template.expectedSchema,
        system,
      );

      const duration = Date.now() - startTime;
      const { usage: _usage, model: _model, ...cleanResult } = result;

      await this.prisma.learningRoadmap.create({
        data: {
          userId,
          targetRole,
          targetCompany: targetCompany ?? null,
          roadmapJson: cleanResult,
        },
      });

      this.logger.log(
        {
          action: 'learning-roadmap',
          userId,
          duration,
        },
        'Learning roadmap created',
      );

      return cleanResult;
    } catch (err) {
      this.logger.error({ err, targetRole }, 'Learning roadmap creation failed');
      throw err;
    }
  }

  /**
   * Feature 10: AI Chat Copilot
   */
  async handleChat(
    userId: string,
    message: string,
    conversationId?: string,
    jobId?: string,
  ): Promise<any> {
    this.checkAiEnabled();
    if (!this.aiConfig.features.chatEnabled) {
      throw new HttpException('AI Chat is disabled', HttpStatus.SERVICE_UNAVAILABLE);
    }

    await this.rateLimiter.checkLimit(userId, 'chat');
    await this.entitlementService.enforceUsage(userId, BILLING_FEATURES.AI_CHAT);

    let convId = conversationId;
    let conversation;

    if (convId) {
      conversation = await this.prisma.aiConversation.findFirst({
        where: { id: convId, userId },
      });
      if (!conversation) {
        throw new HttpException('Conversation not found', HttpStatus.NOT_FOUND);
      }
    } else {
      // Create new conversation
      conversation = await this.prisma.aiConversation.create({
        data: {
          userId,
          title: message.substring(0, 50) + '...',
          contextType: jobId ? 'JOB' : 'NONE',
          contextId: jobId ? jobId : null,
        },
      });
      convId = conversation.id;
    }

    // Save user message
    await this.prisma.aiMessage.create({
      data: {
        conversationId: convId,
        role: 'user',
        content: message,
      },
    });

    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    const userSkills = await this.prisma.userSkill.findMany({
      where: { userId },
      include: { skill: true },
    });

    let jobContextStr = 'No active job context selected.';
    if (jobId) {
      const job = await this.prisma.jobPosting.findUnique({
        where: { id: jobId },
        include: { company: true },
      });
      if (job) {
        const score = await this.prisma.matchScore.findUnique({
          where: { userId_jobId: { userId, jobId } },
        });
        jobContextStr = `Role: ${job.title}, Company: ${job.company.name}, Description: ${job.description}, Match Score: ${score?.overallScore ?? 'None'}%`;
      }
    }

    const applications = await this.prisma.application.findMany({
      where: { userId },
      select: { status: true },
    });
    const appStats = applications.reduce(
      (acc, app) => {
        acc[app.status] = (acc[app.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    const appStatsStr = Object.entries(appStats)
      .map(([status, count]) => `${status}: ${count}`)
      .join(', ');

    const userContextStr = `Degree: ${profile?.degree ?? 'Not Provided'}, Current Skills: ${userSkills.map((s) => s.skill.name).join(', ')}, Application Progress: ${appStatsStr || 'None'}`;

    // Compile history (fetch last 8 messages for context)
    const history = await this.prisma.aiMessage.findMany({
      where: { conversationId: convId },
      orderBy: { createdAt: 'asc' },
      take: 8,
    });

    const historyPrompt = history
      .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');

    const { system, user } = this.promptManager.compile('chat', {
      userContext: userContextStr,
      jobContext: jobContextStr,
      message: `${historyPrompt}\nUser: ${message}\nAssistant:`,
    });

    const startTime = Date.now();
    try {
      const result = await this.aiProvider.generateText(user, system);
      const duration = Date.now() - startTime;
      const cost = this.costTracker.recordMetrics(
        result.model,
        'ai-feature',
        result.usage.inputTokens,
        result.usage.outputTokens,
        duration,
      );

      // Save assistant message
      const savedMessage = await this.prisma.aiMessage.create({
        data: {
          conversationId: convId,
          role: 'assistant',
          content: result.text,
          provider: this.aiConfig.provider,
          model: result.model,
          tokenUsage: result.usage as any,
        },
      });

      await this.rateLimiter.increment(userId, 'chat');

      this.logger.log(
        {
          action: 'chat',
          userId,
          conversationId: convId,
          duration,
          cost,
        },
        'AI chat response generated',
      );

      return {
        conversationId: convId,
        message: savedMessage,
      };
    } catch (err) {
      this.logger.error({ err, convId }, 'AI chat handler failed');
      throw err;
    }
  }

  /**
   * Feature 10 (Streaming): AI Chat Copilot Stream
   */
  async handleChatStream(
    userId: string,
    message: string,
    conversationId?: string,
    jobId?: string,
    onChunk?: (text: string) => void,
  ): Promise<any> {
    this.checkAiEnabled();
    if (!this.aiConfig.features.chatEnabled) {
      throw new HttpException('AI Chat is disabled', HttpStatus.SERVICE_UNAVAILABLE);
    }

    await this.rateLimiter.checkLimit(userId, 'chat');

    let convId = conversationId;
    let conversation;

    if (convId) {
      conversation = await this.prisma.aiConversation.findFirst({
        where: { id: convId, userId },
      });
      if (!conversation) {
        throw new HttpException('Conversation not found', HttpStatus.NOT_FOUND);
      }
    } else {
      conversation = await this.prisma.aiConversation.create({
        data: {
          userId,
          title: message.substring(0, 50) + '...',
          contextType: jobId ? 'JOB' : 'NONE',
          contextId: jobId ? jobId : null,
        },
      });
      convId = conversation.id;
    }

    // Save user message
    await this.prisma.aiMessage.create({
      data: {
        conversationId: convId,
        role: 'user',
        content: message,
      },
    });

    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    const userSkills = await this.prisma.userSkill.findMany({
      where: { userId },
      include: { skill: true },
    });

    let jobContextStr = 'No active job context selected.';
    if (jobId) {
      const job = await this.prisma.jobPosting.findUnique({
        where: { id: jobId },
        include: { company: true },
      });
      if (job) {
        const score = await this.prisma.matchScore.findUnique({
          where: { userId_jobId: { userId, jobId } },
        });
        jobContextStr = `Role: ${job.title}, Company: ${job.company.name}, Description: ${job.description}, Match Score: ${score?.overallScore ?? 'None'}%`;
      }
    }

    const applicationsStream = await this.prisma.application.findMany({
      where: { userId },
      select: { status: true },
    });
    const appStatsStream = applicationsStream.reduce(
      (acc, app) => {
        acc[app.status] = (acc[app.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    const appStatsStreamStr = Object.entries(appStatsStream)
      .map(([status, count]) => `${status}: ${count}`)
      .join(', ');

    const userContextStr = `Degree: ${profile?.degree ?? 'Not Provided'}, Current Skills: ${userSkills.map((s) => s.skill.name).join(', ')}, Application Progress: ${appStatsStreamStr || 'None'}`;

    // Compile history
    const history = await this.prisma.aiMessage.findMany({
      where: { conversationId: convId },
      orderBy: { createdAt: 'asc' },
      take: 8,
    });

    const historyPrompt = history
      .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');

    const { system, user } = this.promptManager.compile('chat', {
      userContext: userContextStr,
      jobContext: jobContextStr,
      message: `${historyPrompt}\nUser: ${message}\nAssistant:`,
    });

    const startTime = Date.now();
    try {
      const options: any = { stream: true };
      if (onChunk) {
        options.onChunk = onChunk;
      }
      const result = await this.aiProvider.generateText(user, system, options);
      const duration = Date.now() - startTime;
      const cost = this.costTracker.recordMetrics(
        result.model,
        'ai-feature',
        result.usage.inputTokens,
        result.usage.outputTokens,
        duration,
      );

      // Save assistant message
      const savedMessage = await this.prisma.aiMessage.create({
        data: {
          conversationId: convId,
          role: 'assistant',
          content: result.text,
          provider: this.aiConfig.provider,
          model: result.model,
          tokenUsage: result.usage as any,
        },
      });

      await this.rateLimiter.increment(userId, 'chat');

      this.logger.log(
        {
          action: 'chat-stream',
          userId,
          conversationId: convId,
          duration,
          cost,
        },
        'AI chat stream completed',
      );

      return {
        conversationId: convId,
        message: savedMessage,
      };
    } catch (err) {
      this.logger.error({ err, convId }, 'AI chat stream failed');
      throw err;
    }
  }

  /**
   * Fetch conversations list for user
   */
  async getConversations(userId: string): Promise<any[]> {
    return this.prisma.aiConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Fetch details + messages of a single conversation
   */
  async getConversation(userId: string, id: string): Promise<any> {
    const conv = await this.prisma.aiConversation.findFirst({
      where: { id, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!conv) {
      throw new HttpException('Conversation not found', HttpStatus.NOT_FOUND);
    }
    return conv;
  }

  /**
   * Delete conversation
   */
  async deleteConversation(userId: string, id: string): Promise<any> {
    const conv = await this.prisma.aiConversation.findFirst({
      where: { id, userId },
    });
    if (!conv) {
      throw new HttpException('Conversation not found', HttpStatus.NOT_FOUND);
    }
    await this.prisma.aiConversation.delete({ where: { id } });
    return { success: true };
  }

  /**
   * Internal generic completion generation for backward compatibility with other modules
   * (e.g. interviews.service.ts, resume-builder.service.ts)
   */
  async generateCompletion(options: {
    prompt: string;
    userId: string;
    useCache?: boolean;
  }): Promise<{ text: string }> {
    this.checkAiEnabled();
    const { prompt } = options;
    const result = await this.aiProvider.generateText(prompt, 'You are a helpful assistant.');
    return { text: result.text };
  }

  /**
   * Parses raw resume text into structured fields.
   */
  async parseResumeText(userId: string, resumeText: string): Promise<any> {
    this.checkAiEnabled();
    await this.rateLimiter.checkLimit(userId, 'resume');
    
    const payload = { resumeText };
    const hash = this.cacheService.generateInputHash(payload);
    const cached = await this.cacheService.getAnalysis(userId, null, 'RESUME_PARSING' as any, hash);
    if (cached) {
      return cached;
    }

    const { system, user } = this.promptManager.compile('resume-parsing', {
      resumeText,
    });

    const startTime = Date.now();
    try {
      const template = this.promptManager.get('resume-parsing');
      const result = await this.aiProvider.generateStructuredOutput<any>(
        user,
        template.expectedSchema,
        system,
      );

      const duration = Date.now() - startTime;
      this.costTracker.recordMetrics(
        result.model,
        'resume-parsing',
        result.usage.inputTokens,
        result.usage.outputTokens,
        duration,
      );

      await this.cacheService.saveAnalysis(
        userId,
        null,
        'RESUME_PARSING' as any,
        hash,
        result,
        this.aiConfig.provider,
        result.model,
      );
      await this.rateLimiter.increment(userId, 'resume');

      const { usage: _usage, model: _model, ...cleanResult } = result;
      return cleanResult;
    } catch (err) {
      this.logger.error({ err, userId }, 'Resume parsing failed');
      throw err;
    }
  }

  /**
   * Generates targeted resume optimization recommendations and overall quality score.
   */
  async optimizeResumeText(
    userId: string,
    resumeText: string,
    profileInfo: any,
    jobDescription: string = '',
    requestType: string = 'General Resume Optimization'
  ): Promise<any> {
    this.checkAiEnabled();
    await this.rateLimiter.checkLimit(userId, 'resume');

    const payload = {
      resumeText,
      profileInfo: JSON.stringify(profileInfo),
      jobDescription,
      requestType,
    };
    const hash = this.cacheService.generateInputHash(payload);
    const cached = await this.cacheService.getAnalysis(userId, null, 'RESUME_OPTIMIZATION' as any, hash);
    if (cached) {
      return cached;
    }

    const { system, user } = this.promptManager.compile('resume-optimization', {
      resumeText,
      profileInfo: JSON.stringify(profileInfo),
      jobDescription: jobDescription || 'Not Provided',
      requestType,
    });

    const startTime = Date.now();
    try {
      const template = this.promptManager.get('resume-optimization');
      const result = await this.aiProvider.generateStructuredOutput<any>(
        user,
        template.expectedSchema,
        system,
      );

      const duration = Date.now() - startTime;
      this.costTracker.recordMetrics(
        result.model,
        'resume-optimization',
        result.usage.inputTokens,
        result.usage.outputTokens,
        duration,
      );

      await this.cacheService.saveAnalysis(
        userId,
        null,
        'RESUME_OPTIMIZATION' as any,
        hash,
        result,
        this.aiConfig.provider,
        result.model,
      );
      await this.rateLimiter.increment(userId, 'resume');

      const { usage: _usage, model: _model, ...cleanResult } = result;
      return cleanResult;
    } catch (err) {
      this.logger.error({ err, userId }, 'Resume optimization failed');
      throw err;
    }
  }

  /**
   * Generates portfolio suggestions.
   */
  async optimizePortfolioContent(
    userId: string,
    portfolioContent: any,
    profileInfo: any
  ): Promise<any> {
    this.checkAiEnabled();
    await this.rateLimiter.checkLimit(userId, 'chat'); // Reuse chat limit or general limit

    const payload = {
      portfolioContent: JSON.stringify(portfolioContent),
      profileInfo: JSON.stringify(profileInfo),
    };
    const hash = this.cacheService.generateInputHash(payload);
    const cached = await this.cacheService.getAnalysis(userId, null, 'PORTFOLIO_OPTIMIZATION' as any, hash);
    if (cached) {
      return cached;
    }

    const { system, user } = this.promptManager.compile('portfolio-optimization', {
      portfolioContent: JSON.stringify(portfolioContent),
      profileInfo: JSON.stringify(profileInfo),
    });

    const startTime = Date.now();
    try {
      const template = this.promptManager.get('portfolio-optimization');
      const result = await this.aiProvider.generateStructuredOutput<any>(
        user,
        template.expectedSchema,
        system,
      );

      const duration = Date.now() - startTime;
      this.costTracker.recordMetrics(
        result.model,
        'portfolio-optimization',
        result.usage.inputTokens,
        result.usage.outputTokens,
        duration,
      );

      await this.cacheService.saveAnalysis(
        userId,
        null,
        'PORTFOLIO_OPTIMIZATION' as any,
        hash,
        result,
        this.aiConfig.provider,
        result.model,
      );

      const { usage: _usage, model: _model, ...cleanResult } = result;
      return cleanResult;
    } catch (err) {
      this.logger.error({ err, userId }, 'Portfolio optimization failed');
      throw err;
    }
  }
}
