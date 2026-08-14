import { Test, TestingModule } from '@nestjs/testing';
import { ResumeStudioService } from './resume-studio.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/services/ai.service';
import { EntitlementService, BILLING_FEATURES } from '../billing/services/entitlement.service';

const mockPrisma = {
  resumeDocument: {
    findMany: jest.fn(),
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  resumeVersion: {
    update: jest.fn(),
    create: jest.fn(),
  },
  resumeAnalysis: {
    create: jest.fn(),
  },
  resumeSuggestion: {
    create: jest.fn(),
    deleteMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  profile: {
    findUnique: jest.fn(),
  },
  jobPosting: {
    findUnique: jest.fn(),
  },
};

const mockAiService = {
  optimizeResumeText: jest.fn(),
};

const mockEntitlementService = {
  enforceUsage: jest.fn(),
};

describe('ResumeStudioService', () => {
  let service: ResumeStudioService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResumeStudioService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AiService, useValue: mockAiService },
        { provide: EntitlementService, useValue: mockEntitlementService },
      ],
    }).compile();

    service = module.get<ResumeStudioService>(ResumeStudioService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getResumes', () => {
    it('should list resumes for a user', async () => {
      mockPrisma.resumeDocument.findMany.mockResolvedValueOnce([{ id: 'res-1', name: 'Resume 1' }]);
      const result = await service.getResumes('user-1');
      expect(result).toEqual([{ id: 'res-1', name: 'Resume 1' }]);
      expect(mockPrisma.resumeDocument.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isArchived: false },
        include: { versions: { orderBy: { createdAt: 'desc' }, take: 1 } },
        orderBy: { updatedAt: 'desc' },
      });
    });
  });

  describe('createResume', () => {
    it('should create resume document and version', async () => {
      const mockDoc = { id: 'res-1', name: 'General Resume', versions: [] };
      mockPrisma.resumeDocument.create.mockResolvedValueOnce(mockDoc);
      const result = await service.createResume('user-1', { name: 'General Resume', contentJson: {} });
      expect(result).toBe(mockDoc);
      expect(mockPrisma.resumeDocument.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          name: 'General Resume',
          versions: {
            create: {
              versionName: 'Initial Version',
              contentJson: {},
            },
          },
        },
        include: { versions: true },
      });
    });
  });

  describe('analyzeResume', () => {
    it('should run AI analysis, update score, and generate suggestions', async () => {
      const mockDoc = {
        id: 'doc-1',
        userId: 'user-1',
        versions: [{ id: 'ver-1', contentJson: { personalInfo: { name: 'Alice' } } }],
      };
      mockPrisma.resumeDocument.findFirst.mockResolvedValueOnce(mockDoc);
      mockPrisma.profile.findUnique.mockResolvedValueOnce({ id: 'prof-1' });

      mockAiService.optimizeResumeText.mockResolvedValueOnce({
        qualityScore: 90,
        scoreBreakdown: { ats: 22, skill: 23, content: 18, relevance: 12, completeness: 10, consistency: 5 },
        suggestions: [
          { sectionType: 'SUMMARY', originalText: '', suggestedText: 'Highly skilled developer', reason: 'Better verbs' },
        ],
        missingKeywords: [],
        matchedKeywords: [],
        categorizedSkills: [],
      });

      mockPrisma.resumeAnalysis.create.mockResolvedValueOnce({ id: 'analysis-1' });

      const result = await service.analyzeResume('user-1', 'doc-1');

      expect(mockEntitlementService.enforceUsage).toHaveBeenCalledWith('user-1', BILLING_FEATURES.RESUME_ANALYSIS);
      expect(mockAiService.optimizeResumeText).toHaveBeenCalled();
      expect(mockPrisma.resumeVersion.update).toHaveBeenCalledWith({
        where: { id: 'ver-1' },
        data: { qualityScore: 90, atsScore: 22 },
      });
      expect(mockPrisma.resumeSuggestion.create).toHaveBeenCalled();
      expect(result).toEqual({ id: 'analysis-1' });
    });
  });

  describe('approveSuggestion', () => {
    it('should apply optimization changes to contentJson and set status to ACCEPTED', async () => {
      const mockSuggestion = {
        id: 'sug-1',
        resumeVersionId: 'ver-1',
        sectionType: 'SUMMARY',
        originalText: '',
        suggestedText: 'Awesome summary',
        status: 'PENDING',
        resumeVersion: {
          id: 'ver-1',
          contentJson: { summary: 'Old summary' },
          resumeDocument: { userId: 'user-1' },
        },
      };

      mockPrisma.resumeSuggestion.findUnique.mockResolvedValueOnce(mockSuggestion);
      mockPrisma.resumeSuggestion.update.mockResolvedValueOnce({ id: 'sug-1', status: 'ACCEPTED' });

      const result = await service.approveSuggestion('user-1', 'doc-1', 'sug-1');

      expect(mockPrisma.resumeVersion.update).toHaveBeenCalledWith({
        where: { id: 'ver-1' },
        data: { contentJson: { summary: 'Awesome summary' } },
      });
      expect(result.status).toBe('ACCEPTED');
    });
  });
});
