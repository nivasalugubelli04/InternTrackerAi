import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { ApplicationFollowUpService } from '../services/application-follow-up.service';

@ApiTags('Preparation Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('preparation/dashboard')
export class CareerDashboardController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly followUpService: ApplicationFollowUpService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get AI Career Preparation Dashboard' })
  @ApiResponse({ status: 200, description: 'Dashboard metrics and progress' })
  async getDashboard(@CurrentUser('id') userId: string) {
    const plans = await this.prisma.preparationPlan.findMany({
      where: { userId },
      include: { tasks: true },
    });

    const interviews = await this.prisma.mockInterview.findMany({
      where: { userId },
    });

    const goals = await this.prisma.careerGoal.findFirst({
      where: { userId },
    });

    let totalTasks = 0;
    let completedTasks = 0;
    plans.forEach(plan => {
      totalTasks += plan.tasks.length;
      completedTasks += plan.tasks.filter(t => t.status === 'COMPLETED').length;
    });

    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      goals,
      metrics: {
        totalPlans: plans.length,
        totalInterviews: interviews.length,
        progressPercentage: progress,
      },
      recentInterviews: interviews.slice(0, 5),
    };
  }

  @Get('application/:applicationId/follow-up')
  @ApiOperation({ summary: 'Get follow up guidance for an application' })
  async getApplicationFollowUp(
    @CurrentUser('id') userId: string,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
  ) {
    return this.followUpService.getFollowUpGuidance(userId, applicationId);
  }
}
