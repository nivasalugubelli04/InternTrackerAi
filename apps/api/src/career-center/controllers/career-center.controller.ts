import { Controller, Get, Post, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtPayload } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { SnoozeActionDto, DailyPlanRequestDto } from '../dto/career-center.dto';
import { ActionOrchestrationService } from '../services/action-orchestration.service';
import { CareerCenterService } from '../services/career-center.service';
import { ReadinessCalculatorService } from '../services/readiness-calculator.service';
import { TimelineAggregationService } from '../services/timeline-aggregation.service';

@ApiTags('Personal Career Command Center')
@ApiBearerAuth()
@Controller('api/v1/career-center')
export class CareerCenterController {
  constructor(
    private readonly careerCenter: CareerCenterService,
    private readonly actionOrchestrator: ActionOrchestrationService,
    private readonly readinessCalculator: ReadinessCalculatorService,
    private readonly timelineAggregation: TimelineAggregationService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get unified aggregated career center dashboard' })
  getDashboard(@CurrentUser() user: JwtPayload) {
    return this.careerCenter.getDashboard(user.sub);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get career overview summary' })
  getSummary(@CurrentUser() user: JwtPayload) {
    return this.careerCenter.getSummary(user.sub);
  }

  @Get('actions')
  @ApiOperation({ summary: 'Get prioritized career actions list' })
  getActions(@CurrentUser() user: JwtPayload) {
    return this.actionOrchestrator.getPrioritizedActions(user.sub);
  }

  @Get('opportunities')
  @ApiOperation({ summary: 'Get top matching internships' })
  getOpportunities(@CurrentUser() user: JwtPayload) {
    return this.careerCenter.getOpportunities(user.sub);
  }

  @Get('applications')
  @ApiOperation({ summary: 'Get application tracker status counts' })
  getApplications(@CurrentUser() user: JwtPayload) {
    return this.careerCenter.getApplicationsSummary(user.sub);
  }

  @Get('interviews')
  @ApiOperation({ summary: 'Get upcoming recruiter interviews' })
  getInterviews(@CurrentUser() user: JwtPayload) {
    return this.careerCenter.getInterviewsSummary(user.sub);
  }

  @Get('learning')
  @ApiOperation({ summary: 'Get active learning goal roadmap status' })
  getLearning(@CurrentUser() user: JwtPayload) {
    return this.careerCenter.getLearningSummary(user.sub);
  }

  @Get('skills')
  @ApiOperation({ summary: 'Get top 3 target role skill gaps' })
  getSkills(@CurrentUser() user: JwtPayload) {
    return this.careerCenter.getSkillGapsSummary(user.sub);
  }

  @Get('timeline')
  @ApiOperation({ summary: 'Get unified career timeline feed' })
  getTimeline(@CurrentUser() user: JwtPayload, @Query('categories') categories?: string) {
    const parsedCategories = categories ? categories.split(',') : undefined;
    return this.timelineAggregation.aggregateTimeline(user.sub, parsedCategories);
  }

  @Get('readiness')
  @ApiOperation({ summary: 'Get transparent career readiness calculation details' })
  getReadiness(@CurrentUser() user: JwtPayload) {
    return this.readinessCalculator.calculateReadiness(user.sub);
  }

  @Post('actions/:id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a prioritized action as completed' })
  completeAction(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.actionOrchestrator.completeAction(id, user.sub);
  }

  @Post('actions/:id/dismiss')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dismiss/skip a prioritized action' })
  dismissAction(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.actionOrchestrator.dismissAction(id, user.sub);
  }

  @Post('actions/:id/snooze')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Snooze a prioritized action' })
  snoozeAction(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: SnoozeActionDto,
  ) {
    return this.actionOrchestrator.snoozeAction(id, user.sub, dto.snoozeHours);
  }

  @Post('daily-plan')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set daily time budget/mode and rebuild action plan' })
  async updateDailyPlan(@CurrentUser() user: JwtPayload, @Body() dto: DailyPlanRequestDto) {
    // Upsert preference
    const existing = await this.prisma.careerCenterPreference.findUnique({
      where: { userId: user.sub },
    });

    if (existing) {
      await this.prisma.careerCenterPreference.update({
        where: { userId: user.sub },
        data: {
          ...(dto.timeBudget && { dailyTimeBudget: dto.timeBudget }),
          ...(dto.careerMode && { careerMode: dto.careerMode }),
        },
      });
    } else {
      await this.prisma.careerCenterPreference.create({
        data: {
          userId: user.sub,
          dailyTimeBudget: dto.timeBudget || 30,
          careerMode: dto.careerMode || 'GENERAL_CAREER',
        },
      });
    }

    // Re-generate and return prioritized actions
    return this.actionOrchestrator.getPrioritizedActions(user.sub);
  }
}
