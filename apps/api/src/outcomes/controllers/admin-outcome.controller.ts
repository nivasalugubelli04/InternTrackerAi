/**
 * AdminOutcomeController
 *
 * Platform-wide admin outcome analytics. Requires ADMIN or SUPER_ADMIN role.
 *
 * Routes:
 *  GET /api/v1/admin/outcomes/overview       — platform overview
 *  GET /api/v1/admin/outcomes/funnel         — platform funnel
 *  GET /api/v1/admin/outcomes/roles          — role analytics
 *  GET /api/v1/admin/outcomes/skills         — skill analytics
 *  GET /api/v1/admin/outcomes/companies      — company analytics
 *  GET /api/v1/admin/outcomes/organizations  — org analytics
 *  GET /api/v1/admin/outcomes/data-quality   — DQ validation
 *  GET /api/v1/admin/outcomes/export         — CSV export
 */
import {
  Controller,
  Get,
  Query,
  Request,
  Response,
  Header,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { AdminOutcomeService } from '../services/admin-outcome.service';
import { OutcomeRoleService } from '../services/outcome-role.service';
import { OutcomeSkillService } from '../services/outcome-skill.service';
import { OutcomeCompanyService } from '../services/outcome-company.service';
import { OutcomeExportService } from '../services/outcome-export.service';
import { OutcomePeriodQueryDto } from '../dto/outcome-query.dto';

@ApiTags('Outcomes — Admin')
@ApiBearerAuth()
@Controller('api/v1/admin/outcomes')
export class AdminOutcomeController {
  constructor(
    private readonly adminOutcome: AdminOutcomeService,
    private readonly roleService: OutcomeRoleService,
    private readonly skillService: OutcomeSkillService,
    private readonly companyService: OutcomeCompanyService,
    private readonly exportService: OutcomeExportService,
  ) {}

  private assertAdmin(req: any): void {
    if (![UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(req.user.role)) {
      throw new ForbiddenException('Admin access required.');
    }
  }

  private getPeriod(query: OutcomePeriodQueryDto): { start: Date; end: Date } {
    const end = query.periodEnd ? new Date(query.periodEnd) : new Date();
    const start = query.periodStart
      ? new Date(query.periodStart)
      : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { start, end };
  }

  /** GET /api/v1/admin/outcomes/overview */
  @Get('overview')
  async getOverview(@Request() req: any, @Query() query: OutcomePeriodQueryDto) {
    this.assertAdmin(req);
    const { start, end } = this.getPeriod(query);
    return this.adminOutcome.getOverview(start, end);
  }

  /** GET /api/v1/admin/outcomes/funnel */
  @Get('funnel')
  async getPlatformFunnel(@Request() req: any, @Query() query: OutcomePeriodQueryDto) {
    this.assertAdmin(req);
    const { start, end } = this.getPeriod(query);
    return this.adminOutcome.getPlatformFunnel(start, end);
  }

  /** GET /api/v1/admin/outcomes/roles */
  @Get('roles')
  async getRoles(@Request() req: any, @Query() query: OutcomePeriodQueryDto) {
    this.assertAdmin(req);
    const { start, end } = this.getPeriod(query);
    return this.roleService.getByRole(start, end);
  }

  /** GET /api/v1/admin/outcomes/skills */
  @Get('skills')
  async getSkills(@Request() req: any, @Query() query: OutcomePeriodQueryDto) {
    this.assertAdmin(req);
    const { start, end } = this.getPeriod(query);
    return this.skillService.getBySkill(start, end);
  }

  /** GET /api/v1/admin/outcomes/companies */
  @Get('companies')
  async getCompanies(@Request() req: any, @Query() query: OutcomePeriodQueryDto) {
    this.assertAdmin(req);
    const { start, end } = this.getPeriod(query);
    return this.companyService.getAdminCompanyList(start, end);
  }

  /** GET /api/v1/admin/outcomes/organizations */
  @Get('organizations')
  async getOrganizations(@Request() req: any, @Query() query: OutcomePeriodQueryDto) {
    this.assertAdmin(req);
    const { start, end } = this.getPeriod(query);
    return this.adminOutcome.getOrganizationOutcomes(start, end);
  }

  /** GET /api/v1/admin/outcomes/data-quality */
  @Get('data-quality')
  async getDataQuality(@Request() req: any, @Query() query: OutcomePeriodQueryDto) {
    this.assertAdmin(req);
    const { start, end } = this.getPeriod(query);
    return this.adminOutcome.getDataQuality(start, end);
  }

  /** GET /api/v1/admin/outcomes/export?type=roles|skills|funnel — CSV */
  @Get('export')
  @Header('Content-Type', 'text/csv')
  async exportCsv(
    @Request() req: any,
    @Query() query: OutcomePeriodQueryDto & { type?: string },
    @Response() res: any,
  ) {
    this.assertAdmin(req);
    const { start, end } = this.getPeriod(query);
    let csv = '';
    let filename = '';

    if (query.type === 'roles') {
      const data = await this.roleService.getByRole(start, end);
      csv = this.exportService.toCsv(
        this.exportService.formatRoleOutcomesForCsv(data as any),
      );
      filename = this.exportService.buildFilename('roles', start, end);
    } else if (query.type === 'skills') {
      const data = await this.skillService.getBySkill(start, end);
      csv = this.exportService.toCsv(
        this.exportService.formatSkillOutcomesForCsv(data as any),
      );
      filename = this.exportService.buildFilename('skills', start, end);
    } else {
      // Default: funnel
      const funnel = await this.adminOutcome.getPlatformFunnel(start, end);
      csv = this.exportService.toCsv(
        this.exportService.formatFunnelForCsv(funnel.stages),
      );
      filename = this.exportService.buildFilename('funnel', start, end);
    }

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csv);
  }
}
