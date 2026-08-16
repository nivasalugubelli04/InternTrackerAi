/**
 * UserOutcomeController
 *
 * Individual student career outcome endpoints.
 * All data scoped to authenticated user — never exposes other users' data.
 *
 * Routes:
 *  GET /api/v1/outcomes/me          — summary card
 *  GET /api/v1/outcomes/me/funnel   — personal application funnel
 *  GET /api/v1/outcomes/me/timeline — time-to-stage analytics
 *  GET /api/v1/outcomes/me/insights — AI-generated evidence-based insights
 *  GET /api/v1/outcomes/benchmarks  — platform benchmarks (privacy-safe)
 *  GET /api/v1/outcomes/roles       — role outcome analytics (aggregate)
 *  GET /api/v1/outcomes/skills      — skill association analytics (aggregate)
 *  GET /api/v1/outcomes/companies   — company outcomes (admin-visible only)
 *  GET /api/v1/outcomes/locations   — location outcome analytics (aggregate)
 */
import {
  Controller,
  Get,
  Query,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

import { OutcomeAggregationService } from '../services/outcome-aggregation.service';
import { OutcomeTimeToStageService } from '../services/outcome-time-to-stage.service';
import { OutcomeBenchmarkService } from '../services/outcome-benchmark.service';
import { OutcomeInsightService } from '../services/outcome-insight.service';
import { OutcomeRoleService } from '../services/outcome-role.service';
import { OutcomeSkillService } from '../services/outcome-skill.service';
import { OutcomeLocationService } from '../services/outcome-location.service';
import { OutcomePeriodQueryDto } from '../dto/outcome-query.dto';

@ApiTags('Outcomes — Student')
@ApiBearerAuth()
@Controller('api/v1/outcomes')
export class UserOutcomeController {
  constructor(
    private readonly aggregation: OutcomeAggregationService,
    private readonly timeToStage: OutcomeTimeToStageService,
    private readonly benchmark: OutcomeBenchmarkService,
    private readonly insight: OutcomeInsightService,
    private readonly roleService: OutcomeRoleService,
    private readonly skillService: OutcomeSkillService,
    private readonly locationService: OutcomeLocationService,
  ) {}

  private getPeriod(query: OutcomePeriodQueryDto): { start: Date; end: Date } {
    const end = query.periodEnd ? new Date(query.periodEnd) : new Date();
    const start = query.periodStart
      ? new Date(query.periodStart)
      : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { start, end };
  }

  /**
   * GET /api/v1/outcomes/me
   * Personal career outcome summary.
   */
  @Get('me')
  async getMyOutcomes(@Request() req: any) {
    const userId = req.user.id;
    const funnel = await this.aggregation.computeUserFunnel(userId);
    const timeToStageData = await this.timeToStage.calculateForUser(userId);

    const interviewBenchmark = await this.benchmark.compareUserToBenchmark(
      userId,
      'interviewConversionRate',
      funnel.applicationConversionRate,
    );

    return {
      funnel,
      timeToStage: timeToStageData,
      benchmarkComparisons: [interviewBenchmark],
    };
  }

  /**
   * GET /api/v1/outcomes/me/funnel
   * Personal application funnel breakdown.
   */
  @Get('me/funnel')
  async getMyFunnel(@Request() req: any) {
    return this.aggregation.computeUserFunnel(req.user.id);
  }

  /**
   * GET /api/v1/outcomes/me/timeline
   * Personal time-to-stage analytics.
   */
  @Get('me/timeline')
  async getMyTimeline(@Request() req: any) {
    return this.timeToStage.calculateForUser(req.user.id);
  }

  /**
   * GET /api/v1/outcomes/me/insights
   * AI-generated evidence-based insights (cached 7 days).
   */
  @Get('me/insights')
  async getMyInsights(@Request() req: any) {
    const userId = req.user.id;
    const funnel = await this.aggregation.computeUserFunnel(userId);
    const timeToStageData = await this.timeToStage.calculateForUser(userId);

    const benchmarkComparison = await this.benchmark.compareUserToBenchmark(
      userId,
      'interviewConversionRate',
      funnel.applicationConversionRate,
    );

    return this.insight.getOrGenerateUserInsights(
      userId,
      funnel,
      timeToStageData,
      benchmarkComparison.comparison,
    );
  }

  /**
   * GET /api/v1/outcomes/benchmarks
   * Platform-wide benchmarks (privacy-safe, min n=50).
   */
  @Get('benchmarks')
  async getBenchmarks() {
    return this.benchmark.getLatestBenchmarks();
  }

  /**
   * GET /api/v1/outcomes/roles
   * Role outcome analytics (aggregate, not individual).
   */
  @Get('roles')
  async getRoleOutcomes(@Query() query: OutcomePeriodQueryDto) {
    const { start, end } = this.getPeriod(query);
    return this.roleService.getByRole(start, end);
  }

  /**
   * GET /api/v1/outcomes/skills
   * Skill association analytics.
   */
  @Get('skills')
  async getSkillOutcomes(@Query() query: OutcomePeriodQueryDto) {
    const { start, end } = this.getPeriod(query);
    return this.skillService.getBySkill(start, end);
  }

  /**
   * GET /api/v1/outcomes/locations
   * Location outcome analytics.
   */
  @Get('locations')
  async getLocationOutcomes(@Query() query: OutcomePeriodQueryDto) {
    const { start, end } = this.getPeriod(query);
    return this.locationService.getByLocation(start, end);
  }
}
