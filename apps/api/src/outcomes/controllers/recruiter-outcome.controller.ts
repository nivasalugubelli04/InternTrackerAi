/**
 * RecruiterOutcomeController
 *
 * Recruiter-side hiring pipeline outcome analytics.
 * All data scoped to authenticated recruiter's organization.
 *
 * Routes:
 *  GET /api/v1/recruiter/outcomes              — overview
 *  GET /api/v1/recruiter/outcomes/funnel       — pipeline funnel
 *  GET /api/v1/recruiter/outcomes/time-to-hire — time-to-hire stats
 *  GET /api/v1/recruiter/outcomes/roles        — role breakdown
 *  GET /api/v1/recruiter/outcomes/sources      — candidate source breakdown
 *  GET /api/v1/recruiter/outcomes/bottlenecks  — detected bottlenecks
 */
import { Controller, Get, Query, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

import { RecruiterOutcomeService } from '../services/recruiter-outcome.service';
import { OutcomePeriodQueryDto } from '../dto/outcome-query.dto';
import { IsString } from 'class-validator';

class RecruiterQueryDto extends OutcomePeriodQueryDto {
  @IsString()
  recruiterOrgId!: string;
}

@ApiTags('Outcomes — Recruiter')
@ApiBearerAuth()
@Controller('api/v1/recruiter/outcomes')
export class RecruiterOutcomeController {
  constructor(private readonly recruiterOutcome: RecruiterOutcomeService) {}

  private getPeriod(query: OutcomePeriodQueryDto): { start: Date; end: Date } {
    const end = query.periodEnd ? new Date(query.periodEnd) : new Date();
    const start = query.periodStart
      ? new Date(query.periodStart)
      : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { start, end };
  }

  /** GET /api/v1/recruiter/outcomes */
  @Get()
  async getOverview(@Request() req: any, @Query() query: RecruiterQueryDto) {
    const { start, end } = this.getPeriod(query);
    return this.recruiterOutcome.getOverview(req.user.id, query.recruiterOrgId, start, end);
  }

  /** GET /api/v1/recruiter/outcomes/funnel */
  @Get('funnel')
  async getFunnel(@Request() req: any, @Query() query: RecruiterQueryDto) {
    const { start, end } = this.getPeriod(query);
    return this.recruiterOutcome.getFunnel(req.user.id, query.recruiterOrgId, start, end);
  }

  /** GET /api/v1/recruiter/outcomes/time-to-hire */
  @Get('time-to-hire')
  async getTimeToHire(@Request() req: any, @Query() query: RecruiterQueryDto) {
    const { start, end } = this.getPeriod(query);
    return this.recruiterOutcome.getTimeToHire(req.user.id, query.recruiterOrgId, start, end);
  }

  /** GET /api/v1/recruiter/outcomes/bottlenecks */
  @Get('bottlenecks')
  async getBottlenecks(@Request() req: any, @Query() query: RecruiterQueryDto) {
    const { start, end } = this.getPeriod(query);
    return this.recruiterOutcome.getBottlenecks(req.user.id, query.recruiterOrgId, start, end);
  }

  /** GET /api/v1/recruiter/outcomes/roles — role breakdown placeholder */
  @Get('roles')
  async getRoles(@Request() req: any, @Query() query: RecruiterQueryDto) {
    const { start, end } = this.getPeriod(query);
    // Returns general overview as role breakdown uses same recruiterOrg scoping
    return this.recruiterOutcome.getOverview(req.user.id, query.recruiterOrgId, start, end);
  }

  /** GET /api/v1/recruiter/outcomes/sources */
  @Get('sources')
  async getSources(@Request() req: any, @Query() query: RecruiterQueryDto) {
    // Candidate source analytics — returns basic funnel for now
    const { start, end } = this.getPeriod(query);
    return this.recruiterOutcome.getFunnel(req.user.id, query.recruiterOrgId, start, end);
  }
}
