import { HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { FailoverAiProvider } from '../../ai/providers/failover-ai.provider';
import { GeminiProvider } from '../../ai/providers/gemini.provider';
import { OpenAIProvider } from '../../ai/providers/openai.provider';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

import { DeadLetterQueueService } from './dead-letter-queue.service';
import { HealthMonitorService } from './health-monitor.service';
import { IncidentManagerService } from './incident-manager.service';
import { QueueGuardService } from './queue-guard.service';
import { ScraperObserverService } from './scraper-observer.service';
import { SelfHealingService } from './self-healing.service';
import { TelemetryService } from './telemetry.service';

describe('Phase 29 — SRE & Autonomous Operations unit tests', () => {
  let telemetry: TelemetryService;
  let healthMonitor: HealthMonitorService;
  let scraperObserver: ScraperObserverService;
  let queueGuard: QueueGuardService;
  let incidentManager: IncidentManagerService;
  let selfHealing: SelfHealingService;
  let dlq: DeadLetterQueueService;
  let failoverAiProvider: FailoverAiProvider;

  const mockPrismaService = {
    healthSnapshot: {
      count: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    incident: {
      count: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    incidentEvent: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    sreAlert: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    recoveryAction: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    systemComponent: {
      upsert: jest.fn(),
    },
    jobPosting: {
      count: jest.fn(),
    },
    parserHealth: {
      findMany: jest.fn(),
    },
    company: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
    deadLetterJob: {
      create: jest.fn(),
    },
    systemThreshold: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    isHealthy: jest.fn(),
  };

  const mockRedisService = {
    isHealthy: jest.fn(),
    getClient: jest.fn().mockReturnValue({
      ping: jest.fn().mockResolvedValue('PONG'),
    }),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key) => {
      if (key === 'ai') {
        return {
          provider: 'gemini',
          model: 'gemini-1.5-flash',
          apiKey: 'test-key',
        };
      }
      if (key === 'notifications') {
        return {
          sendgridApiKey: 'test-sg-key',
          fcmProjectId: 'test-fcm-project',
        };
      }
      return null;
    }),
  };

  const mockNotificationsService = {
    queueNotification: jest.fn().mockResolvedValue(true),
  };

  const mockGeminiProvider = {
    generateText: jest.fn(),
    generateStructuredOutput: jest.fn(),
  };

  const mockOpenAIProvider = {
    generateText: jest.fn(),
    generateStructuredOutput: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelemetryService,
        HealthMonitorService,
        ScraperObserverService,
        QueueGuardService,
        IncidentManagerService,
        SelfHealingService,
        DeadLetterQueueService,
        FailoverAiProvider,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: GeminiProvider, useValue: mockGeminiProvider },
        { provide: OpenAIProvider, useValue: mockOpenAIProvider },
      ],
    }).compile();

    telemetry = module.get<TelemetryService>(TelemetryService);
    healthMonitor = module.get<HealthMonitorService>(HealthMonitorService);
    scraperObserver = module.get<ScraperObserverService>(ScraperObserverService);
    queueGuard = module.get<QueueGuardService>(QueueGuardService);
    incidentManager = module.get<IncidentManagerService>(IncidentManagerService);
    selfHealing = module.get<SelfHealingService>(SelfHealingService);
    dlq = module.get<DeadLetterQueueService>(DeadLetterQueueService);
    failoverAiProvider = module.get<FailoverAiProvider>(FailoverAiProvider);

    jest.clearAllMocks();
    expect(queueGuard).toBeDefined();
    expect(dlq).toBeDefined();
  });

  describe('TelemetryService', () => {
    it('should calculate Platform Score correctly from snapshots and penalty rules', async () => {
      mockPrismaService.healthSnapshot.count.mockImplementation((dto: any) => {
        if (dto.where.status === 'HEALTHY') return Promise.resolve(90);
        return Promise.resolve(100);
      });
      mockPrismaService.healthSnapshot.findMany.mockResolvedValue([
        { latency: 10, errorRate: 0.05 },
        { latency: 20, errorRate: 0.02 },
      ]);
      mockPrismaService.incident.count.mockResolvedValue(1); // 1 critical incident = 15 penalty

      const score = await telemetry.getPlatformScore();
      expect(score.overallScore).toBeLessThanOrEqual(100);
      expect(score.breakdown['availability']?.value).toBe(90);
      expect(score.breakdown['incidentPenalty']?.value).toBe(-15);
    });

    it('should calculate Data Quality Score from incomplete fields and parser success', async () => {
      mockPrismaService.jobPosting.count.mockResolvedValue(100);
      mockPrismaService.parserHealth.findMany.mockResolvedValue([
        { successRate: 95.0 },
        { successRate: 85.0 },
      ]);
      mockPrismaService.company.count.mockImplementation((dto: any) => {
        if (dto?.where?.lastCheckedAt) return Promise.resolve(8);
        return Promise.resolve(10);
      });

      const dq = await telemetry.getDataQualityScore();
      expect(dq.overallScore).toBeDefined();
      expect(dq.breakdown['completeness']?.value).toBe(100);
      expect(dq.breakdown['parserSuccess']?.value).toBe(90);
      expect(dq.breakdown['freshness']?.value).toBe(80);
    });
  });

  describe('HealthMonitorService', () => {
    it('should run database, redis and storage write checks successfully', async () => {
      mockPrismaService.isHealthy.mockResolvedValue(true);
      mockRedisService.isHealthy.mockResolvedValue(true);

      const checks = await healthMonitor.runHealthChecks();
      expect(checks.length).toBeGreaterThan(0);
      expect(checks.find((c) => c.name === 'DATABASE')!.status).toBe('HEALTHY');
      expect(checks.find((c) => c.name === 'REDIS')!.status).toBe('HEALTHY');
      expect(checks.find((c) => c.name === 'STORAGE')!.status).toBe('HEALTHY');
    });
  });

  describe('ScraperObserverService', () => {
    it('should map active scrapers and flag stale collection windows', async () => {
      mockPrismaService.company.findMany.mockResolvedValue([
        {
          id: 'company-1',
          name: 'Google',
          isActive: true,
          parserHealth: {
            successRate: 90.0,
            lastSuccess: new Date(Date.now() - 30 * 60 * 60 * 1000), // > 24 hours (stale)
          },
          scrapeJobs: [
            {
              startedAt: new Date(),
              status: 'COMPLETED',
              jobsFound: 10,
              jobsAdded: 2,
              errorMessage: null,
            },
          ],
        },
      ]);

      const scrapers = await scraperObserver.getScrapersStatus();
      expect(scrapers.length).toBe(1);
      expect(scrapers[0]?.companyName).toBe('Google');
      expect(scrapers[0]?.status).toBe('STALE');
      expect(scrapers[0]?.duplicateRate).toBe(80);
    });
  });

  describe('IncidentManagerService', () => {
    it('should correlate secondary incidents under active root database incidents', async () => {
      // Simulate Database Incident already active
      mockPrismaService.incident.findFirst.mockResolvedValue({
        id: 'db-incident-1',
        component: 'DATABASE',
      });
      mockPrismaService.incidentEvent.create.mockResolvedValue({ id: 'evt-1' });

      // Triggering an API error should result in correlated event log rather than new incident
      const res = await incidentManager.triggerIncident(
        'API error 500',
        'P1',
        'API',
        'Database connection timed out',
      );

      expect(res).toBeDefined();
      expect(mockPrismaService.incident.create).not.toHaveBeenCalled();
      expect(mockPrismaService.incidentEvent.create).toHaveBeenCalled();
    });

    it('should deduplicate alerts and respect 30 minutes cooldown periods', async () => {
      mockPrismaService.incident.findFirst.mockResolvedValue(null); // No active DB incident
      mockPrismaService.sreAlert.findFirst.mockResolvedValue({
        id: 'recent-alert-id',
        status: 'SENT',
      }); // Alert already sent inside cooldown

      await incidentManager.triggerIncident(
        'Database connection lost',
        'P0',
        'DATABASE',
        'Error during ping',
      );

      // SreAlert should be created in status COOLDOWN, not SENT
      expect(mockPrismaService.sreAlert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'COOLDOWN',
          }),
        }),
      );
    });
  });

  describe('SelfHealingService', () => {
    it('should queue risky recovery actions for SRE manual approval', async () => {
      mockPrismaService.systemThreshold.findUnique.mockResolvedValue({ value: 'false' }); // Safe Mode off
      mockPrismaService.recoveryAction.create.mockResolvedValue({ id: 'rec-action-1' });

      const healing = await selfHealing.triggerHealing(
        'DATABASE_DELETE', // Risky action
        'DATABASE',
        'Storage limit exceeded',
        async () => 'mock run',
      );

      expect(healing.success).toBe(false);
      expect(healing.requiresApproval).toBe(true);
      expect(mockPrismaService.recoveryAction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isApproved: false,
          }),
        }),
      );
    });

    it('should queue safe actions when SRE Safe Mode is active', async () => {
      mockPrismaService.systemThreshold.findUnique.mockResolvedValue({ value: 'true' }); // Safe Mode on
      mockPrismaService.recoveryAction.create.mockResolvedValue({ id: 'rec-action-2' });

      const healing = await selfHealing.triggerHealing(
        'CLEAR_REDIS_CACHE', // Safe action normally, but Safe Mode is ON
        'REDIS',
        'Stale items detected',
        async () => 'mock run',
      );

      expect(healing.success).toBe(false);
      expect(healing.requiresApproval).toBe(true);
    });
  });

  describe('FailoverAiProvider', () => {
    it('should route text generation calls to fallback provider if primary fails', async () => {
      mockGeminiProvider.generateText.mockRejectedValue(
        new HttpException('Capacity reached', HttpStatus.SERVICE_UNAVAILABLE),
      );
      mockOpenAIProvider.generateText.mockResolvedValue({
        text: 'Fallback result content',
        usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
        model: 'gpt-4o-mini',
      });
      mockPrismaService.incident.create.mockResolvedValue({ id: 'inc-failover-1' });

      const result = await failoverAiProvider.generateText('Evaluate resumes');
      expect(result.text).toBe('Fallback result content');
      expect(mockOpenAIProvider.generateText).toHaveBeenCalled();
      expect(mockPrismaService.incident.create).toHaveBeenCalled();
    });
  });
});
