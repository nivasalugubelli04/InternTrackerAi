import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { RecruiterOrgService } from '../services/recruiter-org.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RecruiterRole, RecruiterOrgVerificationStatus } from '@prisma/client';

const mockOrg = {
  id: 'org-uuid',
  name: 'TechCorp',
  type: 'ENTERPRISE',
  slug: 'techcorp',
};

const mockRecruiterOrg = {
  id: 'recruiter-org-uuid',
  organizationId: 'org-uuid',
  verificationStatus: RecruiterOrgVerificationStatus.PENDING,
  organization: mockOrg,
};

const mockProfile = {
  id: 'profile-uuid',
  userId: 'user-uuid',
  recruiterOrgId: 'recruiter-org-uuid',
  recruiterRole: RecruiterRole.RECRUITER,
  isVerified: false,
  isSuspended: false,
  recruiterOrg: mockRecruiterOrg,
};

describe('RecruiterOrgService', () => {
  let service: RecruiterOrgService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      organization: { findUnique: jest.fn() },
      recruiterOrganization: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      recruiterProfile: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      recruiterAuditEvent: { create: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecruiterOrgService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<RecruiterOrgService>(RecruiterOrgService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createRecruiterOrg', () => {
    it('should create a recruiter org linked to existing organization', async () => {
      prisma.organization.findUnique.mockResolvedValue(mockOrg);
      prisma.recruiterOrganization.findUnique.mockResolvedValue(null);
      prisma.recruiterOrganization.create.mockResolvedValue(mockRecruiterOrg);

      const result = await service.createRecruiterOrg({ organizationId: 'org-uuid' });
      expect(result).toEqual(mockRecruiterOrg);
      expect(prisma.recruiterOrganization.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ verificationStatus: 'PENDING' }),
        }),
      );
    });

    it('should throw NotFoundException if organization does not exist', async () => {
      prisma.organization.findUnique.mockResolvedValue(null);
      await expect(
        service.createRecruiterOrg({ organizationId: 'nonexistent' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if recruiter org already exists', async () => {
      prisma.organization.findUnique.mockResolvedValue(mockOrg);
      prisma.recruiterOrganization.findUnique.mockResolvedValue(mockRecruiterOrg);
      await expect(
        service.createRecruiterOrg({ organizationId: 'org-uuid' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('createRecruiterProfile', () => {
    it('should create a recruiter profile', async () => {
      prisma.recruiterProfile.findUnique.mockResolvedValue(null);
      prisma.recruiterOrganization.findUnique.mockResolvedValue(mockRecruiterOrg);
      prisma.recruiterProfile.create.mockResolvedValue(mockProfile);

      const result = await service.createRecruiterProfile({
        userId: 'user-uuid',
        recruiterOrgId: 'recruiter-org-uuid',
      });
      expect(result).toEqual(mockProfile);
    });

    it('should throw ConflictException if profile already exists', async () => {
      prisma.recruiterProfile.findUnique.mockResolvedValue(mockProfile);
      await expect(
        service.createRecruiterProfile({ userId: 'user-uuid', recruiterOrgId: 'org' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('RBAC', () => {
    it('hasRole should return true for matching role', () => {
      const profile = { recruiterRole: RecruiterRole.RECRUITER_ADMIN };
      expect(service.hasRole(profile, RecruiterRole.RECRUITER_ADMIN)).toBe(true);
    });

    it('assertAdminRole should throw for non-admin', () => {
      const profile = { recruiterRole: RecruiterRole.RECRUITER };
      expect(() => service.assertAdminRole(profile)).toThrow(ForbiddenException);
    });

    it('assertAdminRole should not throw for RECRUITER_ADMIN', () => {
      const profile = { recruiterRole: RecruiterRole.RECRUITER_ADMIN };
      expect(() => service.assertAdminRole(profile)).not.toThrow();
    });

    it('assertNotSuspended should throw if suspended', () => {
      expect(() => service.assertNotSuspended({ isSuspended: true })).toThrow(ForbiddenException);
    });
  });
});
