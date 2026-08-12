import { Injectable, NotFoundException } from '@nestjs/common';
import type { Company, CompanyCategory } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

export interface CompanySearchParams {
  q?: string;
  category?: string;
  industry?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: CompanySearchParams) {
    const { q, category, industry, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: any = { isActive: true };

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where.categories = {
        some: { id: category },
      };
    }

    if (industry) {
      where.industry = industry;
    }

    const [total, companies] = await Promise.all([
      this.prisma.company.count({ where }),
      this.prisma.company.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { name: 'asc' },
        include: {
          categories: true,
          tags: true,
        },
      }),
    ]);

    return {
      data: companies,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getCategories(): Promise<CompanyCategory[]> {
    return this.prisma.companyCategory.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string): Promise<Company> {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        categories: true,
        tags: true,
      },
    });

    if (!company) {
      throw new NotFoundException(`Company with ID ${id} not found`);
    }

    return company;
  }
}
