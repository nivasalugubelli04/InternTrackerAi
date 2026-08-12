/**
 * Phase 8 — OpportunitiesController Unit Tests
 */

import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { InteractionType, DismissReason } from '@prisma/client';

import { OpportunitiesController } from './opportunities.controller';
import { OpportunitiesService } from './opportunities.service';

const mockService = {
  getDashboardStats: jest.fn(),
  getTopMatches: jest.fn(),
  getNewOpportunities: jest.fn(),
  getClosingSoon: jest.fn(),
  getTrackedCompanyOpportunities: jest.fn(),
  getSavedOpportunities: jest.fn(),
  getFilters: jest.fn(),
  search: jest.fn(),
  getOpportunities: jest.fn(),
  saveJob: jest.fn(),
  unsaveJob: jest.fn(),
  dismissJob: jest.fn(),
  trackInteraction: jest.fn(),
  getOpportunityById: jest.fn(),
};

const USER = { sub: 'user-uuid-1', email: 'test@test.com', role: 'USER' };

describe('OpportunitiesController', () => {
  let controller: OpportunitiesController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OpportunitiesController],
      providers: [{ provide: OpportunitiesService, useValue: mockService }],
    }).compile();
    controller = module.get<OpportunitiesController>(OpportunitiesController);
  });

  it('getDashboardStats calls service with userId', async () => {
    mockService.getDashboardStats.mockResolvedValueOnce({
      newCount: 5,
      highMatchCount: 3,
      savedCount: 2,
    });
    const result = await controller.getDashboardStats(USER as any);
    expect(mockService.getDashboardStats).toHaveBeenCalledWith(USER.sub);
    expect(result.newCount).toBe(5);
  });

  it('getTopMatches calls service with userId and limit', async () => {
    mockService.getTopMatches.mockResolvedValueOnce([]);
    await controller.getTopMatches(USER as any, 5);
    expect(mockService.getTopMatches).toHaveBeenCalledWith(USER.sub, 5);
  });

  it('getNewOpportunities defaults limit to 10', async () => {
    mockService.getNewOpportunities.mockResolvedValueOnce([]);
    await controller.getNewOpportunities(USER as any, undefined);
    expect(mockService.getNewOpportunities).toHaveBeenCalledWith(USER.sub, 10);
  });

  it('search passes query and limit to service', async () => {
    mockService.search.mockResolvedValueOnce({ data: [], meta: { total: 0 } });
    await controller.search(USER as any, 'React internship', 15);
    expect(mockService.search).toHaveBeenCalledWith(USER.sub, 'React internship', 15);
  });

  it('saveJob calls service with userId and jobId', async () => {
    mockService.saveJob.mockResolvedValueOnce({ saved: true });
    const result = await controller.saveJob(USER as any, 'job-uuid');
    expect(mockService.saveJob).toHaveBeenCalledWith(USER.sub, 'job-uuid');
    expect(result.saved).toBe(true);
  });

  it('unsaveJob calls service with userId and jobId', async () => {
    mockService.unsaveJob.mockResolvedValueOnce({ saved: false });
    const result = await controller.unsaveJob(USER as any, 'job-uuid');
    expect(mockService.unsaveJob).toHaveBeenCalledWith(USER.sub, 'job-uuid');
    expect(result.saved).toBe(false);
  });

  it('dismissJob calls service with userId, jobId, and dto', async () => {
    mockService.dismissJob.mockResolvedValueOnce({ dismissed: true });
    const dto = { reason: DismissReason.NOT_RELEVANT };
    await controller.dismissJob(USER as any, 'job-uuid', dto);
    expect(mockService.dismissJob).toHaveBeenCalledWith(USER.sub, 'job-uuid', dto);
  });

  it('trackInteraction calls service with userId and dto', async () => {
    mockService.trackInteraction.mockResolvedValueOnce(undefined);
    const dto = { interactionType: InteractionType.APPLY_CLICK, jobId: 'job-uuid' };
    await controller.trackInteraction(USER as any, dto);
    expect(mockService.trackInteraction).toHaveBeenCalledWith(USER.sub, dto);
  });

  it('getOpportunityById calls service with id and userId', async () => {
    mockService.getOpportunityById.mockResolvedValueOnce({ id: 'job-uuid' });
    const result = await controller.getOpportunityById(USER as any, 'job-uuid');
    expect(mockService.getOpportunityById).toHaveBeenCalledWith('job-uuid', USER.sub);
    expect(result.id).toBe('job-uuid');
  });
});
