import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';

import { ConsentType, SupportCategory, SupportPriority } from './dto/privacy.dto';
import { LegalPolicyService } from './services/legal-policy.service';
import { PrivacyControlService } from './services/privacy-control.service';
import { SupportService } from './services/support.service';

describe('Phase 55 — Public Launch Readiness, Privacy, Trust & Support Tests', () => {
  let privacyControlService: PrivacyControlService;
  let supportService: SupportService;
  let legalPolicyService: LegalPolicyService;

  const mockPrismaService = {
    userConsent: {
      create: jest.fn().mockImplementation(({ data }) => ({
        id: 'consent-1',
        ...data,
        grantedAt: new Date(),
      })),
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'consent-1',
          consentType: ConsentType.TERMS,
          version: '2026-08',
          isGranted: true,
          grantedAt: new Date(),
        },
      ]),
    },
    dataExportRequest: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(({ data }) => ({
        id: 'export-1',
        ...data,
        createdAt: new Date(),
      })),
    },
    accountDeletionRequest: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'del-1',
        userId: 'u-1',
        status: 'REQUESTED',
        scheduledFor: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
      }),
      create: jest.fn().mockImplementation(({ data }) => ({
        id: 'del-1',
        ...data,
        createdAt: new Date(),
      })),
      update: jest.fn().mockImplementation(({ data }) => ({
        id: 'del-1',
        ...data,
      })),
    },
    recruiterDiscoverabilitySettings: {
      findUnique: jest.fn().mockResolvedValue({
        discoverabilityLevel: 'PRIVATE',
        resumeVisible: false,
      }),
    },
    profile: {
      findUnique: jest.fn().mockResolvedValue({ headline: 'Software Engineer Intern' }),
    },
    careerPreference: {
      findUnique: jest.fn().mockResolvedValue({ targetRoles: ['Backend Engineer'] }),
    },
    application: {
      findMany: jest
        .fn()
        .mockResolvedValue([{ id: 'app-1', jobTitle: 'Software Intern', companyName: 'Google' }]),
    },
    trackedCompany: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    savedJob: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'u-1',
        email: 'candidate@university.edu',
        firstName: 'Taylor',
        lastName: 'Swift',
        createdAt: new Date(),
      }),
    },
    supportTicket: {
      create: jest.fn().mockImplementation(({ data }) => ({
        id: 'tick-1',
        ...data,
        createdAt: new Date(),
        messages: [{ id: 'm-1', message: data.description }],
      })),
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'tick-1',
          ticketNumber: 'TICK-202608-1001',
          category: 'BILLING',
          priority: 'HIGH',
          status: 'OPEN',
          subject: 'Payment discrepancy',
          description: 'Help with receipt',
          createdAt: new Date(),
          messages: [],
        },
      ]),
      findUnique: jest.fn().mockResolvedValue({
        id: 'tick-1',
        userId: 'u-1',
        ticketNumber: 'TICK-202608-1001',
        status: 'OPEN',
        messages: [],
      }),
      update: jest.fn().mockImplementation(({ data }) => ({
        id: 'tick-1',
        ...data,
      })),
    },
    supportTicketMessage: {
      create: jest.fn().mockImplementation(({ data }) => ({
        id: 'm-2',
        ...data,
        createdAt: new Date(),
        senderUser: { firstName: 'Support', role: 'SUPPORT_ADMIN' },
      })),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrivacyControlService,
        SupportService,
        LegalPolicyService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    privacyControlService = module.get<PrivacyControlService>(PrivacyControlService);
    supportService = module.get<SupportService>(SupportService);
    legalPolicyService = module.get<LegalPolicyService>(LegalPolicyService);
  });

  describe('1. Privacy Center & Consent Management', () => {
    it('should record versioned consent and return privacy overview', async () => {
      const consent = await privacyControlService.recordConsent('u-1', {
        consentType: ConsentType.TERMS,
        version: '2026-08.1',
        isGranted: true,
      });

      expect(consent.id).toBe('consent-1');
      expect(mockPrismaService.userConsent.create).toHaveBeenCalled();

      const overview = await privacyControlService.getPrivacyOverview('u-1');
      expect(overview.consents.length).toBeGreaterThan(0);
      expect(overview.dataRetentionPolicy).toBeDefined();
    });
  });

  describe('2. User Data Export & Portability', () => {
    it('should request and compile sanitized user data archive', async () => {
      const exportReq = await privacyControlService.requestDataExport('u-1');
      expect(exportReq.id).toBe('export-1');

      const archive = await privacyControlService.getExportData('u-1');
      expect(archive.account.email).toBe('candidate@university.edu');
      expect(archive.applications.length).toBe(1);
      expect((archive as any).passwordHash).toBeUndefined();
    });
  });

  describe('3. Account Deletion Workflow', () => {
    it('should handle staged deletion request and cancellation', async () => {
      const deletion = await privacyControlService.requestAccountDeletion('u-1', 'Graduated');
      expect(deletion.status).toBe('REQUESTED');

      const confirmed = await privacyControlService.confirmAccountDeletion('u-1');
      expect(confirmed.status).toBe('CONFIRMED');

      const cancelled = await privacyControlService.cancelAccountDeletion('u-1');
      expect(cancelled.status).toBe('CANCELLED');
    });
  });

  describe('4. Customer Support & Knowledge Base', () => {
    it('should create support ticket with unique ticket number format', async () => {
      const ticket = await supportService.createTicket('u-1', {
        category: SupportCategory.BILLING,
        priority: SupportPriority.HIGH,
        subject: 'Need invoice copy',
        description: 'Please email me my annual PRO invoice',
      });

      expect(ticket.ticketNumber).toContain('TICK-');
      expect(mockPrismaService.supportTicket.create).toHaveBeenCalled();
    });

    it('should post support messages and update ticket status', async () => {
      const message = await supportService.addMessage(
        'tick-1',
        'admin-1',
        'SUPPORT_ADMIN',
        'Here is your invoice link.',
      );

      expect(message.senderType).toBe('SUPPORT_ADMIN');
      expect(mockPrismaService.supportTicket.update).toHaveBeenCalled();
    });

    it('should provide searchable FAQ self-service help', () => {
      const faqs = supportService.getFaqKnowledgeBase('export');
      expect(faqs.length).toBeGreaterThan(0);
      expect(faqs[0]?.question).toContain('export');
    });
  });

  describe('5. Versioned Legal Policy Foundations', () => {
    it('should retrieve public legal documents with versioning and effective dates', () => {
      const terms = legalPolicyService.getTermsOfService();
      expect(terms.title).toBe('Terms of Service');
      expect(terms.version).toBeDefined();

      const aiPolicy = legalPolicyService.getAiTransparencyPolicy();
      expect(aiPolicy.sections.some((s) => s.heading.includes('Non-Guarantees'))).toBe(true);
    });
  });
});
