import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertCareerGoalDto } from '../dto/upsert-career-goal.dto';

@Injectable()
export class CareerGoalsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCareerGoals(userId: string) {
    const goals = await this.prisma.careerGoal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return goals;
  }

  async upsertCareerGoal(userId: string, dto: UpsertCareerGoalDto) {
    const existing = await this.prisma.careerGoal.findFirst({
      where: { userId },
    });

    if (existing) {
      return this.prisma.careerGoal.update({
        where: { id: existing.id },
        data: {
          ...(dto.targetRole && { targetRole: dto.targetRole }),
          ...(dto.targetCompany !== undefined && { targetCompany: dto.targetCompany }),
          ...(dto.targetDate && { targetDate: new Date(dto.targetDate) }),
          ...(dto.hoursPerWeek && { hoursPerWeek: dto.hoursPerWeek }),
        },
      });
    }

    return this.prisma.careerGoal.create({
      data: {
        userId,
        targetRole: dto.targetRole || 'Software Engineer Intern',
        targetCompany: dto.targetCompany ?? null,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : null,
        hoursPerWeek: dto.hoursPerWeek || 5,
      },
    });
  }

  async updateCareerGoal(id: string, userId: string, dto: UpsertCareerGoalDto) {
    const goal = await this.prisma.careerGoal.findUnique({
      where: { id },
    });

    if (!goal || goal.userId !== userId) {
      throw new NotFoundException('Career goal not found');
    }

    return this.prisma.careerGoal.update({
      where: { id },
      data: {
        ...(dto.targetRole && { targetRole: dto.targetRole }),
        ...(dto.targetCompany !== undefined && { targetCompany: dto.targetCompany }),
        ...(dto.targetDate && { targetDate: new Date(dto.targetDate) }),
        ...(dto.hoursPerWeek && { hoursPerWeek: dto.hoursPerWeek }),
      },
    });
  }
}
