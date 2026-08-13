import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PlacementAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPlacementFunnel(orgId: string) {
    // 1. Get all students in the org with consent given
    const students = await this.prisma.organizationMember.findMany({
      where: { organizationId: orgId, role: 'STUDENT', status: 'ACTIVE', consentGiven: true },
      select: { userId: true },
    });
    
    const userIds = students.map((s) => s.userId);
    const totalStudents = userIds.length;

    // 2. Count metrics
    const [profilesCompleted, applications, interviews, offers] = await Promise.all([
      this.prisma.profile.count({ where: { userId: { in: userIds } } }), // basic check, real app uses a completeness score
      this.prisma.application.count({ where: { userId: { in: userIds } } }),
      this.prisma.applicationEvent.count({
        where: { application: { userId: { in: userIds } }, toStatus: 'INTERVIEWING' },
      }),
      this.prisma.application.count({ where: { userId: { in: userIds }, status: 'OFFER' } }),
    ]);

    return {
      funnel: {
        registered: totalStudents,
        profileCompleted: profilesCompleted,
        applicationsSubmitted: applications,
        interviewsSecured: interviews,
        offersReceived: offers,
      },
      conversionRates: {
        profileCompletion: totalStudents ? (profilesCompleted / totalStudents) * 100 : 0,
        applicationToInterview: applications ? (interviews / applications) * 100 : 0,
        interviewToOffer: interviews ? (offers / interviews) * 100 : 0,
      }
    };
  }

  async getSkillGaps(_orgId: string) {
    // A simplified mock of skill gaps analysis
    // Real implementation requires joining OrganizationMember -> UserSkill -> Skill
    return {
      topMissingSkills: [
        { name: 'Python', demandCount: 150, supplyCount: 30, gapPercentage: 80 },
        { name: 'React', demandCount: 120, supplyCount: 45, gapPercentage: 62 },
        { name: 'AWS', demandCount: 90, supplyCount: 10, gapPercentage: 88 },
      ],
      topSuppliedSkills: [
        { name: 'HTML', supplyCount: 200 },
        { name: 'Java', supplyCount: 180 },
      ]
    };
  }
}
