import { Test, TestingModule } from '@nestjs/testing';
import { OpportunityCategory, FreshnessStatus } from '@prisma/client';

import { CareerIntelligenceService } from '../career-intelligence/services/career-intelligence.service';
import { PrismaService } from '../prisma/prisma.service';

import { CareerRelevanceService } from './services/career-relevance.service';
import { CompanyIntelligenceService } from './services/company-intelligence.service';
import { OpportunityFreshnessService } from './services/opportunity-freshness.service';
import { OpportunityNormalizationService } from './services/opportunity-normalization.service';
import { ResearchAiService } from './services/research-ai.service';
import { ResearchSourceRegistryService } from './services/research-source-registry.service';
import { ResearchService } from './services/research.service';
import { TechnologySignalService } from './services/technology-signal.service';
import { WatchlistService } from './services/watchlist.service';

describe('Phase 47 — Autonomous Career Research & Opportunity Intelligence Engine', () => {
  let sourceRegistry: ResearchSourceRegistryService;
  let normalizationService: OpportunityNormalizationService;
  let freshnessService: OpportunityFreshnessService;
  let relevanceService: CareerRelevanceService;
  let companyIntelligence: CompanyIntelligenceService;
  let technologySignal: TechnologySignalService;
  let watchlistService: WatchlistService;
  let aiService: ResearchAiService;
  let researchService: ResearchService;

  const mockPrisma = {
    researchSource: {
      count: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    jobPosting: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    opportunityFreshness: {
      upsert: jest.fn(),
    },
    company: {
      findUnique: jest.fn(),
    },
    companyFollow: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    application: {
      count: jest.fn(),
    },
    technologySignal: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    researchWatchlist: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    researchWatchlistItem: {
      create: jest.fn(),
    },
    executionPlan: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    executionPlanItem: {
      create: jest.fn(),
    },
    careerEvent: {
      create: jest.fn(),
    },
    researchPreference: {
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
    savedJob: {
      findMany: jest.fn(),
    },
    researchJobRun: {
      create: jest.fn(),
    },
  };

  const mockCareerIntelligence = {
    buildCareerState: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResearchSourceRegistryService,
        OpportunityNormalizationService,
        OpportunityFreshnessService,
        CareerRelevanceService,
        CompanyIntelligenceService,
        TechnologySignalService,
        WatchlistService,
        ResearchAiService,
        ResearchService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CareerIntelligenceService, useValue: mockCareerIntelligence },
      ],
    }).compile();

    sourceRegistry = module.get<ResearchSourceRegistryService>(ResearchSourceRegistryService);
    normalizationService = module.get<OpportunityNormalizationService>(
      OpportunityNormalizationService,
    );
    freshnessService = module.get<OpportunityFreshnessService>(OpportunityFreshnessService);
    relevanceService = module.get<CareerRelevanceService>(CareerRelevanceService);
    companyIntelligence = module.get<CompanyIntelligenceService>(CompanyIntelligenceService);
    technologySignal = module.get<TechnologySignalService>(TechnologySignalService);
    watchlistService = module.get<WatchlistService>(WatchlistService);
    aiService = module.get<ResearchAiService>(ResearchAiService);
    researchService = module.get<ResearchService>(ResearchService);
  });

  describe('1. ResearchSourceRegistryService', () => {
    it('seeds default verified sources when database is empty', async () => {
      mockPrisma.researchSource.count.mockResolvedValue(0);
      mockPrisma.researchSource.create.mockResolvedValue({});

      await sourceRegistry.seedDefaultSourcesIfEmpty();

      expect(mockPrisma.researchSource.create).toHaveBeenCalled();
    });

    it('reports failure and updates degraded health status', async () => {
      mockPrisma.researchSource.findUnique.mockResolvedValue({ errorCount: 2 });
      mockPrisma.researchSource.update.mockResolvedValue({});

      await sourceRegistry.reportSourceHealth('source-1', false, 'Timeout error');

      expect(mockPrisma.researchSource.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'source-1' },
          data: expect.objectContaining({
            healthStatus: 'DEGRADED',
            errorCount: 3,
          }),
        }),
      );
    });
  });

  describe('2. OpportunityNormalizationService', () => {
    it('normalizes raw opportunity, infers category, and computes deterministic hash', () => {
      const normalized = normalizationService.normalizeOpportunity({
        sourceName: 'Google Careers',
        companyName: 'Google',
        jobTitle: 'Software Engineering Summer Intern',
        description: 'Building distributed systems using Python and Go with remote flexibility.',
        applicationUrl: 'https://careers.google.com/jobs/12345?utm_source=feed',
      });

      expect(normalized.companySlug).toBe('google');
      expect(normalized.category).toBe(OpportunityCategory.INTERNSHIP);
      expect(normalized.workMode).toBe('REMOTE');
      expect(normalized.skills).toContain('Python');
      expect(normalized.hash).toBeDefined();
      expect(normalized.hash.length).toBe(64);
    });

    it('detects duplicate opportunities using SHA-256 hash or company+title match', async () => {
      mockPrisma.jobPosting.findUnique.mockResolvedValue({ id: 'existing-job-1' });

      const normalized = normalizationService.normalizeOpportunity({
        sourceName: 'Meta Careers',
        companyName: 'Meta',
        jobTitle: 'AI Research Intern',
        description: 'PyTorch deep learning',
        applicationUrl: 'https://careers.meta.com/jobs/999',
      });

      const dupCheck = await normalizationService.isDuplicate(normalized);
      expect(dupCheck.isDuplicate).toBe(true);
      expect(dupCheck.existingJobId).toBe('existing-job-1');
    });
  });

  describe('3. OpportunityFreshnessService', () => {
    it('computes NEW freshness for recent job and DEADLINE_SOON for closing date', () => {
      const now = new Date();
      const inTwoDays = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

      const freshness = freshnessService.computeFreshnessStatus(now, inTwoDays);
      expect(freshness.status).toBe(FreshnessStatus.DEADLINE_SOON);
      expect(freshness.deadlineDaysLeft).toBeLessThanOrEqual(2);
      expect(freshness.isExpired).toBe(false);
    });

    it('identifies expired opportunities and sweeps them from active status', async () => {
      mockPrisma.jobPosting.findMany.mockResolvedValue([{ id: 'job-expired-1' }]);
      mockPrisma.jobPosting.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.opportunityFreshness.upsert.mockResolvedValue({});

      const swept = await freshnessService.sweepExpiredOpportunities();
      expect(swept).toBe(1);
      expect(mockPrisma.jobPosting.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'EXPIRED' } }),
      );
    });
  });

  describe('4. CareerRelevanceService', () => {
    it('calculates grounded relevance scores, highlights strengths, and flags missing skills', () => {
      const userProfile = {
        userId: 'user-1',
        targetRole: 'AI Engineer',
        careerGoals: ['Land Machine Learning Internship'],
        skills: [{ name: 'Python' }, { name: 'PyTorch' }, { name: 'React' }],
        projects: [{ title: 'Vision Classifier', techStack: ['Python', 'PyTorch'] }],
        preferredWorkModes: ['REMOTE', 'HYBRID'],
      };

      const opportunity = {
        title: 'Machine Learning Engineering Intern',
        description: 'Build NLP models using Python, PyTorch, and Docker.',
        requirements: ['Python', 'PyTorch', 'Docker'],
        skills: ['Python', 'PyTorch', 'Docker'],
        workMode: 'REMOTE',
      };

      const relevance = relevanceService.evaluateRelevance(userProfile, opportunity);

      expect(relevance.overallScore).toBeGreaterThanOrEqual(75);
      expect(relevance.matchingStrengths.length).toBeGreaterThan(0);
      expect(relevance.criticalGaps).toContain(
        'Role requires Docker which are not yet on your profile.',
      );
      expect(relevance.relevantProjects).toContain('Vision Classifier');
      expect(relevance.readinessLevel).toBe('NEEDS_PREPARATION');
    });
  });

  describe('5. CompanyIntelligenceService', () => {
    it('builds comprehensive company profile with hiring velocity and required skills', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({
        id: 'comp-1',
        name: 'DeepScale AI',
        slug: 'deepscale-ai',
        industry: 'Artificial Intelligence',
        jobPostings: [
          { id: 'j-1', title: 'ML Intern', requirements: ['Python', 'PyTorch'], deadline: null },
          {
            id: 'j-2',
            title: 'Backend Intern',
            requirements: ['Python', 'FastAPI'],
            deadline: null,
          },
        ],
      });
      mockPrisma.companyFollow.findUnique.mockResolvedValue({ id: 'follow-1' });
      mockPrisma.application.count.mockResolvedValue(1);

      const profile = await companyIntelligence.getCompanyProfile('comp-1', 'user-1');

      expect(profile.name).toBe('DeepScale AI');
      expect(profile.hiringVelocity).toBe('STEADY');
      expect(profile.isFollowed).toBe(true);
      expect(profile.userApplicationCount).toBe(1);
    });

    it('allows user to follow and unfollow a company', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({ id: 'comp-1', name: 'DeepScale AI' });
      mockPrisma.companyFollow.upsert.mockResolvedValue({ id: 'follow-1' });
      mockPrisma.careerEvent.create.mockResolvedValue({});

      const res = await companyIntelligence.followCompany('user-1', 'comp-1', {
        minMatchAlert: 80,
      });
      expect(res.success).toBe(true);
      expect(mockPrisma.careerEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ eventType: 'CompanyFollowed' }),
        }),
      );
    });
  });

  describe('6. TechnologySignalService', () => {
    it('ingests extracted skills and marks trend as INCREASING for high frequency', async () => {
      mockPrisma.technologySignal.findUnique.mockResolvedValue({
        skillName: 'PyTorch',
        frequencyCount: 9,
        sampleJobTitles: ['ML Intern'],
        sourceCount: 3,
      });
      mockPrisma.technologySignal.update.mockResolvedValue({});

      await technologySignal.ingestSkillSignals(['PyTorch'], 'AI Engineer Intern');

      expect(mockPrisma.technologySignal.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { skillName: 'PyTorch' },
          data: expect.objectContaining({
            frequencyCount: 10,
            demandTrend: 'INCREASING',
          }),
        }),
      );
    });
  });

  describe('7. WatchlistService & Research-to-Action Flow', () => {
    it('creates a watchlist and connects recommended preparation to Phase 45 Execution Plan', async () => {
      mockPrisma.researchWatchlist.create.mockResolvedValue({
        id: 'wl-1',
        title: 'Top AI Internships',
      });

      const wl = await watchlistService.createWatchlist('user-1', {
        title: 'Top AI Internships',
        targetRoles: ['AI Engineer'],
      });
      expect(wl.title).toBe('Top AI Internships');

      // Test Research-to-Action
      mockPrisma.executionPlan.findFirst.mockResolvedValue({ id: 'plan-10' });
      mockPrisma.executionPlanItem.create.mockResolvedValue({
        id: 'item-100',
        title: 'Deploy Model',
      });
      mockPrisma.careerEvent.create.mockResolvedValue({});

      const prepRes = await watchlistService.createPreparationAction('user-1', {
        opportunityTitle: 'ML Intern',
        companyName: 'DeepScale AI',
        suggestedTask: 'Deploy Model on AWS to demonstrate cloud readiness',
        estimatedMinutes: 60,
      });

      expect(prepRes.success).toBe(true);
      expect(mockPrisma.executionPlanItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            planId: 'plan-10',
            title: 'Deploy Model on AWS to demonstrate cloud readiness',
          }),
        }),
      );
    });
  });

  describe('8. ResearchAiService Resilience', () => {
    it('generates a deterministic grounded fallback when AI provider is not present', async () => {
      const fallback = aiService.generateDeterministicFallback(
        'AI Engineer',
        'Machine Learning Intern',
        'OpenAI',
        {
          overallScore: 88,
          roleAlignmentScore: 90,
          skillOverlapScore: 85,
          skillGapClosingScore: 80,
          projectRelevanceScore: 85,
          locationWorkModeScore: 90,
          readinessLevel: 'READY',
          matchingStrengths: ['Matches your skills in Python, PyTorch.'],
          criticalGaps: [],
          relevantProjects: ['Vision Classifier'],
          recommendedPreparation: [],
        },
      );

      expect(fallback).toContain('Machine Learning Intern at OpenAI');
      expect(fallback).toContain('Python, PyTorch');
    });
  });

  describe('9. End-to-End Personalized Research Feed Flow', () => {
    it('generates a segmented personalized feed across matches, freshness, and market signals', async () => {
      mockCareerIntelligence.buildCareerState.mockResolvedValue({
        targetRole: 'AI Engineer',
        careerGoals: ['Land AI Internship'],
        skills: [{ name: 'Python' }, { name: 'PyTorch' }],
        projects: [{ title: 'Classifier App', skills: ['Python'] }],
      });
      mockPrisma.researchPreference.findUnique.mockResolvedValue(null);
      mockPrisma.companyFollow.findMany.mockResolvedValue([{ companyId: 'comp-1' }]);
      mockPrisma.savedJob.findMany.mockResolvedValue([]);
      mockPrisma.jobPosting.findMany.mockResolvedValue([
        {
          id: 'job-1',
          companyId: 'comp-1',
          title: 'Machine Learning Intern',
          description: 'Python PyTorch Docker',
          requirements: ['Python', 'PyTorch'],
          location: 'San Francisco, CA',
          workMode: 'HYBRID',
          stipend: 5000,
          createdAt: new Date(),
          deadline: null,
          applicationUrl: 'https://careers.company.com/apply/1',
          company: { name: 'ScaleTech', logoUrl: null },
        },
      ]);
      mockPrisma.technologySignal.findMany.mockResolvedValue([
        {
          skillName: 'PyTorch',
          category: 'AI',
          frequencyCount: 15,
          demandTrend: 'INCREASING',
          sourceCount: 5,
          sampleJobTitles: ['ML Intern'],
        },
      ]);

      const feed = await researchService.getPersonalizedFeed('user-1');

      expect(feed.topMatches).toHaveLength(1);
      expect(feed.topMatches[0]?.companyName).toBe('ScaleTech');
      expect(feed.topMatches[0]?.isFollowedCompany).toBe(true);
      expect(feed.trendingSignals).toHaveLength(1);
      expect(feed.trendingSignals[0]?.skillName).toBe('PyTorch');
    });
  });
});
