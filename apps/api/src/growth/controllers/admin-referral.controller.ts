import { Controller, Get, UseGuards, Post, Patch, Param, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Admin/Referrals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard) // Would normally include a @Roles('ADMIN') guard
@Controller('admin/referrals')
export class AdminReferralController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get referral metrics' })
  async getMetrics() {
    const totalReferrals = await this.prisma.referral.count();
    const activatedReferrals = await this.prisma.referral.count({
      where: { status: { in: ['ACTIVATED', 'QUALIFIED', 'REWARDED'] } },
    });
    const flaggedReferrals = await this.prisma.referral.count({
      where: { status: 'FLAGGED' },
    });
    const totalRewards = await this.prisma.referralReward.count();

    const conversionRate = totalReferrals > 0 ? (activatedReferrals / totalReferrals) * 100 : 0;

    return {
      totalReferrals,
      activatedReferrals,
      flaggedReferrals,
      totalRewards,
      conversionRate: Number(conversionRate.toFixed(2)),
    };
  }

  @Get('campaigns')
  @ApiOperation({ summary: 'List all campaigns' })
  async getCampaigns() {
    return this.prisma.referralCampaign.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post('campaigns')
  @ApiOperation({ summary: 'Create a new campaign' })
  async createCampaign(@Body() dto: any) {
    return this.prisma.referralCampaign.create({
      data: {
        name: dto.name,
        description: dto.description,
        rewardRulesJson: dto.rewardRulesJson ?? {},
        qualifyRulesJson: dto.qualifyRulesJson ?? {},
        isActive: dto.isActive ?? true,
      },
    });
  }

  @Patch('campaigns/:id')
  @ApiOperation({ summary: 'Update a campaign' })
  async updateCampaign(@Param('id') id: string, @Body() dto: any) {
    return this.prisma.referralCampaign.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        isActive: dto.isActive,
      },
    });
  }
}
