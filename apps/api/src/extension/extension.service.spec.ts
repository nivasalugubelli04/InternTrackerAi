import { Test, TestingModule } from '@nestjs/testing';
import { ExtensionService } from './extension.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/services/ai.service';
import { EntitlementService, BILLING_FEATURES } from '../billing/services/entitlement.service';
import { AuthService } from '../auth/auth.service';
const mockPrisma = {
  applicationAssistSession: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  applicationAssistField: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn(),
  },
  applicationAssistDraft: {
    create: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  resumeDocument: {
    findFirst: jest.fn(),
  },
  application: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

const mockAiService = {
  optimizePortfolioContent: jest.fn(),
};

const mockEntitlementService = {
  enforceUsage: jest.fn(),
};

const mockAuthService = {
  login: jest.fn(),
};

describe('ExtensionService', () => {
  let service: ExtensionService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExtensionService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AiService, useValue: mockAiService },
        { provide: EntitlementService, useValue: mockEntitlementService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    service = module.get<ExtensionService>(ExtensionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('connect', () => {
    it('should validate connection by checking login credentials', async () => {
      mockAuthService.login.mockResolvedValueOnce({ accessToken: 'token-123' });
      const result = await service.connect({ email: 'bob@example.com', password: 'password' });
      expect(result).toEqual({ accessToken: 'token-123' });
      expect(mockAuthService.login).toHaveBeenCalledWith(
        { email: 'bob@example.com', password: 'password' },
        undefined,
        undefined,
      );
    });
  });

  describe('createSession', () => {
    it('should initialize assistant session and check duplicate application', async () => {
      const mockSession = { id: 'sess-1', domain: 'lever.co', status: 'DETECTED' };
      mockPrisma.applicationAssistSession.create.mockResolvedValueOnce(mockSession);
      mockPrisma.application.findFirst.mockResolvedValueOnce({ id: 'app-1' });

      const result = await service.createSession('user-1', 'https://lever.co/job-1', 'job-1');

      expect(result.alreadyApplied).toBe(true);
      expect(result.session).toBe(mockSession);
      expect(mockPrisma.applicationAssistSession.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          jobId: 'job-1',
          domain: 'lever.co',
          url: 'https://lever.co/job-1',
          status: 'DETECTED',
          fieldsDetected: {},
          fieldsApproved: {},
          fieldsFilled: {},
          manualFields: {},
        },
      });
    });
  });

  describe('detectFields', () => {
    it('should flag sensitive questions and map canonical fields', async () => {
      const mockSession = { id: 'sess-1' };
      const mockUser = {
        id: 'user-1',
        firstName: 'Bob',
        lastName: 'Smith',
        email: 'bob@example.com',
        profile: { phone: '123456789', college: 'Harvard' },
        userSkills: [],
      };

      mockPrisma.applicationAssistSession.findFirst.mockResolvedValueOnce(mockSession);
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);
      mockPrisma.resumeDocument.findFirst.mockResolvedValueOnce(null);
      mockPrisma.applicationAssistField.create.mockImplementation((args) => Promise.resolve({ id: 'f-1', ...args.data }));

      const fields = [
        { fieldName: 'First Name', fieldType: 'text' },
        { fieldName: 'Visa sponsorship', fieldType: 'text' },
      ];

      const result = await service.detectFields('user-1', 'sess-1', fields);

      expect(result.suggestions.length).toBe(2);
      expect(result.suggestions[0].suggestedVal).toBe('Bob');
      expect(result.suggestions[1].suggestedVal).toBe(null); // Sensitive work auth question
      expect(result.suggestions[1].status).toBe('MANUAL_REQUIRED');
    });
  });

  describe('fieldSuggestions', () => {
    it('should generate draft text and check entitlements', async () => {
      mockPrisma.applicationAssistSession.findFirst.mockResolvedValueOnce({ id: 'sess-1' });
      mockPrisma.applicationAssistField.findFirst.mockResolvedValueOnce({ id: 'f-1' });
      mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'user-1', userSkills: [] });
      mockAiService.optimizePortfolioContent.mockResolvedValueOnce({ optimizedText: 'Drafted answer' });
      mockPrisma.applicationAssistDraft.create.mockResolvedValueOnce({ id: 'd-1', draftText: 'Drafted answer' });

      const result = await service.fieldSuggestions('user-1', 'sess-1', 'f-1', 'Why join us?');

      expect(mockEntitlementService.enforceUsage).toHaveBeenCalledWith('user-1', BILLING_FEATURES.PORTFOLIO_AI);
      expect(result.draftText).toBe('Drafted answer');
    });
  });

  describe('submissionConfirmation', () => {
    it('should change status to USER_SUBMITTED and update application tracker', async () => {
      mockPrisma.applicationAssistSession.findFirst.mockResolvedValueOnce({ id: 'sess-1', jobId: 'job-1', domain: 'lever.co' });
      mockPrisma.application.findFirst.mockResolvedValueOnce(null);
      mockPrisma.application.create.mockResolvedValueOnce({ id: 'app-1', status: 'APPLIED' });

      await service.submissionConfirmation('user-1', 'sess-1');

      expect(mockPrisma.applicationAssistSession.update).toHaveBeenCalledWith({
        where: { id: 'sess-1' },
        data: {
          status: 'USER_SUBMITTED',
          completedAt: expect.any(Date),
        },
      });
      expect(mockPrisma.application.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          jobId: 'job-1',
          status: 'APPLIED',
          appliedAt: expect.any(Date),
          notes: 'Submitted via Application Assistant on lever.co',
        },
      });
    });
  });
});
