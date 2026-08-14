import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { ReferralService } from '../services/referral.service';

@ApiTags('Referrals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('referrals')
export class ReferralController {
  constructor(
    private readonly referralService: ReferralService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('link')
  @ApiOperation({ summary: 'Get or generate user referral link' })
  async getReferralLink(@CurrentUser('id') userId: string) {
    const code = await this.referralService.getOrCreateReferralCode(userId);
    return {
      code,
      link: `https://interntracker.ai/invite/${code}`,
    };
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get referral dashboard stats' })
  async getDashboard(@CurrentUser('id') userId: string) {
    const referrals = await this.prisma.referral.findMany({
      where: { referrerId: userId, refereeId: { not: null } },
      include: { referee: { select: { firstName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const registered = referrals.filter((r) => r.status === 'REGISTERED').length;
    const qualified = referrals.filter(
      (r) => r.status === 'QUALIFIED' || r.status === 'REWARDED',
    ).length;

    const rewards = await this.prisma.referralReward.findMany({
      where: { userId },
    });

    return {
      invitedCount: referrals.length,
      registeredCount: registered,
      qualifiedCount: qualified,
      rewardsEarned: rewards,
      recentReferrals: referrals.slice(0, 10),
    };
  }

  @Get('rewards')
  @ApiOperation({ summary: 'Get user rewards' })
  async getRewards(@CurrentUser('id') userId: string) {
    return this.prisma.referralReward.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
