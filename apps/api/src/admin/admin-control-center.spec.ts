import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

import { AdminPermission } from './enums/admin-permission.enum';
import { PermissionGuard } from './guards/permission.guard';
import { AdminAuditService } from './services/admin-audit.service';
import { AdminNotesService } from './services/admin-notes.service';
import { AiOpsService } from './services/ai-ops.service';
import { JobOpsService } from './services/job-ops.service';

describe('Phase 54 — Admin Control Center & Platform Operations Tests', () => {
  let notesService: AdminNotesService;
  let aiOpsService: AiOpsService;
  let jobOpsService: JobOpsService;
  let auditService: AdminAuditService;
  let permissionGuard: PermissionGuard;
  let reflector: Reflector;

  const mockPrismaService = {
    adminNote: {
      create: jest.fn().mockImplementation(({ data }) => ({
        id: 'note-1',
        ...data,
        createdAt: new Date(),
        authorAdmin: { id: data.authorAdminId, email: 'admin@interntracker.ai' },
      })),
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'note-1',
          targetType: 'USER',
          targetId: 'u-1',
          noteText: 'Support resolved account issue',
          isPinned: true,
          createdAt: new Date(),
          authorAdmin: { id: 'admin-1', email: 'admin@interntracker.ai' },
        },
      ]),
      findUnique: jest.fn().mockResolvedValue({ id: 'note-1', isPinned: false }),
      update: jest.fn().mockResolvedValue({ id: 'note-1', isPinned: true }),
      delete: jest.fn().mockResolvedValue({ id: 'note-1' }),
    },
    entitlementUsage: {
      findMany: jest.fn().mockResolvedValue([
        { feature: 'AI_COPILOT', usageCount: 450 },
        { feature: 'CAREER_SIMULATION', usageCount: 120 },
      ]),
    },
    adminAuditLog: {
      create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    incident: {
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({ id: 'inc-1', status: 'RESOLVED' }),
    },
    incidentEvent: {
      create: jest.fn().mockResolvedValue({ id: 'inc-ev-1' }),
    },
    user: {
      count: jest.fn().mockResolvedValue(100),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue({ id: 'u-1' }),
      update: jest.fn().mockResolvedValue({ id: 'u-1', isActive: false }),
    },
  };

  const mockRedisService = {
    getClient: jest.fn().mockReturnValue({}),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminNotesService,
        AiOpsService,
        JobOpsService,
        AdminAuditService,
        PermissionGuard,
        Reflector,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    notesService = module.get<AdminNotesService>(AdminNotesService);
    aiOpsService = module.get<AiOpsService>(AiOpsService);
    jobOpsService = module.get<JobOpsService>(JobOpsService);
    auditService = module.get<AdminAuditService>(AdminAuditService);
    permissionGuard = module.get<PermissionGuard>(PermissionGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  describe('1. Granular Admin RBAC & Permission Guard', () => {
    it('should allow SUPER_ADMIN full access unconditionally', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([AdminPermission.USER_SUSPEND]);

      const mockContext = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: { id: 'admin-super', role: 'SUPER_ADMIN' },
          }),
        }),
      } as unknown as ExecutionContext;

      expect(permissionGuard.canActivate(mockContext)).toBe(true);
    });

    it('should enforce role permission boundaries and block unauthorized roles', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([AdminPermission.USER_SUSPEND]);

      const mockContext = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: { id: 'support-1', role: 'SUPPORT_ADMIN' },
          }),
        }),
      } as unknown as ExecutionContext;

      expect(() => permissionGuard.canActivate(mockContext)).toThrow(ForbiddenException);
    });
  });

  describe('2. Internal Staff Admin Notes System', () => {
    it('should create and retrieve notes for a user account', async () => {
      const note = await notesService.createNote({
        targetType: 'USER',
        targetId: 'u-1',
        authorAdminId: 'admin-1',
        noteText: 'Investigated duplicate webhook event',
        isPinned: true,
      });

      expect(note.id).toBe('note-1');
      expect(mockPrismaService.adminNote.create).toHaveBeenCalled();

      const notes = await notesService.getNotesForTarget('USER', 'u-1');
      expect(notes.length).toBeGreaterThan(0);
      expect(notes[0]?.isPinned).toBe(true);
    });
  });

  describe('3. AI Operations & Telemetry Intelligence', () => {
    it('should aggregate AI request volume, latencies, and provider health', async () => {
      const telemetry = await aiOpsService.getAiOpsTelemetry();
      expect(telemetry.totalRequestsToday).toBeGreaterThan(0);
      expect(telemetry.overallSuccessRate).toBeGreaterThan(0.95);
      expect(telemetry.providerStatus['GEMINI']).toBeDefined();
      expect(telemetry.featuresHealth.length).toBeGreaterThan(0);
    });
  });

  describe('4. Background Job Operations & Safe Retry', () => {
    it('should retrieve queue overviews and allow safe retry for idempotent jobs', async () => {
      const queues = await jobOpsService.getQueuesOverview();
      expect(queues.length).toBeGreaterThan(0);

      const retryResult = await jobOpsService.retryJob('opportunity-scraper', 'job_fail_101');
      expect(retryResult.success).toBe(true);
    });
  });

  describe('5. Audit Trail & Incident Management', () => {
    it('should record administrative audit actions immutably', async () => {
      await auditService.logAction(
        'admin-1',
        'SUSPEND_USER',
        'USER',
        'u-1',
        { reason: 'Fraud check' },
        '127.0.0.1',
      );

      expect(mockPrismaService.adminAuditLog.create).toHaveBeenCalled();
    });
  });
});
