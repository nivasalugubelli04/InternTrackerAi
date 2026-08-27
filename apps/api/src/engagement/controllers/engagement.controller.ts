import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { RecordActionDto } from '../dto/engagement.dto';
import { ActivationJourneyService } from '../services/activation-journey.service';
import { CareerProgressService } from '../services/career-progress.service';
import { DailyFocusService } from '../services/daily-focus.service';
import { GrowthAnalyticsService } from '../services/growth-analytics.service';
import { ReengagementService } from '../services/reengagement.service';
import { WeeklyCareerSummaryService } from '../services/weekly-career-summary.service';

@ApiTags('Engagement')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('engagement')
export class EngagementController {
  constructor(
    private readonly progressService: CareerProgressService,
    private readonly activationService: ActivationJourneyService,
    private readonly dailyFocusService: DailyFocusService,
    private readonly weeklySummaryService: WeeklyCareerSummaryService,
    private readonly reengagementService: ReengagementService,
    private readonly growthService: GrowthAnalyticsService,
    private readonly prisma: PrismaService,
  ) {}

  // ---------------------------------------------------------------------------
  // Activation & Daily Focus
  // ---------------------------------------------------------------------------

  @Get('activation-progress')
  @ApiOperation({ summary: 'Get activation progress and next best step recommendation' })
  async getActivationProgress(@CurrentUser('id') userId: string) {
    return this.activationService.getActivationProgress(userId);
  }

  @Get('daily-focus')
  @ApiOperation({ summary: 'Get personalized daily priority focus item' })
  async getDailyFocus(@CurrentUser('id') userId: string) {
    return this.dailyFocusService.getDailyFocus(userId);
  }

  @Post('daily-focus/:id/complete')
  @ApiOperation({ summary: 'Mark daily focus item completed' })
  async completeDailyFocus(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.dailyFocusService.completeDailyFocus(userId, id);
  }

  @Get('weekly-summary')
  @ApiOperation({ summary: 'Get personalized weekly career summary' })
  async getWeeklySummary(@CurrentUser('id') userId: string) {
    return this.weeklySummaryService.getWeeklySummary(userId);
  }

  @Get('churn-risk')
  @ApiOperation({ summary: 'Evaluate user churn risk score and explanation' })
  async getChurnRisk(@CurrentUser('id') userId: string) {
    return this.reengagementService.evaluateChurnRisk(userId);
  }

  @Post('actions/record')
  @ApiOperation({ summary: 'Record notification or engagement action event' })
  async recordAction(@CurrentUser('id') userId: string, @Body() dto: RecordActionDto) {
    return this.prisma.engagementActionLog.create({
      data: {
        userId,
        actionType: dto.actionType,
        featureArea: dto.featureArea,
        signalId: dto.signalId || null,
        notificationId: dto.notificationId || null,
        details: dto.details || {},
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Legacy / Basic Progress & Achievements
  // ---------------------------------------------------------------------------

  @Get('career/progress')
  @ApiOperation({ summary: 'Get user career journey progress' })
  async getCareerProgress(@CurrentUser('id') userId: string) {
    return this.progressService.getCareerJourney(userId);
  }

  @Get('achievements')
  @ApiOperation({ summary: 'List all available achievements' })
  async getAchievements() {
    return this.prisma.achievement.findMany();
  }

  @Get('achievements/me')
  @ApiOperation({ summary: 'List unlocked achievements for current user' })
  async getMyAchievements(@CurrentUser('id') userId: string) {
    const userAchievements = await this.prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
      orderBy: { unlockedAt: 'desc' },
    });
    return userAchievements.map((ua) => ua.achievement);
  }

  // ---------------------------------------------------------------------------
  // Admin & Growth Analytics
  // ---------------------------------------------------------------------------

  @Get('admin/growth-metrics')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Executive growth, retention, and notification metrics' })
  async getGrowthMetrics() {
    return this.growthService.getGrowthMetrics();
  }

  @Post('admin/reengagement-batch')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Trigger batch inactive user re-engagement process' })
  async triggerReengagementBatch() {
    await this.reengagementService.processInactiveUsersBatch();
    return { success: true, message: 'Inactive user re-engagement evaluation initiated.' };
  }
}
