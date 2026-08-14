import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CareerProgressService {
  constructor(private readonly prisma: PrismaService) {}

  async getCareerJourney(userId: string) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    const userSkills = await this.prisma.userSkill.count({ where: { userId } });

    // Calculate naive profile completeness
    let profileScore = 0;
    if (profile) {
      if (profile.degree) profileScore += 25;
      if (profile.college) profileScore += 25;
      if (profile.graduationYear) profileScore += 25;
      if (userSkills > 0) profileScore += 25;
    }

    const trackedCompanies = await this.prisma.trackedCompany.count({ where: { userId } });
    const savedJobs = await this.prisma.savedJob.count({ where: { userId } });

    // Total applications
    const applications = await this.prisma.application.count({ where: { userId } });

    // Interviews and Offers
    const interviews = await this.prisma.application.count({
      where: { userId, status: 'INTERVIEW' },
    });
    const offers = await this.prisma.application.count({
      where: { userId, status: 'OFFER' },
    });

    // Unlocked Achievements
    const achievements = await this.prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
      orderBy: { unlockedAt: 'desc' },
    });

    return {
      profileCompletePercentage: profileScore,
      companiesTracked: trackedCompanies,
      opportunitiesSaved: savedJobs,
      totalApplications: applications,
      interviewsScheduled: interviews,
      offersReceived: offers,
      unlockedAchievements: achievements.map((a) => a.achievement),
    };
  }
}
