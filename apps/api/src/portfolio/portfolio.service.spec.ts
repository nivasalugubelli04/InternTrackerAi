import { Test, TestingModule } from '@nestjs/testing';
import { PortfolioService } from './portfolio.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/services/ai.service';
import { EntitlementService, BILLING_FEATURES } from '../billing/services/entitlement.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

const mockPrisma = {
  portfolio: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  profile: {
    findUnique: jest.fn(),
  },
};

const mockAiService = {
  optimizePortfolioContent: jest.fn(),
};

const mockEntitlementService = {
  enforceUsage: jest.fn(),
};

describe('PortfolioService', () => {
  let service: PortfolioService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortfolioService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AiService, useValue: mockAiService },
        { provide: EntitlementService, useValue: mockEntitlementService },
      ],
    }).compile();

    service = module.get<PortfolioService>(PortfolioService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPortfolio', () => {
    it('should return existing portfolio', async () => {
      const mockPort = { id: 'port-1', userId: 'user-1', visibility: 'PRIVATE' };
      mockPrisma.portfolio.findUnique.mockResolvedValueOnce(mockPort);

      const result = await service.getPortfolio('user-1');
      expect(result).toEqual(mockPort);
      expect(mockPrisma.portfolio.findUnique).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    });

    it('should create new private portfolio if not found', async () => {
      mockPrisma.portfolio.findUnique.mockResolvedValueOnce(null);
      const mockCreated = { id: 'port-1', userId: 'user-1', visibility: 'PRIVATE', username: 'user-user-1' };
      mockPrisma.portfolio.create.mockResolvedValueOnce(mockCreated);

      const result = await service.getPortfolio('user-1');
      expect(result).toEqual(mockCreated);
      expect(mockPrisma.portfolio.create).toHaveBeenCalled();
    });
  });

  describe('publishPortfolio', () => {
    it('should publish portfolio and set status to PUBLIC', async () => {
      const mockPort = { id: 'port-1', userId: 'user-1', visibility: 'PRIVATE', username: 'alice' };
      mockPrisma.portfolio.findUnique.mockResolvedValueOnce(mockPort);
      mockPrisma.portfolio.update.mockResolvedValueOnce({ ...mockPort, visibility: 'PUBLIC' });

      const result = await service.publishPortfolio('user-1', 'alice');
      expect(result.visibility).toBe('PUBLIC');
      expect(mockPrisma.portfolio.update).toHaveBeenCalledWith({
        where: { id: 'port-1' },
        data: { visibility: 'PUBLIC', username: 'alice' },
      });
    });

    it('should throw ConflictException if username is taken', async () => {
      const mockPort = { id: 'port-1', userId: 'user-1', visibility: 'PRIVATE', username: 'alice' };
      mockPrisma.portfolio.findUnique.mockImplementation(async (q: any) => {
        if (q.where.userId === 'user-1') return mockPort;
        if (q.where.username === 'bob') return { id: 'port-2', username: 'bob' };
        return null;
      });

      await expect(service.publishPortfolio('user-1', 'bob')).rejects.toThrow(ConflictException);
    });
  });

  describe('getPublicPortfolio', () => {
    it('should resolve public portfolio successfully', async () => {
      const mockPort = { id: 'port-1', username: 'alice', visibility: 'PUBLIC' };
      mockPrisma.portfolio.findUnique.mockResolvedValueOnce(mockPort);

      const result = await service.getPublicPortfolio('alice');
      expect(result).toEqual(mockPort);
    });

    it('should throw NotFoundException if portfolio is private', async () => {
      const mockPort = { id: 'port-1', username: 'alice', visibility: 'PRIVATE' };
      mockPrisma.portfolio.findUnique.mockResolvedValueOnce(mockPort);

      await expect(service.getPublicPortfolio('alice')).rejects.toThrow(NotFoundException);
    });
  });

  describe('optimizePortfolio', () => {
    it('should check limits and run AI suggestions', async () => {
      const mockPort = { id: 'port-1', userId: 'user-1', contentJson: { about: 'hello' } };
      mockPrisma.portfolio.findUnique.mockResolvedValueOnce(mockPort);
      mockPrisma.profile.findUnique.mockResolvedValueOnce({ id: 'prof-1' });
      mockAiService.optimizePortfolioContent.mockResolvedValueOnce({ score: 95 });

      const result = await service.optimizePortfolio('user-1');

      expect(mockEntitlementService.enforceUsage).toHaveBeenCalledWith('user-1', BILLING_FEATURES.PORTFOLIO_AI);
      expect(mockAiService.optimizePortfolioContent).toHaveBeenCalledWith('user-1', mockPort.contentJson, { id: 'prof-1' });
      expect(result).toEqual({ score: 95 });
    });
  });
});
