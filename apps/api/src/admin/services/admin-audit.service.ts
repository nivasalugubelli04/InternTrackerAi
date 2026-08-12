import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminAuditService {
  private readonly logger = new Logger(AdminAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async logAction(
    adminUserId: string,
    action: string,
    resourceType: string,
    resourceId?: string,
    metadata?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string,
  ) {
    try {
      await this.prisma.adminAuditLog.create({
        data: {
          adminUserId,
          action,
          resourceType,
          resourceId: resourceId ?? null,
          metadata: metadata ? (metadata as any) : undefined,
          ipAddress: ipAddress ?? null,
          userAgent: userAgent ?? null,
        },
      });
    } catch (error) {
      // Don't fail the request if audit logging fails, but log it critically
      this.logger.error(
        `Failed to create audit log for admin ${adminUserId}, action: ${action}`,
        error,
      );
    }
  }

  async getLogs(
    page = 1,
    limit = 50,
    filters?: { adminUserId?: string; resourceType?: string; action?: string },
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters?.adminUserId) where.adminUserId = filters.adminUserId;
    if (filters?.resourceType) where.resourceType = filters.resourceType;
    if (filters?.action) where.action = filters.action;

    const [data, total] = await Promise.all([
      this.prisma.adminAuditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          adminUser: {
            select: { email: true, firstName: true, lastName: true },
          },
        },
      }),
      this.prisma.adminAuditLog.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
