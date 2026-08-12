import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { SCRAPE_QUEUE } from '../../queues/queue.constants';

@Injectable()
export class AdminCompaniesService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(SCRAPE_QUEUE) private readonly scraperQueue: Queue,
  ) {}

  async findAll(page = 1, limit = 50, filters?: { search?: string; isActive?: boolean }) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters?.search) {
      where.name = { contains: filters.search, mode: 'insensitive' };
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    const [data, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { jobPostings: true },
          },
        },
      }),
      this.prisma.company.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        parserHealth: true,
        _count: {
          select: { jobPostings: true, trackedBy: true },
        },
      },
    });

    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  async update(id: string, data: { isActive?: boolean; careerUrl?: string; parserType?: any }) {
    const company = await this.prisma.company.findUnique({ where: { id } });
    if (!company) throw new NotFoundException('Company not found');

    return this.prisma.company.update({
      where: { id },
      data,
    });
  }

  async triggerScrape(id: string) {
    const company = await this.prisma.company.findUnique({ where: { id } });
    if (!company) throw new NotFoundException('Company not found');

    // Generate a ScrapeJob record
    const scrapeJob = await this.prisma.scrapeJob.create({
      data: {
        companyId: company.id,
        status: 'PENDING',
      },
    });

    await this.scraperQueue.add(
      'scrape-company',
      {
        companyId: company.id,
        scrapeJobId: scrapeJob.id,
      },
      {
        jobId: scrapeJob.id, // prevent duplicates if triggered multiple times
      },
    );

    return scrapeJob;
  }
}
