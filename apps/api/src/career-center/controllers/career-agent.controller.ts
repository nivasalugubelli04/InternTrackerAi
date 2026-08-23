import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsArray } from 'class-validator';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtPayload } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { ActionOrchestrationService } from '../services/action-orchestration.service';
import { CommandCenterService } from '../services/command-center.service';
import { TimelineAggregationService } from '../services/timeline-aggregation.service';

export class UpdateAutomationPreferencesDto {
  @IsBoolean()
  @IsOptional()
  proactiveAssistanceEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  opportunityAlerts?: boolean;

  @IsBoolean()
  @IsOptional()
  interviewReminders?: boolean;

  @IsBoolean()
  @IsOptional()
  followUpReminders?: boolean;

  @IsBoolean()
  @IsOptional()
  learningReminders?: boolean;

  @IsBoolean()
  @IsOptional()
  careerInsights?: boolean;

  @IsBoolean()
  @IsOptional()
  companyAlerts?: boolean;

  @IsBoolean()
  @IsOptional()
  dailyDigest?: boolean;

  @IsBoolean()
  @IsOptional()
  weeklyDigest?: boolean;

  @IsString()
  @IsOptional()
  automationIntensity?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  watchedRoles?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  watchedSkills?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  watchedCompanies?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  watchedLocations?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  watchedWorkModes?: string[];
}

@ApiTags('Proactive AI Career Agent')
@ApiBearerAuth()
@Controller('api/v1')
@Controller()
export class CareerAgentController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly actionOrchestrator: ActionOrchestrationService,
    private readonly timelineAggregation: TimelineAggregationService,
    private readonly commandCenter: CommandCenterService,
  ) {}

  @Get('career/events')
  @ApiOperation({ summary: 'Get raw career events feed' })
  async getEvents(
    @CurrentUser() user: JwtPayload,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const skip = (page - 1) * limit;
    const [events, total] = await Promise.all([
      this.prisma.careerEvent.findMany({
        where: { userId: user.sub },
        orderBy: { timestamp: 'desc' },
        skip: +skip,
        take: +limit,
      }),
      this.prisma.careerEvent.count({
        where: { userId: user.sub },
      }),
    ]);
    return { data: events, total, page: +page, limit: +limit };
  }

  @Get('career/events/timeline')
  @ApiOperation({ summary: 'Get career activity timeline' })
  getEventsTimeline(@CurrentUser() user: JwtPayload, @Query('categories') categories?: string) {
    const parsedCategories = categories ? categories.split(',') : undefined;
    return this.timelineAggregation.aggregateTimeline(user.sub, parsedCategories);
  }

  @Get('automation/preferences')
  @ApiOperation({ summary: 'Get agent automation preferences' })
  async getPreferences(@CurrentUser() user: JwtPayload) {
    let pref = await this.prisma.automationPreference.findUnique({
      where: { userId: user.sub },
    });
    if (!pref) {
      pref = await this.prisma.automationPreference.create({
        data: { userId: user.sub },
      });
    }
    return pref;
  }

  @Patch('automation/preferences')
  @ApiOperation({ summary: 'Update agent automation preferences' })
  async updatePreferences(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateAutomationPreferencesDto,
  ) {
    return this.prisma.automationPreference.upsert({
      where: { userId: user.sub },
      create: {
        userId: user.sub,
        ...dto,
      },
      update: dto,
    });
  }

  @Get('automation/activity')
  @ApiOperation({ summary: 'Get agent activity log' })
  async getActivity(
    @CurrentUser() user: JwtPayload,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const skip = (page - 1) * limit;
    const [activity, total] = await Promise.all([
      this.prisma.agentActivity.findMany({
        where: { userId: user.sub },
        orderBy: { timestamp: 'desc' },
        skip: +skip,
        take: +limit,
      }),
      this.prisma.agentActivity.count({
        where: { userId: user.sub },
      }),
    ]);
    return { data: activity, total, page: +page, limit: +limit };
  }

  @Post('automation/actions/:id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve and execute a proactive agent action' })
  approveAction(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.actionOrchestrator.approveAction(id, user.sub);
  }

  @Post('automation/actions/:id/snooze')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Snooze a proactive action' })
  snoozeAction(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { snoozeHours?: number },
  ) {
    return this.actionOrchestrator.snoozeAction(id, user.sub, body.snoozeHours || 24);
  }

  @Post('automation/actions/:id/dismiss')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dismiss a proactive action' })
  dismissAction(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.actionOrchestrator.dismissAction(id, user.sub);
  }

  @Get('career/digest/daily')
  @ApiOperation({ summary: 'Retrieve daily career digest brief' })
  async getDailyDigest(@CurrentUser() user: JwtPayload) {
    const data = await this.commandCenter.getCommandCenterData(user.sub);
    return {
      userId: user.sub,
      timestamp: new Date(),
      priorityActions: data.priorityActions,
      upcomingEvents: data.upcomingEvents,
      goals: data.goals,
    };
  }

  @Get('career/digest/weekly')
  @ApiOperation({ summary: 'Retrieve weekly career review' })
  getWeeklyDigest(@CurrentUser() user: JwtPayload) {
    return this.commandCenter.getWeeklyReview(user.sub);
  }
}
