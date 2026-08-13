import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminFeatureFlagsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.featureFlag.findMany({
      orderBy: { key: 'asc' },
      include: {
        updatedByAdmin: {
          select: { email: true, firstName: true },
        },
      },
    });
  }

  async create(data: {
    key: string;
    isEnabled: boolean;
    description?: string;
    updatedByAdminId: string;
  }) {
    const existing = await this.prisma.featureFlag.findUnique({ where: { key: data.key } });
    if (existing) throw new ConflictException('Feature flag already exists');

    return this.prisma.featureFlag.create({ data });
  }

  async update(
    id: string,
    data: { isEnabled?: boolean; description?: string; updatedByAdminId: string },
  ) {
    const flag = await this.prisma.featureFlag.findUnique({ where: { id } });
    if (!flag) throw new NotFoundException('Feature flag not found');

    return this.prisma.featureFlag.update({
      where: { id },
      data,
    });
  }
}
