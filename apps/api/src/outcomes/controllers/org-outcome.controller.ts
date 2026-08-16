/**
 * OrgOutcomeController
 *
 * B2B / College placement analytics for authorized organization members.
 *
 * Routes:
 *  GET /api/v1/org/outcomes             — overview
 *  GET /api/v1/org/outcomes/funnel      — placement funnel
 *  GET /api/v1/org/outcomes/skills      — skill coverage + gaps
 *  GET /api/v1/org/outcomes/departments — department breakdown
 *  GET /api/v1/org/outcomes/roles       — role outcomes for org members
 *  GET /api/v1/org/outcomes/timeline    — monthly trend data
 *  GET /api/v1/org/outcomes/export      — CSV export
 *
 * Security: All routes require org membership with PLACEMENT_OFFICER or higher role.
 */
import {
  Controller,
  Get,
  Query,
  Request,
  Response,
  Header,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsString } from 'class-validator';

import { OrgOutcomeService } from '../services/org-outcome.service';
import { OutcomeExportService } from '../services/outcome-export.service';
import { OutcomePeriodQueryDto, OutcomePaginationQueryDto } from '../dto/outcome-query.dto';

class OrgQueryDto extends OutcomePaginationQueryDto {
  @IsString()
  orgId!: string;
}

@ApiTags('Outcomes — Organization')
@ApiBearerAuth()
@Controller('api/v1/org/outcomes')
export class OrgOutcomeController {
  constructor(
    private readonly orgOutcome: OrgOutcomeService,
    private readonly exportService: OutcomeExportService,
  ) {}

  private getPeriod(query: OutcomePeriodQueryDto): { start: Date; end: Date } {
    const end = query.periodEnd ? new Date(query.periodEnd) : new Date();
    const start = query.periodStart
      ? new Date(query.periodStart)
      : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { start, end };
  }

  /** GET /api/v1/org/outcomes */
  @Get()
  async getOrgOverview(@Request() req: any, @Query() query: OrgQueryDto) {
    const { start, end } = this.getPeriod(query);
    return this.orgOutcome.getOrgOverview(req.user.id, query.orgId, start, end);
  }

  /** GET /api/v1/org/outcomes/funnel */
  @Get('funnel')
  async getOrgFunnel(@Request() req: any, @Query() query: OrgQueryDto) {
    const { start, end } = this.getPeriod(query);
    return this.orgOutcome.getOrgFunnel(req.user.id, query.orgId, start, end);
  }

  /** GET /api/v1/org/outcomes/skills */
  @Get('skills')
  async getSkillGaps(@Request() req: any, @Query() query: OrgQueryDto) {
    return this.orgOutcome.getSkillGaps(req.user.id, query.orgId);
  }

  /** GET /api/v1/org/outcomes/departments */
  @Get('departments')
  async getDepartments(@Request() req: any, @Query() query: OrgQueryDto) {
    const { start, end } = this.getPeriod(query);
    return this.orgOutcome.getByDepartment(req.user.id, query.orgId, start, end);
  }

  /** GET /api/v1/org/outcomes/timeline */
  @Get('timeline')
  async getTimeline(@Request() req: any, @Query() query: OrgQueryDto) {
    return this.orgOutcome.getTimeline(req.user.id, query.orgId, query.months ?? 6);
  }

  /** GET /api/v1/org/outcomes/export — CSV */
  @Get('export')
  @Header('Content-Type', 'text/csv')
  async exportOrgOutcomes(
    @Request() req: any,
    @Query() query: OrgQueryDto,
    @Response() res: any,
  ) {
    const { start, end } = this.getPeriod(query);
    const departments = await this.orgOutcome.getByDepartment(
      req.user.id, query.orgId, start, end,
    );
    const csv = this.exportService.toCsv(
      this.exportService.formatDepartmentOutcomesForCsv(
        departments,
      ),
    );
    const filename = this.exportService.buildFilename('org_departments', start, end);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csv);
  }
}
