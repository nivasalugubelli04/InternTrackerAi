import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CandidateDiscoveryService } from '../services/candidate-discovery.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RecruiterOrgService } from '../services/recruiter-org.service';
import { RecruiterDiscoverabilityLevel } from '@prisma/client';

const mockConsentedCandidate = {
  id: 'candidate-uuid',
  discoverabilitySettings: {
    discoverabilityLevel: RecruiterDiscoverabilityLevel.VERIFIED_RECRUITERS,
    resumeVisible: true,
    profileVisible: true,
    specificCompanyIds: [],
  },
  firstName: 'Alice',
  lastName: 'Dev',
  profile: { headline: 'Software Engineer', location: 'Bangalore', experienceLevel: 'INTERN' },
  userSkills: [{ skill: { name: 'Python', category: 'AI_ML' }, proficiencyLevel: 'ADVANCED' }],
  careerPreference: { preferredRoles: ['Software Engineer'] },
};

const mockVerifiedOrg = {
  id: 'recruiter-org-uuid',
  verificationStatus: 'VERIFIED',
};

describe('CandidateDiscoveryService', () => {
  let service: CandidateDiscoveryService;
  let prisma: any;
  let recruiterOrgService: any;

  beforeEach(async () => {
    prisma = {
      user: { findMany: jest.fn(), findUnique: jest.fn(), count: jest.fn() },
      recruiterDiscoverabilitySettings: { findUnique: jest.fn() },
      recruiterOrganization: { findUnique: jest.fn() },
    };

    recruiterOrgService = {
      logAudit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CandidateDiscoveryService,
        { provide: PrismaService, useValue: prisma },
        { provide: RecruiterOrgService, useValue: recruiterOrgService },
      ],
    }).compile();

    service = module.get<CandidateDiscoveryService>(CandidateDiscoveryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('searchCandidates', () => {
    it('should return paginated consented candidates', async () => {
      prisma.user.findMany.mockResolvedValue([mockConsentedCandidate]);
      prisma.user.count.mockResolvedValue(1);

      const result = await service.searchCandidates('org-id', 'recruiter-user-id', {});
      expect(result.candidates).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      // Should return sanitized candidate card — no email or phone
      expect(result.candidates[0]).not.toHaveProperty('email');
      expect(result.candidates[0]).not.toHaveProperty('passwordHash');
    });

    it('should log audit event for candidate search', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      await service.searchCandidates('org-id', 'recruiter-user-id', {});
      expect(recruiterOrgService.logAudit).toHaveBeenCalledWith(
        'recruiter-user-id',
        'CANDIDATE_SEARCH',
        'CandidateSearch',
        undefined,
        'org-id',
        expect.any(Object),
      );
    });
  });

  describe('getCandidateProfile', () => {
    it('should throw NotFoundException for PRIVATE candidate', async () => {
      prisma.recruiterDiscoverabilitySettings.findUnique.mockResolvedValue({
        discoverabilityLevel: RecruiterDiscoverabilityLevel.PRIVATE,
      });
      await expect(
        service.getCandidateProfile('candidate-id', 'org-id', 'recruiter-user-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return candidate profile for VERIFIED_RECRUITERS when org is verified', async () => {
      prisma.recruiterDiscoverabilitySettings.findUnique.mockResolvedValue(
        mockConsentedCandidate.discoverabilitySettings,
      );
      prisma.recruiterOrganization.findUnique.mockResolvedValue(mockVerifiedOrg);
      prisma.user.findUnique.mockResolvedValue(mockConsentedCandidate);

      const result = await service.getCandidateProfile(
        'candidate-uuid',
        'recruiter-org-uuid',
        'recruiter-user-id',
      );
      expect(result).toBeDefined();
      expect(result).not.toHaveProperty('email');
      expect(result).not.toHaveProperty('passwordHash');
      expect(recruiterOrgService.logAudit).toHaveBeenCalledWith(
        'recruiter-user-id',
        'CANDIDATE_VIEWED',
        'User',
        'candidate-uuid',
        'recruiter-org-uuid',
      );
    });

    it('should throw NotFoundException for VERIFIED_RECRUITERS when org is not verified', async () => {
      prisma.recruiterDiscoverabilitySettings.findUnique.mockResolvedValue({
        discoverabilityLevel: RecruiterDiscoverabilityLevel.VERIFIED_RECRUITERS,
        profileVisible: true,
      });
      prisma.recruiterOrganization.findUnique.mockResolvedValue({
        verificationStatus: 'PENDING',
      });

      await expect(
        service.getCandidateProfile('candidate-id', 'unverified-org-id', 'recruiter-user-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
