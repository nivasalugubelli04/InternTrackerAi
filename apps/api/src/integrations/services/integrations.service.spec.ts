import { Test, TestingModule } from '@nestjs/testing';
import { IntegrationProviderType, IntegrationStatus, ReviewStatus, ReviewMatchConfidence } from '@prisma/client';
import { CryptoService } from './crypto.service';
import { IntegrationFrameworkService } from './integration-framework.service';
import { DataNormalizationService } from './data-normalization.service';
import { DuplicateDetectionService } from './duplicate-detection.service';
import { ExternalReviewCenterService } from './external-review-center.service';
import { CareerDataSyncService } from './career-data-sync.service';
import { IntegrationSyncSchedulerService } from './integration-sync-scheduler.service';
import { GitHubProviderService } from '../providers/github-provider.service';
import { CalendarProviderService } from '../providers/calendar-provider.service';
import { DocumentImportService } from '../providers/document-import.service';
import { PortfolioLinkService } from '../providers/portfolio-link.service';
import { EmailSignalService } from '../providers/email-signal.service';
import { PrismaService } from '../../prisma/prisma.service';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockPrisma = {
  userIntegration: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
  },
  integrationCredential: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    deleteMany: jest.fn(),
  },
  integrationSync: {
    create: jest.fn(),
    update: jest.fn(),
  },
  externalDataRecord: {
    upsert: jest.fn(),
  },
  externalDataReview: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
  },
  integrationEventLog: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  portfolio: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  skill: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  skillEvidence: {
    create: jest.fn(),
  },
  careerEvent: {
    create: jest.fn(),
  },
  careerAction: {
    create: jest.fn(),
  },
  application: {
    findFirst: jest.fn(),
  },
  userSkill: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};

