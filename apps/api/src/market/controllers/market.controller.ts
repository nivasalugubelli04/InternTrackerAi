import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MarketMetricCategory } from '@prisma/client';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import type { JwtPayload } from '../../auth/strategies/jwt.strategy';
import { CompanyAnalyticsService } from '../services/company-analytics.service';
import { DataQualityService } from '../services/data-quality.service';
import { LocationIntelligenceService } from '../services/location-intelligence.service';
import { MarketAggregationService } from '../services/market-aggregation.service';
import { MarketInsightService } from '../services/market-insight.service';
import { RoleAnalyticsService } from '../services/role-analytics.service';
import { SkillDemandService } from '../services/skill-demand.service';
import { TrendDetectionService } from '../services/trend-detection.service';
import { UserMarketPositionService } from '../services/user-market-position.service';

@ApiTags('Market Intelligence')
@Controller('market')
export class MarketController {
  constructor(
    private readonly marketAggregationService: MarketAggregationService,
    private readonly skillDemandService: SkillDemandService,
    private readonly roleAnalyticsService: RoleAnalyticsService,
    private readonly companyAnalyticsService: CompanyAnalyticsService,
    private readonly locationIntelligenceService: LocationIntelligenceService,
    private readonly trendDetectionService: TrendDetectionService,
    private readonly marketInsightService: MarketInsightService,
    private readonly dataQualityService: DataQualityService,
    private readonly userMarketPositionService: UserMarketPositionService,
  ) {}

  @Public()
  @Get('overview')
  @ApiOperation({
    summary: 'Get aggregate market overview (active jobs, hiring companies, top roles & skills)',
  })
  async getOverview(@Query('refresh') refresh?: string) {
    return this.marketAggregationService.getMarketOverview(refresh === 'true');
  }

  @Public()
  @Get('skills')
  @ApiOperation({
    summary:
      'Get skill demand analysis (most demanded, fastest growing, combinations, role matrix)',
  })
  async getSkills() {
    return this.skillDemandService.getSkillDemandAnalysis();
  }

  @Public()
  @Get('roles')
  @ApiOperation({
    summary: 'Get role taxonomy analytics, application volume, and required skill profiles',
  })
  async getRoles() {
    return this.roleAnalyticsService.getRoleAnalytics();
  }

  @Public()
  @Get('companies')
  @ApiOperation({ summary: 'Get top hiring companies with active openings and role distributions' })
  async getCompanies(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    return this.companyAnalyticsService.getTopHiringCompanies(
      isNaN(parsedLimit) ? 20 : parsedLimit,
    );
  }

  @Public()
  @Get('locations')
  @ApiOperation({ summary: 'Get location intelligence and remote/hybrid/onsite distribution' })
  async getLocations() {
    return this.locationIntelligenceService.getLocationIntelligence();
  }

  @Public()
  @Get('trends')
  @ApiOperation({
    summary: 'Get latest statistically verified trend metrics for skills, roles, and locations',
  })
  async getTrends() {
    return this.trendDetectionService.getLatestTrends();
  }

  @Public()
  @Get('insights')
  @ApiOperation({ summary: 'Get structured market insights with evidence and confidence scores' })
  async getInsights(
    @Query('category') category?: MarketMetricCategory,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    return this.marketInsightService.getMarketInsights(
      category,
      isNaN(parsedLimit) ? 10 : parsedLimit,
    );
  }

  @Public()
  @Get('quality')
  @ApiOperation({ summary: 'Get data quality summary across all collected internship postings' })
  async getQuality() {
    return this.dataQualityService.getDataQualitySummary();
  }

  @Get('personalized')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Get personalized market positioning, skill gap prioritization, and role alignment for the authenticated user',
  })
  async getPersonalized(@CurrentUser() user: JwtPayload) {
    return this.userMarketPositionService.getUserMarketPosition(user.sub);
  }
}
