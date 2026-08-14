import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { CareerProgressService } from '../services/career-progress.service';

@ApiTags('Engagement')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('engagement')
export class EngagementController {
  constructor(
    private readonly progressService: CareerProgressService,
    private readonly prisma: PrismaService,
  ) {}

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

  @Get('summary')
  @ApiOperation({ summary: 'Get engagement summary for dashboard' })
  async getEngagementSummary(@CurrentUser('id') userId: string) {
    const progress = await this.progressService.getCareerJourney(userId);
    return {
      score: progress.profileCompletePercentage,
      recentMilestones: progress.unlockedAchievements.slice(0, 3),
      needsAttention: progress.totalApplications > 0 && progress.interviewsScheduled === 0,
    };
  }
}
