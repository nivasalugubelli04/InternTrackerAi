import { Injectable, Logger } from '@nestjs/common';

import { ReferralService } from '../../growth/services/referral.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EngagementTrackerService {
  private readonly logger = new Logger(EngagementTrackerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly referralService: ReferralService,
  ) {}

  /**
   * Called whenever a user performs a meaningful action (e.g., updating profile, saving a job).
   */
  async trackAction(userId: string, actionType: string) {
    this.logger.debug(`Action tracked: ${actionType} for user ${userId}`);

    // 1. Evaluate Achievements
    await this.evaluateAchievements(userId, actionType);

    // 2. Evaluate Referral Qualification (Since they might have just met the criteria)
    await this.referralService.evaluateQualification(userId);
  }

  private async evaluateAchievements(userId: string, actionType: string) {
    // Find achievements that match this action
    // In a real app, criteriaJson would be parsed to see if this action is relevant.
    // For MVP, we check specific hardcoded logic based on the actionType.

    let achievementName = null;

    if (actionType === 'PROFILE_COMPLETE') {
      const profile = await this.prisma.profile.findUnique({ where: { userId } });
      if (profile?.degree && profile?.college) {
        achievementName = 'Profile Complete';
      }
    } else if (actionType === 'COMPANY_TRACKED') {
      const count = await this.prisma.trackedCompany.count({ where: { userId } });
      if (count === 1) achievementName = 'First Company Tracked';
    } else if (actionType === 'JOB_SAVED') {
      const count = await this.prisma.savedJob.count({ where: { userId } });
      if (count === 1) achievementName = 'First Internship Saved';
    } else if (actionType === 'APPLICATION_CREATED') {
      const count = await this.prisma.application.count({ where: { userId } });
      if (count === 1) achievementName = 'First Application';
      if (count === 10) achievementName = '10 Applications';
    }

    if (achievementName) {
      const achievement = await this.prisma.achievement.findUnique({
        where: { name: achievementName },
      });

      if (achievement) {
        // Grant if not already granted
        const existing = await this.prisma.userAchievement.findUnique({
          where: { userId_achievementId: { userId, achievementId: achievement.id } },
        });

        if (!existing) {
          await this.prisma.userAchievement.create({
            data: {
              userId,
              achievementId: achievement.id,
            },
          });
          this.logger.log(`User ${userId} unlocked achievement: ${achievementName}`);
          // Could queue a push notification here
        }
      }
    }
  }
}
