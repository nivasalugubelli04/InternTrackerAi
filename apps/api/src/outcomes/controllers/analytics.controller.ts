import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtPayload } from '../../auth/strategies/jwt.strategy';
import { CareerAnalyticsService, DateRange } from '../services/career-analytics.service';

@ApiTags('Career Analytics')
@ApiBearerAuth()
@Controller('api/v1/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: CareerAnalyticsService) {}

  private parseRange(days: number = 30): DateRange {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    return { start, end };
  }

  @Get('overview')
  @ApiOperation({ summary: 'Get overall analytics metrics overview' })
  async getOverview(@CurrentUser() user: JwtPayload, @Query('days') days?: number) {
    const range = this.parseRange(days ? Number(days) : 30);
    const funnel = await this.analyticsService.getFunnelAnalytics(user.sub, range);
    const roles = await this.analyticsService.getRolePerformance(user.sub, range);
    const sources = await this.analyticsService.getOpportunitySourcePerformance(user.sub, range);
    const resume = await this.analyticsService.getResumePerformance(user.sub);
    const portfolio = await this.analyticsService.getPortfolioPerformance(user.sub);
    const skills = await this.analyticsService.getSkillAnalytics(user.sub);
    const interview = await this.analyticsService.getInterviewAnalytics(user.sub);
    const actions = await this.analyticsService.getActionEffectiveness(user.sub);

    return {
      funnel,
      roles,
      sources,
      resume,
      portfolio,
      skills,
      interview,
      actions,
    };
  }

  @Get('funnel')
  @ApiOperation({ summary: 'Get application progression funnel stats' })
  async getFunnel(@CurrentUser() user: JwtPayload, @Query('days') days?: number) {
    const range = this.parseRange(days ? Number(days) : 30);
    return this.analyticsService.getFunnelAnalytics(user.sub, range);
  }

  @Get('insights')
  @ApiOperation({ summary: 'Get AI-grounded career insights' })
  async getInsights(@CurrentUser() user: JwtPayload, @Query('days') days?: number) {
    const range = this.parseRange(days ? Number(days) : 90);
    return this.analyticsService.generateInsights(user.sub, range);
  }

  @Get('bottlenecks')
  @ApiOperation({ summary: 'Get focus bottleneck identification' })
  async getBottlenecks(@CurrentUser() user: JwtPayload, @Query('days') days?: number) {
    const range = this.parseRange(days ? Number(days) : 30);
    return this.analyticsService.detectBottlenecks(user.sub, range);
  }

  @Get('weekly-review')
  @ApiOperation({ summary: 'Get weekly progress reviews' })
  async getWeeklyReview(@CurrentUser() user: JwtPayload) {
    return this.analyticsService.generateWeeklyReview(user.sub);
  }

  @Get('monthly-review')
  @ApiOperation({ summary: 'Get monthly progress reviews' })
  async getMonthlyReview(@CurrentUser() user: JwtPayload) {
    return this.analyticsService.generateMonthlyReview(user.sub);
  }
}
