import { Test, TestingModule } from '@nestjs/testing';
import { OfferService } from './offer.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/services/notifications.service';

describe('OfferService', () => {
  let offerService: OfferService;

  const mockPrismaService = {
    recruiterProfile: {
      findUnique: jest.fn(),
    },
    offer: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockNotificationsService = {
    queueNotification: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OfferService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    offerService = module.get<OfferService>(OfferService);
  });

  it('should create draft offer in DRAFT status', async () => {
    mockPrismaService.recruiterProfile.findUnique.mockResolvedValue({ id: 'rec-1' });
    mockPrismaService.offer.create.mockResolvedValue({
      id: 'off-1',
      title: 'Backend Engineer Offer',
      status: 'DRAFT',
    });

    const offer = await offerService.createOffer('user-1', 'org-1', {
      jobId: 'job-1',
      candidateId: 'cand-1',
      title: 'Backend Engineer Offer',
      startDate: '2026-10-01T00:00:00Z',
      stipend: 5000,
      termsSummary: 'Standard 6-month internship terms',
      expirationDate: '2026-09-15T00:00:00Z',
    });

    expect(offer.status).toBe('DRAFT');
  });

  it('should send offer and queue notification to candidate', async () => {
    mockPrismaService.offer.findFirst.mockResolvedValue({
      id: 'off-1',
      candidateId: 'cand-1',
      status: 'DRAFT',
      title: 'Software Intern Offer',
      expirationDate: new Date('2026-09-15'),
    });
    mockPrismaService.offer.update.mockResolvedValue({
      id: 'off-1',
      status: 'SENT',
    });

    const res = await offerService.sendOffer('off-1', 'org-1', 'user-1');
    expect(res.status).toBe('SENT');
    expect(mockNotificationsService.queueNotification).toHaveBeenCalled();
  });
});
