import { Injectable, NotFoundException, Logger } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { CreateSupportTicketDto } from '../dto/privacy.dto';

export interface FaqItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  relatedActionUrl?: string;
}

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new user support ticket.
   */
  async createTicket(userId: string, dto: CreateSupportTicketDto) {
    const timestamp = new Date();
    const yearMonth = `${timestamp.getFullYear()}${String(timestamp.getMonth() + 1).padStart(2, '0')}`;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const ticketNumber = `TICK-${yearMonth}-${randomSuffix}`;

    const ticket = await this.prisma.supportTicket.create({
      data: {
        userId,
        ticketNumber,
        category: dto.category,
        priority: dto.priority || 'MEDIUM',
        status: 'OPEN',
        subject: dto.subject,
        description: dto.description,
        messages: {
          create: {
            senderUserId: userId,
            senderType: 'USER',
            message: dto.description,
            isInternalNote: false,
          },
        },
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    this.logger.log(`Created support ticket ${ticketNumber} for user ${userId}`);
    return ticket;
  }

  /**
   * Get all tickets for a specific user.
   */
  async getUserTickets(userId: string) {
    return this.prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        messages: {
          where: { isInternalNote: false },
          orderBy: { createdAt: 'asc' },
          include: {
            senderUser: {
              select: { id: true, firstName: true, lastName: true, role: true },
            },
          },
        },
      },
    });
  }

  /**
   * Get ticket details by ID.
   */
  async getTicketById(ticketId: string, userId?: string, isAdmin = false) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        messages: {
          where: isAdmin ? {} : { isInternalNote: false },
          orderBy: { createdAt: 'asc' },
          include: {
            senderUser: {
              select: { id: true, firstName: true, lastName: true, role: true },
            },
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    if (!isAdmin && userId && ticket.userId !== userId) {
      throw new NotFoundException('Support ticket not found');
    }

    return ticket;
  }

  /**
   * Add a reply or message to a ticket thread.
   */
  async addMessage(
    ticketId: string,
    senderUserId: string,
    senderType: 'USER' | 'SUPPORT_ADMIN' | 'SYSTEM',
    message: string,
    isInternalNote = false,
  ) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    const newMessage = await this.prisma.supportTicketMessage.create({
      data: {
        ticketId,
        senderUserId,
        senderType,
        message,
        isInternalNote,
      },
      include: {
        senderUser: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
    });

    // Update ticket status if appropriate
    const nextStatus = senderType === 'SUPPORT_ADMIN' ? 'WAITING_USER' : 'IN_PROGRESS';
    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: nextStatus },
    });

    return newMessage;
  }

  /**
   * Admin: List all tickets with filters.
   */
  async getAdminTickets(filters?: { category?: string; status?: string; priority?: string }) {
    const where: any = {};
    if (filters?.category) where.category = filters.category;
    if (filters?.status) where.status = filters.status;
    if (filters?.priority) where.priority = filters.priority;

    return this.prisma.supportTicket.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        _count: {
          select: { messages: true },
        },
      },
    });
  }

  /**
   * Admin: Resolve or update ticket status.
   */
  async updateTicketStatus(ticketId: string, status: string, resolutionSummary?: string) {
    return this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status,
        ...(resolutionSummary ? { resolutionSummary } : {}),
        ...(status === 'RESOLVED' || status === 'CLOSED' ? { resolvedAt: new Date() } : {}),
      },
    });
  }

  /**
   * Searchable FAQ knowledge base for self-service issue resolution.
   */
  getFaqKnowledgeBase(query?: string): FaqItem[] {
    const faqs: FaqItem[] = [
      {
        id: 'faq-1',
        category: 'AI & Career Recommendations',
        question: 'Does InternTracker AI guarantee job or internship placement?',
        answer:
          'No. InternTracker AI provides personalized market intelligence, resume scoring, skill gap analysis, and tailored recommendations. Final hiring decisions rest entirely with employer recruiters.',
        relatedActionUrl: '/transparency/ai-limitations',
      },
      {
        id: 'faq-2',
        category: 'Privacy & Data Protection',
        question: 'How do I export my personal career data and applications?',
        answer:
          'Navigate to Settings -> Privacy & Data -> Export Personal Data. You can generate and download a complete JSON archive of your profile, applications, saved jobs, and career preferences.',
        relatedActionUrl: '/privacy',
      },
      {
        id: 'faq-3',
        category: 'Privacy & Data Protection',
        question: 'What happens when I delete my account?',
        answer:
          'Account deletion enters a 14-day recovery grace period. After 14 days, all personal identifiers, resumes, and conversation history are permanently scrubbed. Billing subscriptions are canceled immediately.',
        relatedActionUrl: '/privacy',
      },
      {
        id: 'faq-4',
        category: 'Billing & Subscriptions',
        question: 'How do subscription renewals and cancellations work?',
        answer:
          'Subscriptions renew automatically at the end of each billing cycle. You can cancel anytime with zero penalty; your PRO access remains active until the end of your prepaid period with no data loss.',
        relatedActionUrl: '/billing',
      },
      {
        id: 'faq-5',
        category: 'Security & Trust',
        question: 'How do I report a security vulnerability or abuse concern?',
        answer:
          'Please submit a support ticket under the "SECURITY_REPORT" category or contact security@interntracker.ai directly for encrypted responsible disclosure handling.',
        relatedActionUrl: '/support',
      },
    ];

    if (!query) return faqs;

    const lowerQuery = query.toLowerCase();
    return faqs.filter(
      (f) =>
        f.question.toLowerCase().includes(lowerQuery) ||
        f.answer.toLowerCase().includes(lowerQuery) ||
        f.category.toLowerCase().includes(lowerQuery),
    );
  }
}
