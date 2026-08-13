import { HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../prisma/prisma.service';
import { PromptManager } from '../prompts/prompt-manager';
import { AI_PROVIDER_TOKEN } from '../providers/ai-provider.interface';
import type { AIProvider } from '../providers/ai-provider.interface';

import { AiCacheService } from './ai-cache.service';
import { AiRateLimiterService } from './ai-rate-limiter.service';
import { AiService } from './ai.service';
import { CostTrackerService } from './cost-tracker.service';

const mockConfig = {
  get: jest.fn((key: string) => {
    const cfg: Record<string, any> = {
      ai: {
        enabled: true,
        provider: 'gemini',
        model: 'gemini-1.5-flash',
        apiKey: 'test-key',
        maxTokens: 2048,
        temperature: 0.3,
        timeout: 30000,
        features: {
          chatEnabled: true,
          resumeAnalysisEnabled: true,
          coverLetterEnabled: true,
          interviewEnabled: true,
          roadmapEnabled: true,
        },
        rateLimits: {
          chatPerHour: 30,
          resumePerDay: 3,
          coverLetterPerDay: 10,
          interviewPerDay: 10,
        },
      },
    };
    return cfg[key];
  }),
};

const mockPrisma = {
  profile: {
    findUnique: jest
      .fn()
      .mockResolvedValue({ degree: 'Computer Science', college: 'Test University' }),
  },
  careerPreference: {
    findUnique: jest.fn().mockResolvedValue({ preferredRoles: ['Software Engineer'] }),
  },
  jobPosting: {
    findUnique: jest.fn().mockResolvedValue({
      id: 'job-1',
      title: 'Software Developer Intern',
      description: 'Java developer wanted',
      requirements: ['Java', 'SQL'],
      workMode: 'REMOTE',
      location: 'New York',
      stipend: 100000,
      company: { name: 'Test Company' },
    }),
    findMany: jest.fn().mockResolvedValue([
      { id: 'job-1', title: 'Job 1', company: { name: 'Company 1' } },
      { id: 'job-2', title: 'Job 2', company: { name: 'Company 2' } },
    ]),
  },
  application: {
    findMany: jest.fn().mockResolvedValue([]),
  },
  matchScore: {
    findUnique: jest.fn().mockResolvedValue({ overallScore: 85, skillScore: 80 }),
    findMany: jest.fn().mockResolvedValue([
      { jobId: 'job-1', overallScore: 85 },
      { jobId: 'job-2', overallScore: 70 },
    ]),
  },
  recommendation: {
    findUnique: jest.fn().mockResolvedValue({
      reasons: [{ description: 'Strong Java skill match' }],
    }),
  },
  userSkill: {
    findMany: jest
      .fn()
      .mockResolvedValue([{ skill: { name: 'Java' } }, { skill: { name: 'SQL' } }]),
  },
  aiAnalysis: {
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn(),
  },
  generatedDocument: {
    create: jest.fn(),
  },
  learningRoadmap: {
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn(),
  },
  interviewPreparation: {
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn(),
  },
  aiConversation: {
    findFirst: jest.fn(),
    create: jest.fn().mockResolvedValue({ id: 'conv-1' }),
    delete: jest.fn().mockResolvedValue({ success: true }),
  },
  aiMessage: {
    create: jest.fn().mockResolvedValue({ id: 'msg-1', content: 'hello' }),
    findMany: jest.fn().mockResolvedValue([]),
  },
};

const mockAIProvider: jest.Mocked<AIProvider> = {
  generateText: jest.fn().mockResolvedValue({
    text: 'Mocked text response',
    usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
    model: 'gemini-1.5-flash',
  }),
  generateStructuredOutput: jest.fn().mockResolvedValue({
    summary: 'Mocked resume analysis summary',
    skills: ['Java', 'SQL'],
    technicalSkills: ['Java'],
    softSkills: ['Teamwork'],
    projects: [],
    certifications: [],
    education: [],
    experience: [],
    strengths: ['Java'],
    weaknesses: [],
    missingInformation: [],
    atsSuggestions: [],
    careerSuggestions: [],
    usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
    model: 'gemini-1.5-flash',
  }),
};

const mockCache = {
  generateInputHash: jest.fn().mockReturnValue('mock-hash'),
  getAnalysis: jest.fn().mockResolvedValue(null),
  saveAnalysis: jest.fn(),
};

const mockCostTracker = {
  recordMetrics: jest.fn().mockReturnValue(0.0001),
};

const mockRateLimiter = {
  checkLimit: jest.fn().mockResolvedValue(undefined),
  increment: jest.fn().mockResolvedValue(undefined),
};

describe('AiService', () => {
  let service: AiService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        PromptManager,
        { provide: ConfigService, useValue: mockConfig },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AI_PROVIDER_TOKEN, useValue: mockAIProvider },
        { provide: AiCacheService, useValue: mockCache },
        { provide: CostTrackerService, useValue: mockCostTracker },
        { provide: AiRateLimiterService, useValue: mockRateLimiter },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('analyzeResume()', () => {
    it('returns resume analysis results successfully', async () => {
      const result = await service.analyzeResume('user-1', 'Resume text...');
      expect(result.summary).toBe('Mocked resume analysis summary');
      expect(mockRateLimiter.checkLimit).toHaveBeenCalledWith('user-1', 'resume');
      expect(mockRateLimiter.increment).toHaveBeenCalledWith('user-1', 'resume');
    });

    it('throws error if resume analysis is globally disabled', async () => {
      const originalGet = mockConfig.get;
      mockConfig.get = jest.fn().mockReturnValue({
        enabled: true,
        features: { resumeAnalysisEnabled: false },
        rateLimits: { resumePerDay: 3 },
      });
      await expect(service.analyzeResume('user-1', 'text')).rejects.toThrow(HttpException);
      mockConfig.get = originalGet;
    });
  });

  describe('summarizeJob()', () => {
    it('returns summarized job details', async () => {
      mockAIProvider.generateStructuredOutput.mockResolvedValueOnce({
        roleSummary: 'role',
        responsibilities: [],
        requiredSkills: [],
        preferredSkills: [],
        eligibility: [],
        workMode: 'REMOTE',
        location: 'New York',
        duration: '3 months',
        stipend: '1000',
        keyTakeaways: [],
        importantRequirements: [],
        usage: { inputTokens: 5, outputTokens: 5, totalTokens: 10 },
        model: 'gemini-1.5-flash',
      } as any);

      const result = await service.summarizeJob('user-1', 'job-1');
      expect(result.location).toBe('New York');
    });

    it('returns database fallback when LLM call fails', async () => {
      mockAIProvider.generateStructuredOutput.mockRejectedValueOnce(new Error('LLM Timeout'));
      const result = await service.summarizeJob('user-1', 'job-1');
      expect(result.roleSummary).toBe('Software Developer Intern');
      expect(result.workMode).toBe('REMOTE');
    });
  });

  describe('explainMatch()', () => {
    it('returns match explanation results', async () => {
      mockAIProvider.generateStructuredOutput.mockResolvedValueOnce({
        matchSummary: 'Good match',
        strengths: ['Java'],
        skillMatches: ['Java'],
        preferenceMatches: [],
        potentialGaps: [],
        applicationAdvice: [],
        usage: { inputTokens: 5, outputTokens: 5, totalTokens: 10 },
        model: 'gemini-1.5-flash',
      } as any);

      const result = await service.explainMatch('user-1', 'job-1');
      expect(result.matchSummary).toBe('Good match');
    });
  });

  describe('coverLetter()', () => {
    it('generates cover letter successfully', async () => {
      const result = await service.generateCoverLetter('user-1', 'job-1');
      expect(result.content).toContain('Mocked text response');
      expect(mockPrisma.generatedDocument.create).toHaveBeenCalled();
    });
  });

  describe('chat()', () => {
    it('creates messages and returns response', async () => {
      const result = await service.handleChat('user-1', 'Hello copilot', undefined, 'job-1');
      expect(result.conversationId).toBe('conv-1');
      expect(mockPrisma.aiMessage.create).toHaveBeenCalled();
    });
  });
});
