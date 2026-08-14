import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { OrganizationType } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrganization(
    userId: string,
    data: { name: string; slug: string; type: OrganizationType },
  ) {
    const existing = await this.prisma.organization.findUnique({ where: { slug: data.slug } });
    if (existing) {
      throw new ConflictException('Organization slug already exists');
    }

    return this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: data.name,
          slug: data.slug,
          type: data.type,
          settings: {
            create: {},
          },
        },
      });

      // The creator becomes the OWNER
      await tx.organizationMember.create({
        data: {
          organizationId: org.id,
          userId,
          role: 'OWNER',
        },
      });

      return org;
    });
  }

  async getOrganization(orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: { settings: true },
    });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async updateOrganization(orgId: string, data: any) {
    return this.prisma.organization.update({
      where: { id: orgId },
      data,
    });
  }
}
