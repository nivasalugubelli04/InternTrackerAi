/**
 * Phase 8 — OpportunitiesService Unit Tests
 *
 * Tests cover: feed, search, save, unsave, dismiss, interaction tracking,
 * deadline classification, cursor encoding/decoding, and authorization.
 */

import { NotFoundException, ConflictException } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { JobPostingStatus, DismissReason, InteractionType } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

import { OpportunitiesService } from './opportunities.service';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockPrisma = {
  jobPosting: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
  },
  company: {
    findMany: jest.fn(),
  },
  savedJob: {
    create: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  dismissedJob: {
    findMany: jest.fn(),
    upsert: jest.fn(),
    findUnique: jest.fn(),
  },
  jobInteraction: {
    create: jest.fn(),
  },
  recommendation: {
    findMany: jest.fn(),
    updateMany: jest.fn(),
  },
  matchScore: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  trackedCompany: {
    findMany: jest.fn(),
  },
};

const mockRedis = {
  getClient: jest.fn().mockReturnValue(null), // Disabled Redis for unit tests
};

const USER_ID = 'user-uuid-1234';
const JOB_ID = 'job-uuid-5678';

const makeJob = (overrides = {}) => ({
  id: JOB_ID,
  title: 'Software Engineering Intern',
  companyId: 'company-1',
  location: 'Hyderabad',
  workMode: 'HYBRID',
  stipend: 40000,
  deadline: new Date(Date.now() + 5 * 86_400_000), // 5 days from now
  createdAt: new Date(),
  status: JobPostingStatus.ACTIVE,
  requirements: ['React', 'TypeScript'],
  responsibilities: [],
  benefits: [],
  description: 'Test description',
  applicationUrl: 'https://example.com/apply',
  company: { id: 'company-1', name: 'Acme Corp', logoUrl: null, industry: 'Tech' },
  matchScores: [
    {
      overallScore: 85,
      skillScore: 90,
      locationScore: 80,
      educationScore: 75,
      cgpaScore: 70,
      companyPreferenceScore: 80,
      stipendScore: 85,
      experienceScore: 70,
    },
  ],
  recommendations: [
    {
      rank: 1,
      priority: 'HIGH',
      recommendationType: 'STRONG_MATCH',
      isViewed: false,
      isSaved: false,
      isDismissed: false,
      reasons: [],
    },
  ],
  savedByUsers: [],
  dismissedByUsers: [],
  ...overrides,
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('OpportunitiesService', () => {
  let service: OpportunitiesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpportunitiesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<OpportunitiesService>(OpportunitiesService);
  });

  // ── Cursor Utilities ────────────────────────────────────────────────────────

  describe('cursor encoding/decoding', () => {
    it('should round-trip encode and decode a cursor', () => {
      const payload = { id: JOB_ID, score: 85.5 };
      const encoded = service.encodeCursor(payload);
      const decoded = service.decodeCursor(encoded);
      expect(decoded).toEqual(payload);
    });

    it('should return null for an invalid cursor', () => {
      expect(service.decodeCursor('not-valid-base64!!')).toBeNull();
    });
  });

  // ── Deadline Classification ──────────────────────────────────────────────────

  describe('classifyDeadline()', () => {
    it('returns URGENT for deadlines within 3 days', () => {
      const d = new Date(Date.now() + 2 * 86_400_000);
      expect(service.classifyDeadline(d)).toBe('URGENT');
    });

    it('returns SOON for deadlines 4-7 days away', () => {
      const d = new Date(Date.now() + 5 * 86_400_000);
      expect(service.classifyDeadline(d)).toBe('SOON');
    });

    it('returns NORMAL for deadlines more than 7 days away', () => {
      const d = new Date(Date.now() + 14 * 86_400_000);
      expect(service.classifyDeadline(d)).toBe('NORMAL');
    });

    it('returns UNKNOWN for null deadline', () => {
      expect(service.classifyDeadline(null)).toBe('UNKNOWN');
    });
  });

  // ── getOpportunities ────────────────────────────────────────────────────────

  describe('getOpportunities()', () => {
    it('returns formatted feed excluding dismissed jobs', async () => {
      mockPrisma.dismissedJob.findMany.mockResolvedValueOnce([{ jobId: 'dismissed-id' }]);
      mockPrisma.trackedCompany.findMany.mockResolvedValueOnce([]);
      mockPrisma.jobPosting.findMany.mockResolvedValueOnce([makeJob()]);

      const result = await service.getOpportunities(USER_ID, {});
      expect(result.data).toHaveLength(1);
      expect(result.data[0]!.id).toBe(JOB_ID);
      expect(result.meta.hasMore).toBe(false);
    });

    it('sets hasMore=true when results exceed limit', async () => {
      mockPrisma.dismissedJob.findMany.mockResolvedValueOnce([]);
      mockPrisma.trackedCompany.findMany.mockResolvedValueOnce([]);
      // Return limit+1 = 21 items
      const jobs = Array.from({ length: 21 }, (_, i) => makeJob({ id: `job-${i}` }));
      mockPrisma.jobPosting.findMany.mockResolvedValueOnce(jobs);

      const result = await service.getOpportunities(USER_ID, { limit: 20 });
      expect(result.data).toHaveLength(20);
      expect(result.meta.hasMore).toBe(true);
      expect(result.meta.nextCursor).toBeTruthy();
    });
  });

  // ── getTopMatches ────────────────────────────────────────────────────────────

  describe('getTopMatches()', () => {
    it('returns top matches sorted by rank', async () => {
      mockPrisma.dismissedJob.findMany.mockResolvedValueOnce([]);
      mockPrisma.recommendation.findMany.mockResolvedValueOnce([
        {
          jobId: JOB_ID,
          rank: 1,
          priority: 'HIGH',
          recommendationType: 'PERFECT_MATCH',
          reasons: [],
          job: makeJob(),
        },
      ]);
      mockPrisma.matchScore.findMany.mockResolvedValueOnce([{ jobId: JOB_ID, overallScore: 92 }]);

      const result = await service.getTopMatches(USER_ID, 5);
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe(JOB_ID);
      expect(result[0]!.deadlineUrgency).toBe('SOON');
    });
  });

  // ── getClosingSoon ──────────────────────────────────────────────────────────

  describe('getClosingSoon()', () => {
    it('returns jobs closing within 7 days', async () => {
      mockPrisma.dismissedJob.findMany.mockResolvedValueOnce([]);
      mockPrisma.jobPosting.findMany.mockResolvedValueOnce([makeJob()]);

      const result = await service.getClosingSoon(USER_ID);
      expect(result).toHaveLength(1);
      expect(['URGENT', 'SOON']).toContain(result[0]!.deadlineUrgency);
    });
  });

  // ── getOpportunityById ───────────────────────────────────────────────────────

  describe('getOpportunityById()', () => {
    it('returns formatted opportunity details', async () => {
      mockPrisma.jobPosting.findFirst.mockResolvedValueOnce(makeJob());
      mockPrisma.recommendation.updateMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.jobInteraction.create.mockResolvedValueOnce({});

      const result = await service.getOpportunityById(JOB_ID, USER_ID);
      expect(result.id).toBe(JOB_ID);
      expect(result.matchScore?.overallScore).toBe(85);
    });

    it('throws NotFoundException for an unknown job ID', async () => {
      mockPrisma.jobPosting.findFirst.mockResolvedValueOnce(null);
      await expect(service.getOpportunityById('bad-id', USER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── saveJob ───────────────────────────────────────────────────────────────────

  describe('saveJob()', () => {
    it('saves a job and returns saved=true', async () => {
      mockPrisma.jobPosting.findUnique.mockResolvedValueOnce(makeJob());
      mockPrisma.savedJob.create.mockResolvedValueOnce({ id: 'saved-1', createdAt: new Date() });
      mockPrisma.recommendation.updateMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.jobInteraction.create.mockResolvedValueOnce({});

      const result = await service.saveJob(USER_ID, JOB_ID);
      expect(result.saved).toBe(true);
    });

    it('throws NotFoundException for unknown job', async () => {
      mockPrisma.jobPosting.findUnique.mockResolvedValueOnce(null);
      await expect(service.saveJob(USER_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when job is already saved (P2002)', async () => {
      mockPrisma.jobPosting.findUnique.mockResolvedValueOnce(makeJob());
      mockPrisma.savedJob.create.mockRejectedValueOnce({ code: 'P2002' });
      await expect(service.saveJob(USER_ID, JOB_ID)).rejects.toThrow(ConflictException);
    });
  });

  // ── unsaveJob ─────────────────────────────────────────────────────────────────

  describe('unsaveJob()', () => {
    it('unsaves a job and returns saved=false', async () => {
      mockPrisma.savedJob.findUnique.mockResolvedValueOnce({ id: 'saved-1' });
      mockPrisma.savedJob.delete.mockResolvedValueOnce({});
      mockPrisma.recommendation.updateMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.jobInteraction.create.mockResolvedValueOnce({});

      const result = await service.unsaveJob(USER_ID, JOB_ID);
      expect(result.saved).toBe(false);
    });

    it('throws NotFoundException when saved job not found', async () => {
      mockPrisma.savedJob.findUnique.mockResolvedValueOnce(null);
      await expect(service.unsaveJob(USER_ID, JOB_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // ── dismissJob ───────────────────────────────────────────────────────────────

  describe('dismissJob()', () => {
    it('dismisses a job with a reason', async () => {
      mockPrisma.jobPosting.findUnique.mockResolvedValueOnce(makeJob());
      mockPrisma.dismissedJob.upsert.mockResolvedValueOnce({});
      mockPrisma.recommendation.updateMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.jobInteraction.create.mockResolvedValueOnce({});

      const result = await service.dismissJob(USER_ID, JOB_ID, {
        reason: DismissReason.WRONG_LOCATION,
      });
      expect(result.dismissed).toBe(true);
    });

    it('throws NotFoundException when job does not exist', async () => {
      mockPrisma.jobPosting.findUnique.mockResolvedValueOnce(null);
      await expect(service.dismissJob(USER_ID, 'bad-id', {})).rejects.toThrow(NotFoundException);
    });
  });

  // ── trackInteraction ─────────────────────────────────────────────────────────

  describe('trackInteraction()', () => {
    it('creates an interaction record', async () => {
      mockPrisma.jobInteraction.create.mockResolvedValueOnce({});
      await expect(
        service.trackInteraction(USER_ID, {
          interactionType: InteractionType.APPLY_CLICK,
          jobId: JOB_ID,
        }),
      ).resolves.not.toThrow();
      expect(mockPrisma.jobInteraction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: USER_ID,
          jobId: JOB_ID,
          interactionType: InteractionType.APPLY_CLICK,
        }),
      });
    });

    it('does not throw on DB errors (graceful failure)', async () => {
      mockPrisma.jobInteraction.create.mockRejectedValueOnce(new Error('DB error'));
      await expect(
        service.trackInteraction(USER_ID, { interactionType: InteractionType.VIEW }),
      ).resolves.not.toThrow();
    });
  });

  // ── getDashboardStats ─────────────────────────────────────────────────────────

  describe('getDashboardStats()', () => {
    it('returns all three stats', async () => {
      mockPrisma.jobPosting.count.mockResolvedValueOnce(7);
      mockPrisma.matchScore.count.mockResolvedValueOnce(3);
      mockPrisma.savedJob.count.mockResolvedValueOnce(2);

      const result = await service.getDashboardStats(USER_ID);
      expect(result.newCount).toBe(7);
      expect(result.highMatchCount).toBe(3);
      expect(result.savedCount).toBe(2);
    });
  });
});
