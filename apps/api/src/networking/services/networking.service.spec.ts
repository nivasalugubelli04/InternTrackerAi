import { Test, TestingModule } from '@nestjs/testing';
import { ContactPipelineState } from '@prisma/client';

import { AI_PROVIDER_TOKEN } from '../../ai/providers/ai-provider.interface';
import { PrismaService } from '../../prisma/prisma.service';

import { NetworkingService } from './networking.service';

describe('NetworkingService', () => {
  let service: NetworkingService;
  let prisma: any;

  const mockPrisma = {
    professionalContact: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    relationshipInteraction: {
      create: jest.fn(),
      count: jest.fn(),
    },
    careerEvent: {
      create: jest.fn(),
    },
    careerAction: {
      create: jest.fn(),
    },
    careerGoal: {
      findMany: jest.fn(),
    },
    trackedCompany: {
      findMany: jest.fn(),
    },
    profile: {
      findFirst: jest.fn(),
    },
    savedJob: {
      findMany: jest.fn(),
    },
    jobPosting: {
      findUnique: jest.fn(),
    },
    resume: {
      findFirst: jest.fn(),
    },
    projectAnalysis: {
      count: jest.fn(),
      findFirst: jest.fn(),
    },
    outreachDraft: {
      create: jest.fn(),
    },
  };

  const mockAiProvider = {
    generateStructuredOutput: jest.fn(),
    generateText: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NetworkingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AI_PROVIDER_TOKEN, useValue: mockAiProvider },
      ],
    }).compile();

    service = module.get<NetworkingService>(NetworkingService);
    prisma = module.get<PrismaService>(PrismaService);

    prisma.careerGoal.findMany.mockResolvedValue([]);
    prisma.trackedCompany.findMany.mockResolvedValue([]);
    prisma.profile.findFirst.mockResolvedValue(null);
    prisma.savedJob.findMany.mockResolvedValue([]);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createContact', () => {
    it('should create contact and emit timeline events', async () => {
      const mockContact = {
        id: 'contact-123',
        name: 'John Doe',
        role: 'Software Engineer',
        company: 'Google',
        pipelineState: ContactPipelineState.DISCOVERED,
      };

      prisma.professionalContact.create.mockResolvedValue(mockContact);

      const result = await service.createContact('user-123', {
        name: 'John Doe',
        role: 'Software Engineer',
        company: 'Google',
      });

      expect(result.id).toBe('contact-123');
      expect(prisma.relationshipInteraction.create).toHaveBeenCalled();
      expect(prisma.careerEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ eventType: 'ContactAdded' }) }),
      );
      expect(prisma.careerAction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ actionType: 'NETWORKING_PREPARATION' }),
        }),
      );
    });
  });

  describe('evaluateReferralReadiness', () => {
    it('should flag POSSIBLE REFERRAL REQUEST when checklist parameters are satisfied', async () => {
      prisma.professionalContact.findFirst.mockResolvedValue({
        id: 'contact-123',
        name: 'John Doe',
        role: 'Software Engineer',
        company: 'Google',
      });
      prisma.jobPosting.findUnique.mockResolvedValue({
        id: 'job-123',
        companyId: 'Google',
      });
      prisma.resume.findFirst.mockResolvedValue({ id: 'resume-123' });
      prisma.projectAnalysis.count.mockResolvedValue(1);
      prisma.relationshipInteraction.count.mockResolvedValue(3);

      const result = await service.evaluateReferralReadiness('user-123', 'contact-123', 'job-123');

      expect(result.status).toBe('POSSIBLE REFERRAL REQUEST');
      expect(result.checklist.resumeReady).toBe(true);
      expect(result.checklist.portfolioReady).toBe(true);
      expect(result.checklist.relationshipBuilt).toBe(true);
    });

    it('should return NOT READY status when no relationship has been established', async () => {
      prisma.professionalContact.findFirst.mockResolvedValue({
        id: 'contact-123',
        name: 'John Doe',
        role: 'Software Engineer',
        company: 'Google',
      });
      prisma.jobPosting.findUnique.mockResolvedValue({
        id: 'job-123',
        companyId: 'Google',
      });
      prisma.resume.findFirst.mockResolvedValue(null);
      prisma.projectAnalysis.count.mockResolvedValue(0);
      prisma.relationshipInteraction.count.mockResolvedValue(0);

      const result = await service.evaluateReferralReadiness('user-123', 'contact-123', 'job-123');
      expect(result.status).toBe('NOT READY');
    });
  });

  describe('generateOutreach', () => {
    it('should run safety check and flag risk flags on claims containing forbidden words', async () => {
      prisma.professionalContact.findFirst.mockResolvedValue({
        id: 'contact-123',
        name: 'John Doe',
        role: 'Recruiter',
        company: 'Meta',
      });

      mockAiProvider.generateStructuredOutput.mockResolvedValue({
        goal: 'LEARN_ROLE',
        recommendedApproach: 'Be professional',
        draftShort: 'I noticed your role as Recruiter. I was referred by a mutual friend.',
        draftDetailed: 'Full message draft',
        factsReferenced: ['Meta'],
        riskFlags: [],
        suggestedNextStep: 'Send outreach',
      });

      const result = await service.generateOutreach('user-123', {
        contactId: 'contact-123',
        goal: 'LEARN_ROLE',
      });

      expect(result.riskFlags).toContain(
        'Contains potential fabricated flattery or ungrounded relation references.',
      );
    });
  });
});
