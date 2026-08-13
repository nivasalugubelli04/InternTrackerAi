import { Controller, Get, Param, Patch, Post, Body, Query, UseGuards, Req } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { RateLimitProfile } from '../../common/decorators/rate-limit.decorator';
import { UpdateCompanyDto } from '../dto/update-company.dto';
import { AdminAuditService } from '../services/admin-audit.service';
import { AdminCompaniesService } from '../services/admin-companies.service';

@Controller('v1/admin/companies')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@RateLimitProfile('admin')
export class AdminCompaniesController {
  constructor(
    private readonly companiesService: AdminCompaniesService,
    private readonly auditService: AdminAuditService,
  ) {}

  @Get()
  async getCompanies(
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @Query('search') search?: string,
  ) {
    return this.companiesService.findAll(
      Number(page),
      Number(limit),
      search ? { search } : undefined,
    );
  }

  @Get(':id')
  async getCompany(@Param('id') id: string) {
    return this.companiesService.findOne(id);
  }

  @Patch(':id')
  async updateCompany(@Req() req: any, @Param('id') id: string, @Body() body: UpdateCompanyDto) {
    const result = await this.companiesService.update(id, body);

    void this.auditService.logAction(req.user.id, 'UPDATE_COMPANY', 'COMPANY', id, body, req.ip);

    return result;
  }

  @Post(':id/scrape')
  async triggerScrape(@Req() req: any, @Param('id') id: string) {
    const result = await this.companiesService.triggerScrape(id);

    void this.auditService.logAction(
      req.user.id,
      'TRIGGER_SCRAPE',
      'COMPANY',
      id,
      { scrapeJobId: result.id },
      req.ip,
    );

    return result;
  }
}
