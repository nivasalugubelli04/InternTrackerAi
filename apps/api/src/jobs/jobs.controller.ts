import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JobPostingStatus, WorkMode } from '@prisma/client';

import { Public } from '../auth/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Jobs Data Engine')
@Controller('jobs')
export class JobsController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('raw')
  @ApiOperation({ summary: 'Get raw unparsed job posting snapshots' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiResponse({ status: 200, description: 'Raw job JSON payloads and snapshots.' })
  async getRawJobs(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('companyId') companyId?: string,
  ) {
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const where = companyId ? { companyId } : {};

    const [items, total] = await Promise.all([
      this.prisma.rawJobPosting.findMany({
        where,
        orderBy: { scrapedAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          company: {
            select: { id: true, name: true, slug: true },
          },
        },
      }),
      this.prisma.rawJobPosting.count({ where }),
    ]);

    return {
      data: items,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  @Public()
  @Get('normalized')
  @ApiOperation({ summary: 'Get normalized and deduplicated job postings' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'search', required: false, description: 'Filter by job title' })
  @ApiQuery({ name: 'workMode', required: false, enum: WorkMode })
  @ApiQuery({ name: 'status', required: false, enum: JobPostingStatus })
  @ApiResponse({ status: 200, description: 'Normalized job listings ready for matching engine.' })
  async getNormalizedJobs(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('companyId') companyId?: string,
    @Query('search') search?: string,
    @Query('workMode') workMode?: WorkMode,
    @Query('status') status?: JobPostingStatus,
  ) {
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (companyId) where.companyId = companyId;
    if (workMode) where.workMode = workMode;
    if (status) where.status = status;
    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }

    const [items, total] = await Promise.all([
      this.prisma.jobPosting.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          company: {
            select: { id: true, name: true, slug: true, logoUrl: true, website: true },
          },
        },
      }),
      this.prisma.jobPosting.count({ where }),
    ]);

    return {
      data: items,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }
}