describe('Phase 44 External Integrations Suite', () => {
  let cryptoService: CryptoService;
  let frameworkService: IntegrationFrameworkService;
  let normalizationService: DataNormalizationService;
  let duplicateDetector: DuplicateDetectionService;
  let reviewCenter: ExternalReviewCenterService;
  let careerDataSync: CareerDataSyncService;
  let syncScheduler: IntegrationSyncSchedulerService;
  let githubProvider: GitHubProviderService;
  let calendarProvider: CalendarProviderService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CryptoService,
        IntegrationFrameworkService,
        DataNormalizationService,
        DuplicateDetectionService,
        ExternalReviewCenterService,
        CareerDataSyncService,
        IntegrationSyncSchedulerService,
        GitHubProviderService,
        CalendarProviderService,
        DocumentImportService,
        PortfolioLinkService,
        EmailSignalService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    cryptoService = module.get<CryptoService>(CryptoService);
    frameworkService = module.get<IntegrationFrameworkService>(IntegrationFrameworkService);
    normalizationService = module.get<DataNormalizationService>(DataNormalizationService);
    duplicateDetector = module.get<DuplicateDetectionService>(DuplicateDetectionService);
    reviewCenter = module.get<ExternalReviewCenterService>(ExternalReviewCenterService);
    careerDataSync = module.get<CareerDataSyncService>(CareerDataSyncService);
    syncScheduler = module.get<IntegrationSyncSchedulerService>(IntegrationSyncSchedulerService);
    githubProvider = module.get<GitHubProviderService>(GitHubProviderService);
    calendarProvider = module.get<CalendarProviderService>(CalendarProviderService);

    // Register providers in framework
    frameworkService.registerProvider(githubProvider);
    frameworkService.registerProvider(calendarProvider);
  });

  // ── 1. CryptoService Tests ──────────────────────────────────────────────────

  describe('CryptoService (AES-256-GCM)', () => {
    it('encrypts and decrypts string consistently', () => {
      const secret = 'gho_sensitive_access_token_12345';
      const cipherText = cryptoService.encrypt(secret);
      expect(cipherText).not.toBe(secret);
      expect(cipherText).toContain(':');

      const decrypted = cryptoService.decrypt(cipherText);
      expect(decrypted).toBe(secret);
    });

    it('returns empty string when encrypting/decrypting empty input', () => {
      expect(cryptoService.encrypt('')).toBe('');
      expect(cryptoService.decrypt('')).toBe('');
    });

    it('throws error for malformed cipher text', () => {
      expect(() => cryptoService.decrypt('invalid-cipher')).toThrow();
    });
  });

  // ── 2. IntegrationFrameworkService Tests ────────────────────────────────────

  describe('IntegrationFrameworkService', () => {
    it('returns provider status list with permission manifests', async () => {
      mockPrisma.userIntegration.findMany.mockResolvedValue([
        {
          id: 'int-1',
          userId: 'user-123',
          provider: IntegrationProviderType.GITHUB,
          status: IntegrationStatus.CONNECTED,
          scopes: ['read:user'],
          lastSyncedAt: new Date(),
        },
      ]);

      const result = await frameworkService.getProvidersStatus('user-123');
      expect(result.length).toBeGreaterThan(0);

      const gh = result.find((r) => r.manifest.provider === IntegrationProviderType.GITHUB);
      expect(gh).toBeDefined();
      expect(gh?.connection.status).toBe(IntegrationStatus.CONNECTED);
      expect(gh?.manifest.whatItWillNotDo.length).toBeGreaterThan(0);
    });

    it('connects integration and encrypts tokens', async () => {
      mockPrisma.userIntegration.upsert.mockResolvedValue({
        id: 'int-123',
        userId: 'user-123',
        provider: IntegrationProviderType.GITHUB,
        status: IntegrationStatus.CONNECTED,
      });

      mockPrisma.integrationCredential.upsert.mockResolvedValue({});
      mockPrisma.integrationEventLog.create.mockResolvedValue({});

      const integration = await frameworkService.connectIntegration('user-123', IntegrationProviderType.GITHUB, {
        code: 'mock_code',
      });

      expect(integration.id).toBe('int-123');
      expect(mockPrisma.integrationCredential.upsert).toHaveBeenCalledTimes(1);
      expect(mockPrisma.integrationEventLog.create).toHaveBeenCalledTimes(1);
    });

    it('disconnects integration and deletes stored credentials', async () => {
      mockPrisma.userIntegration.findFirst.mockResolvedValue({
        id: 'int-123',
        userId: 'user-123',
        provider: IntegrationProviderType.GITHUB,
      });

      mockPrisma.userIntegration.update.mockResolvedValue({});
      mockPrisma.integrationCredential.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.integrationEventLog.create.mockResolvedValue({});

      const result = await frameworkService.disconnectIntegration('user-123', 'int-123');
      expect(result.success).toBe(true);
      expect(mockPrisma.integrationCredential.deleteMany).toHaveBeenCalledWith({ where: { integrationId: 'int-123' } });
    });
  });

  // ── 3. DataNormalizationService Tests ──────────────────────────────────────

  describe('DataNormalizationService', () => {
    it('normalizes repository raw payload correctly', () => {
      const normalized = normalizationService.normalize('REPOSITORY' as any, {
        name: 'ai-recommendation',
        description: 'ML engine',
        language: 'Python',
        topics: ['pytorch', 'ml'],
        html_url: 'https://github.com/user/ai-rec',
        stargazers_count: 25,
      });

      expect(normalized['title']).toBe('ai-recommendation');
      expect(normalized['technologies']).toContain('Python');
      expect(normalized['technologies']).toContain('pytorch');
      expect(normalized['starCount']).toBe(25);
    });

    it('normalizes calendar event payload correctly', () => {
      const normalized = normalizationService.normalize('CALENDAR_EVENT' as any, {
        summary: 'Technical Interview — Stripe',
        description: 'Coding interview',
        start: { dateTime: '2026-09-01T10:00:00Z' },
      });

      expect(normalized['title']).toBe('Technical Interview — Stripe');
      expect(normalized['eventType']).toBe('INTERVIEW');
      expect(normalized['company']).toBe('Stripe');
    });
  });

  // ── 4. DuplicateDetectionService Tests ──────────────────────────────────────

  describe('DuplicateDetectionService', () => {
    it('returns EXACT_MATCH when repository URL matches existing project', async () => {
      mockPrisma.portfolio.findUnique.mockResolvedValue({
        contentJson: {
          projects: [
            { id: 'p1', title: 'AI Rec', githubUrl: 'https://github.com/user/ai-rec' },
          ],
        },
      });

      const result = await duplicateDetector.evaluate('user-123', 'REPOSITORY' as any, {
        title: 'ai-rec',
        repoUrl: 'https://github.com/user/ai-rec',
      });

      expect(result.matchConfidence).toBe(ReviewMatchConfidence.EXACT_MATCH);
      expect(result.suggestedAction).toBe('LINK_EXISTING_PROJECT');
    });

    it('returns NEW_RECORD when project is distinct', async () => {
      mockPrisma.portfolio.findUnique.mockResolvedValue({ contentJson: { projects: [] } });

      const result = await duplicateDetector.evaluate('user-123', 'REPOSITORY' as any, {
        title: 'New Distributed Database',
        repoUrl: 'https://github.com/user/new-db',
      });

      expect(result.matchConfidence).toBe(ReviewMatchConfidence.NEW_RECORD);
      expect(result.suggestedAction).toBe('CREATE_PROJECT');
    });
  });

  // ── 5. ExternalReviewCenterService Tests ────────────────────────────────────

  describe('ExternalReviewCenterService', () => {
    it('returns pending reviews queue', async () => {
      mockPrisma.externalDataReview.findMany.mockResolvedValue([
        {
          id: 'rev-1',
          userId: 'user-123',
          recordId: 'rec-1',
          status: ReviewStatus.PENDING,
          matchConfidence: ReviewMatchConfidence.NEW_RECORD,
          suggestedAction: 'CREATE_PROJECT',
          createdAt: new Date(),
          record: { recordType: 'REPOSITORY', rawJson: {}, normalizedJson: {} },
        },
      ]);

      const reviews = await reviewCenter.getPendingReviews('user-123');
      expect(reviews.length).toBe(1);
      expect(reviews[0]?.status).toBe(ReviewStatus.PENDING);
    });

    it('approves a review item', async () => {
      mockPrisma.externalDataReview.findFirst.mockResolvedValue({
        id: 'rev-1',
        userId: 'user-123',
        status: ReviewStatus.PENDING,
        suggestedAction: 'CREATE_PROJECT',
        record: { recordType: 'REPOSITORY', normalizedJson: { title: 'Test Repo' } },
      });

      mockPrisma.externalDataReview.update.mockResolvedValue({
        id: 'rev-1',
        status: ReviewStatus.APPROVED,
        record: { recordType: 'REPOSITORY', normalizedJson: { title: 'Test Repo' } },
      });

      mockPrisma.integrationEventLog.create.mockResolvedValue({});

      const updated = await reviewCenter.approveReview('user-123', 'rev-1');
      expect(updated.status).toBe(ReviewStatus.APPROVED);
    });
  });

  // ── 6. CareerDataSyncService Tests ──────────────────────────────────────────

  describe('CareerDataSyncService', () => {
    it('propagates approved project to Portfolio, SkillEvidence, and CareerAction', async () => {
      mockPrisma.portfolio.findUnique.mockResolvedValue(null);
      mockPrisma.portfolio.create.mockResolvedValue({});
      mockPrisma.skill.findFirst.mockResolvedValue(null);
      mockPrisma.skill.create.mockResolvedValue({ id: 'skill-1', name: 'Python' });
      mockPrisma.skillEvidence.create.mockResolvedValue({});
      mockPrisma.careerEvent.create.mockResolvedValue({});
      mockPrisma.careerAction.create.mockResolvedValue({});

      const res = await careerDataSync.propagateApprovedRecord('user-123', 'REPOSITORY' as any, {
        title: 'New AI Engine',
        description: 'Production AI model',
        technologies: ['Python'],
        repoUrl: 'https://github.com/user/ai-engine',
        evidenceType: 'PROJECT',
      });

      expect(res.success).toBe(true);
      expect(mockPrisma.portfolio.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.skillEvidence.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.careerAction.create).toHaveBeenCalledTimes(1);
    });
  });

  // ── 7. IntegrationSyncSchedulerService Tests ───────────────────────────────

  describe('IntegrationSyncSchedulerService', () => {
    it('triggers sync, normalizes items, and stages review queue records', async () => {
      mockPrisma.userIntegration.findUnique.mockResolvedValue({
        id: 'int-123',
        userId: 'user-123',
        provider: IntegrationProviderType.GITHUB,
        status: IntegrationStatus.CONNECTED,
      });

      mockPrisma.userIntegration.update.mockResolvedValue({});
      mockPrisma.integrationSync.create.mockResolvedValue({ id: 'sync-123' });
      mockPrisma.integrationSync.update.mockResolvedValue({});

      mockPrisma.integrationCredential.findUnique.mockResolvedValue({
        accessTokenEncrypted: cryptoService.encrypt('gho_mock_token'),
      });

      mockPrisma.externalDataRecord.upsert.mockResolvedValue({ id: 'rec-123' });
      mockPrisma.externalDataReview.upsert.mockResolvedValue({ id: 'rev-123' });
      mockPrisma.integrationEventLog.create.mockResolvedValue({});

      const result = await syncScheduler.triggerSync('user-123', IntegrationProviderType.GITHUB);

      expect(result.success).toBe(true);
      expect(result.itemsPendingReview).toBeGreaterThan(0);
      expect(mockPrisma.externalDataRecord.upsert).toHaveBeenCalled();
      expect(mockPrisma.externalDataReview.upsert).toHaveBeenCalled();
    });
  });
});
