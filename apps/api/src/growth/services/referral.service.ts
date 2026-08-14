import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ReferralStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Gets or creates a referral code for the user.
   */
  async getOrCreateReferralCode(userId: string): Promise<string> {
    // Find the default active campaign
    const campaign = await this.prisma.referralCampaign.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!campaign) {
      throw new BadRequestException('No active referral campaign found.');
    }

    const existing = await this.prisma.referral.findFirst({
      where: { referrerId: userId, campaignId: campaign.id, refereeId: null },
    });

    if (existing) {
      return existing.referralCode;
    }

    // Generate a unique 8-character code
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();

    await this.prisma.referral.create({
      data: {
        campaignId: campaign.id,
        referrerId: userId,
        referralCode: code,
        status: ReferralStatus.CREATED,
      },
    });

    return code;
  }

  /**
   * Processes a new user registration via a referral code.
   */
  async registerReferredUser(referralCode: string, newUserId: string): Promise<void> {
    const referral = await this.prisma.referral.findUnique({
      where: { referralCode },
    });

    if (!referral) return; // Invalid code, do nothing

    if (referral.referrerId === newUserId) {
      // Anti-abuse: Self-referral
      this.logger.warn(`Self-referral attempt by user ${newUserId}`);
      await this.prisma.referral.update({
        where: { id: referral.id },
        data: { status: ReferralStatus.FLAGGED },
      });
      return;
    }

    if (referral.status !== ReferralStatus.CREATED && referral.status !== ReferralStatus.CLICKED) {
      // A referral record was already used. We should create a new record for this specific referee
      // tying it to the same referrer and campaign.
      await this.prisma.referral.create({
        data: {
          campaignId: referral.campaignId,
          referrerId: referral.referrerId,
          refereeId: newUserId,
          referralCode: `${referral.referralCode}-${Math.random().toString(36).substring(2, 6)}`, // Unique proxy code
          status: ReferralStatus.REGISTERED,
        },
      });
      return;
    }

    // Update the existing base referral code record
    await this.prisma.referral.update({
      where: { id: referral.id },
      data: {
        refereeId: newUserId,
        status: ReferralStatus.REGISTERED,
      },
    });
  }

  /**
   * Evaluates if a referral has met the criteria to be qualified.
   */
  async evaluateQualification(refereeId: string): Promise<void> {
    const referral = await this.prisma.referral.findFirst({
      where: { refereeId, status: { in: [ReferralStatus.REGISTERED, ReferralStatus.ACTIVATED] } },
      include: { campaign: true },
    });

    if (!referral) return;

    // Default criteria: profile complete + tracked 1 company + saved 1 job
    const profile = await this.prisma.profile.findUnique({ where: { userId: refereeId } });
    const companies = await this.prisma.trackedCompany.count({ where: { userId: refereeId } });
    const savedJobs = await this.prisma.savedJob.count({ where: { userId: refereeId } });

    if (profile && companies >= 1 && savedJobs >= 1) {
      await this.prisma.referral.update({
        where: { id: referral.id },
        data: { status: ReferralStatus.QUALIFIED },
      });
      this.logger.log(`Referral ${referral.id} qualified for referee ${refereeId}`);

      // Grant rewards
      await this.grantRewards(referral);
    }
  }

  private async grantRewards(referral: any): Promise<void> {
    const rules = referral.campaign.rewardRulesJson;

    if (rules.referrerReward) {
      await this.prisma.referralReward.create({
        data: {
          referralId: referral.id,
          userId: referral.referrerId,
          rewardType: rules.referrerReward.type,
          rewardValue: rules.referrerReward.value,
        },
      });
      // Integrate with EntitlementService logic if needed, e.g., granting a free trial
      // by inserting a special Subscription row or bumping EntitlementUsage.
    }

    if (rules.refereeReward) {
      await this.prisma.referralReward.create({
        data: {
          referralId: referral.id,
          userId: referral.refereeId,
          rewardType: rules.refereeReward.type,
          rewardValue: rules.refereeReward.value,
        },
      });
    }

    await this.prisma.referral.update({
      where: { id: referral.id },
      data: { status: ReferralStatus.REWARDED },
    });
  }
}
