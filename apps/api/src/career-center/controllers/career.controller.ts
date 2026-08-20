import { Controller, Get, Post, Patch, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtPayload } from '../../auth/strategies/jwt.strategy';
import { CompanyAnalyticsService } from '../../market/services/company-analytics.service';
import { LocationIntelligenceService } from '../../market/services/location-intelligence.service';
import { MarketInsightService } from '../../market/services/market-insight.service';
import { RoleAnalyticsService } from '../../market/services/role-analytics.service';
import { SkillDemandService } from '../../market/services/skill-demand.service';
import { TrendDetectionService } from '../../market/services/trend-detection.service';
import { CareerAiChatDto } from '../dto/career-center.dto';
import { ActionOrchestrationService } from '../services/action-orchestration.service';
import { CareerCenterAiService } from '../services/career-center-ai.service';
import { CareerStrategyService } from '../services/career-strategy.service';
import { CommandCenterService } from '../services/command-center.service';

@ApiTags('AI Career Strategy & Opportunity Intelligence')
@ApiBearerAuth()
@Controller('api/v1')
export class CareerController {
  constructor(
    private readonly careerStrategy: CareerStrategyService,
    private readonly careerAi: CareerCenterAiService,
    private readonly marketInsight: MarketInsightService,
    private readonly roleAnalytics: RoleAnalyticsService,
    private readonly skillDemand: SkillDemandService,
    private readonly companyAnalytics: CompanyAnalyticsService,
    private readonly locationIntelligence: LocationIntelligenceService,
    private readonly trendDetection: TrendDetectionService,
    private readonly commandCenter: CommandCenterService,
    private readonly actionOrch: ActionOrchestrationService,
  ) {}

  @Get('career/strategy')
  @ApiOperation({
    summary: 'Get personalized career strategic alignment score, target roles, skill gaps',
  })
  getStrategy(@CurrentUser() user: JwtPayload) {
    return this.careerStrategy.getCareerStrategy(user.sub);
  }

  @Get('career/insights')
  @ApiOperation({
    summary: 'Get live market insights (role demand, skill growth, company postings)',
  })
  getInsights() {
    return this.marketInsight.getMarketInsights(undefined, 10);
  }

  @Get('career/trends')
  @ApiOperation({
    summary: 'Get latest statistically verified trend metrics for skills, roles, and locations',
  })
  getTrends() {
    return this.trendDetection.getLatestTrends();
  }

  @Get('career/trends/roles')
  @ApiOperation({ summary: 'Get role taxonomy analytics, required skills, and job volumes' })
  getRoleTrends() {
    return this.roleAnalytics.getRoleAnalytics();
  }

  @Get('career/trends/skills')
  @ApiOperation({ summary: 'Get skill demand analysis and co-occurrence patterns' })
  getSkillTrends() {
    return this.skillDemand.getSkillDemandAnalysis();
  }

  @Get('career/trends/companies')
  @ApiOperation({ summary: 'Get company opportunity listings and active counts' })
  getCompanyTrends() {
    return this.companyAnalytics.getTopHiringCompanies(10);
  }

  @Get('career/trends/locations')
  @ApiOperation({ summary: 'Get location intelligence and remote/hybrid distribution' })
  getLocationTrends() {
    return this.locationIntelligence.getLocationIntelligence();
  }

  @Get('career/forecast')
  @ApiOperation({ summary: 'Get job market opportunity forecast with confidence ratings' })
  getForecast(@CurrentUser() user: JwtPayload) {
    return this.careerStrategy.getHiringForecast(user.sub);
  }

  @Get('career/adjacent-roles')
  @ApiOperation({ summary: 'Discover adjacent roles based on skill overlap' })
  getAdjacentRoles(@CurrentUser() user: JwtPayload) {
    return this.careerStrategy.getCareerStrategy(user.sub).then((res) => res.adjacentRoles);
  }

  @Get('companies/:id/intelligence')
  @ApiOperation({
    summary: 'Get company analytics, hiring history timeline, and user match quality',
  })
  getCompanyIntelligence(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.careerStrategy.getCompanyIntelligence(id, user.sub);
  }

  @Post('ai/career/advisor')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Interact with AI Career Advisor grounded in platform and profile data',
  })
  chatAdvisor(@CurrentUser() user: JwtPayload, @Body() dto: CareerAiChatDto) {
    return this.careerAi.handleChat(user.sub, dto.message, dto.conversationId, dto.jobId);
  }

  // ── Phase 37 Command Center APIs ──────────────────────────────────────────

  @Get('career/command-center')
  @ApiOperation({
    summary: 'Get the core career command center state, focus, health and actions list',
  })
  getCommandCenter(@CurrentUser() user: JwtPayload) {
    return this.commandCenter.getCommandCenterData(user.sub);
  }

  @Get('career/actions')
  @ApiOperation({ summary: 'Get non-snoozed, non-dismissed priority actions' })
  getActions(@CurrentUser() user: JwtPayload) {
    return this.actionOrch.getPrioritizedActions(user.sub);
  }

  @Get('career/actions/today')
  @ApiOperation({ summary: 'Get top priority actions scheduled for today' })
  getActionsToday(@CurrentUser() user: JwtPayload) {
    return this.actionOrch.getPrioritizedActions(user.sub);
  }

  @Post('career/actions/:id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete a career command action item' })
  completeAction(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.actionOrch.completeAction(id, user.sub);
  }

  @Post('career/actions/:id/dismiss')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Skip or dismiss a career action' })
  dismissAction(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.actionOrch.dismissAction(id, user.sub);
  }

  @Get('career/goals')
  @ApiOperation({ summary: 'Get all active and completed user career goals' })
  getGoals(@CurrentUser() user: JwtPayload) {
    return this.commandCenter.getUserGoals(user.sub);
  }

  @Post('career/goals')
  @ApiOperation({ summary: 'Create a new user career/learning/application goal target' })
  createGoal(@CurrentUser() user: JwtPayload, @Body() body: any) {
    return this.commandCenter.createUserGoal(user.sub, body);
  }

  @Patch('career/goals/:id')
  @ApiOperation({ summary: 'Adjust or update an active user goal progress value or status' })
  adjustGoal(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Body() body: any) {
    return this.commandCenter.adjustUserGoal(user.sub, id, body);
  }

  @Get('career/reviews/weekly')
  @ApiOperation({ summary: 'Generate the weekly career review summary and AI analysis context' })
  getWeeklyReview(@CurrentUser() user: JwtPayload) {
    return this.commandCenter.getWeeklyReview(user.sub);
  }

  @Get('career/reviews/monthly')
  @ApiOperation({ summary: 'Generate the monthly career review and trend conversion summary' })
  getMonthlyReview(@CurrentUser() user: JwtPayload) {
    return this.commandCenter.getMonthlyReview(user.sub);
  }

  @Post('ai/career/command')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Interact with AI Command Center Assistant grounded in dashboard parameters',
  })
  chatCommand(@CurrentUser() user: JwtPayload, @Body() body: { message: string }) {
    return this.commandCenter.chatCommandCenter(user.sub, body.message);
  }
}
