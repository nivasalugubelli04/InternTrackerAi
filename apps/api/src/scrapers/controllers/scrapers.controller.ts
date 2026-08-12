import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { Public } from '../../auth/decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { ScrapeSchedulerService } from '../../queues/schedulers/scrape-scheduler.service';
import { HealthMonitoringService } from '../services/health-monitoring.service';

@ApiTags('Scrapers (Admin)')
@Controller('scrapers')
export class ScrapersController {
  constructor(
    private readonly healthMonitoringService: HealthMonitoringService,
    private readonly scrapeSchedulerService: ScrapeSchedulerService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Get('status')
  @ApiOperation({ summary: 'Get current scraper system health and telemetry' })
  @ApiResponse({ status: 200, description: 'Scraper metrics and active telemetry.' })
  async getStatus() {
    return this.healthMonitoringService.getOverallStatus();
  }

  @Public()
  @Get('history')
  @ApiOperation({ summary: 'Get execution history of scrape jobs' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiResponse({ status: 200, description: 'Paginated list of historical scrape executions.' })
  async getHistory(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('companyId') companyId?: string,
  ) {
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const where = companyId ? { companyId } : {};

    const [items, total] = await Promise.all([
      this.prisma.scrapeJob.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          company: {
            select: { id: true, name: true, slug: true, parserType: true },
          },
        },
      }),
      this.prisma.scrapeJob.count({ where }),
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
  @Post('run/:companyId')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Trigger scraping job for a single company' })
  @ApiResponse({ status: 202, description: 'Scrape job successfully queued.' })
  async runCompany(@Param('companyId', ParseUUIDPipe) companyId: string) {
    return this.scrapeSchedulerService.triggerScrapeCompany(companyId);
  }

  @Public()
  @Post('run-all')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Trigger scraping jobs for all active companies' })
  @ApiResponse({ status: 202, description: 'Scrape jobs queued for all active companies.' })
  async runAll() {
    return this.scrapeSchedulerService.triggerScrapeAllCompanies();
  }
}
