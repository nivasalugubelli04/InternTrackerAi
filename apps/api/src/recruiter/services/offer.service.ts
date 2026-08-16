import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OfferStatus } from '@prisma/client';
import { NotificationChannel, NotificationType } from '../../notifications/enums/notification.enums';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateOfferDto {
  jobId: string;
  candidateId: string;
  title: string;
  startDate: string; // ISO String
  endDate?: string;
  stipend: number;
  currency?: string;
  location?: string;
  workMode?: string;
  termsSummary: string;
  expirationDate: string; // ISO String
}

@Injectable()
export class OfferService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createOffer(userId: string, recruiterOrgId: string, dto: CreateOfferDto) {
    const profile = await this.prisma.recruiterProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Recruiter profile not found');

    const offer = await this.prisma.offer.create({
      data: {
        jobId: dto.jobId,
        candidateId: dto.candidateId,
        recruiterOrgId,
        createdBy: profile.id,
        title: dto.title,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        stipend: dto.stipend,
        currency: dto.currency || 'USD',
        location: dto.location ?? null,
        workMode: dto.workMode || 'HYBRID',
        termsSummary: dto.termsSummary,
        expirationDate: new Date(dto.expirationDate),
        status: OfferStatus.DRAFT,
        events: {
          create: {
            eventType: 'CREATED',
            actorId: userId,
          },
        },
      },
      include: { job: true, candidate: true },
    });

    return offer;
  }

  async listOffers(recruiterOrgId: string) {
    return this.prisma.offer.findMany({
      where: { recruiterOrgId },
      include: {
        candidate: { select: { id: true, firstName: true, lastName: true, email: true } },
        job: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOffer(id: string, recruiterOrgId?: string) {
    const offer = await this.prisma.offer.findFirst({
      where: { id, ...(recruiterOrgId ? { recruiterOrgId } : {}) },
      include: {
        candidate: { select: { id: true, firstName: true, lastName: true, email: true } },
        job: true,
        events: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!offer) throw new NotFoundException('Offer not found');
    return offer;
  }

  async sendOffer(id: string, recruiterOrgId: string, userId: string) {
    const offer = await this.getOffer(id, recruiterOrgId);

    if (offer.status !== OfferStatus.DRAFT && offer.status !== OfferStatus.PENDING_APPROVAL) {
      throw new BadRequestException(`Cannot send offer in status ${offer.status}`);
    }

    const updated = await this.prisma.offer.update({
      where: { id },
      data: {
        status: OfferStatus.SENT,
        events: {
          create: {
            eventType: 'SENT',
            actorId: userId,
          },
        },
      },
    });

    // Notify candidate via Phase 6 Notification Engine
    await this.notificationsService.queueNotification({
      userId: offer.candidateId,
      type: NotificationType.INSTANT_ALERT,
      title: `Official Job Offer Received: ${offer.title}`,
      message: `Congratulations! You have received an official offer for "${offer.title}". Expiration Date: ${offer.expirationDate.toLocaleDateString()}.`,
      channel: NotificationChannel.EMAIL,
    });

    return updated;
  }

  async withdrawOffer(id: string, recruiterOrgId: string, userId: string) {
    const offer = await this.getOffer(id, recruiterOrgId);

    const updated = await this.prisma.offer.update({
      where: { id },
      data: {
        status: OfferStatus.WITHDRAWN,
        withdrawnAt: new Date(),
        events: {
          create: {
            eventType: 'WITHDRAWN',
            actorId: userId,
          },
        },
      },
    });

    await this.notificationsService.queueNotification({
      userId: offer.candidateId,
      type: NotificationType.INSTANT_ALERT,
      title: `Offer Update: ${offer.title}`,
      message: `The offer for "${offer.title}" has been withdrawn by the employer.`,
      channel: NotificationChannel.EMAIL,
    });

    return updated;
  }

  /**
   * Cron/Periodic task to check and mark expired offers.
   */
  async checkOfferExpirations() {
    const now = new Date();
    const expiredOffers = await this.prisma.offer.findMany({
      where: {
        status: OfferStatus.SENT,
        expirationDate: { lt: now },
      },
    });

    for (const offer of expiredOffers) {
      await this.prisma.offer.update({
        where: { id: offer.id },
        data: {
          status: OfferStatus.EXPIRED,
          events: {
            create: {
              eventType: 'EXPIRED',
              actorId: '00000000-0000-0000-0000-000000000000',
            },
          },
        },
      });

      await this.notificationsService.queueNotification({
        userId: offer.candidateId,
        type: NotificationType.INSTANT_ALERT,
        title: `Offer Expired: ${offer.title}`,
        message: `The offer for "${offer.title}" has expired.`,
        channel: NotificationChannel.EMAIL,
      });
    }

    return { processed: expiredOffers.length };
  }
}
