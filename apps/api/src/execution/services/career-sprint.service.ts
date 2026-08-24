import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SprintStatus, SprintType } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { CareerSprintDto } from '../interfaces/execution.interfaces';

export interface CreateSprintInput {
  title: string;
  goal: string;
  sprintType: SprintType;
  durationDays?: number;
  startDate?: Date;
  keyMilestones?: string[];
  itemTitles?: string[];
}

@Injectable()
export class CareerSprintService {
  private readonly logger = new Logger(CareerSprintService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getActiveSprint(userId: string): Promise<CareerSprintDto | null> {
    const sprint = await this.prisma.careerSprint.findFirst({
      where: { userId, status: SprintStatus.ACTIVE },
      include: { items: { orderBy: { targetDay: 'asc' } } },
    });

    if (!sprint) return null;
    return this.mapToDto(sprint);
  }

  async getAllSprints(userId: string): Promise<CareerSprintDto[]> {
    const sprints = await this.prisma.careerSprint.findMany({
      where: { userId },
      include: { items: { orderBy: { targetDay: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });

    return sprints.map((s) => this.mapToDto(s));
  }

  async createSprint(userId: string, input: CreateSprintInput): Promise<CareerSprintDto> {
    const durationDays = input.durationDays || 7;
    const startDate = input.startDate || new Date();
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + durationDays);

    // Default item milestones if not supplied
    const itemTitles =
      input.itemTitles && input.itemTitles.length > 0
        ? input.itemTitles
        : [
            'Kickoff & Align Target Priorities',
            'Deep Execution Milestone 1',
            'Mid-Sprint Checkpoint & Practice',
            'Deep Execution Milestone 2',
            'Final Polish, Deployment & Verification',
          ];

    const sprint = await this.prisma.careerSprint.create({
      data: {
        userId,
        title: input.title,
        goal: input.goal,
        sprintType: input.sprintType,
        startDate,
        endDate,
        durationDays,
        status: SprintStatus.ACTIVE,
        progressPercent: 0,
        keyMilestones: input.keyMilestones || [input.goal],
        items: {
          create: itemTitles.map((title, idx) => ({
            title,
            targetDay: Math.min(
              durationDays,
              Math.floor(((idx + 1) / itemTitles.length) * durationDays) || 1,
            ),
            isMilestone: idx === itemTitles.length - 1,
            status: 'PENDING',
          })),
        },
      },
      include: { items: true },
    });

    this.logger.log(`Created sprint "${sprint.title}" for user ${userId}`);
    return this.mapToDto(sprint);
  }

  async completeSprintItem(
    userId: string,
    sprintId: string,
    itemId: string,
  ): Promise<CareerSprintDto> {
    const sprint = await this.prisma.careerSprint.findFirst({
      where: { id: sprintId, userId },
      include: { items: true },
    });
    if (!sprint) throw new NotFoundException('Sprint not found');

    await this.prisma.careerSprintItem.update({
      where: { id: itemId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });

    // Recompute sprint progress
    const updatedItems = await this.prisma.careerSprintItem.findMany({ where: { sprintId } });
    const completedCount = updatedItems.filter((i) => i.status === 'COMPLETED').length;
    const progressPercent = Math.round((completedCount / updatedItems.length) * 100);

    const updatedSprint = await this.prisma.careerSprint.update({
      where: { id: sprintId },
      data: {
        progressPercent,
        status: progressPercent === 100 ? SprintStatus.COMPLETED : sprint.status,
      },
      include: { items: { orderBy: { targetDay: 'asc' } } },
    });

    return this.mapToDto(updatedSprint);
  }

  async finishSprint(
    userId: string,
    sprintId: string,
    reflection?: string,
  ): Promise<CareerSprintDto> {
    const sprint = await this.prisma.careerSprint.findFirst({
      where: { id: sprintId, userId },
    });
    if (!sprint) throw new NotFoundException('Sprint not found');

    const updated = await this.prisma.careerSprint.update({
      where: { id: sprintId },
      data: {
        status: SprintStatus.COMPLETED,
        progressPercent: 100,
        reflection: reflection || 'Sprint successfully completed with focused execution.',
      },
      include: { items: { orderBy: { targetDay: 'asc' } } },
    });

    return this.mapToDto(updated);
  }

  private mapToDto(sprint: any): CareerSprintDto {
    return {
      id: sprint.id,
      title: sprint.title,
      goal: sprint.goal,
      sprintType: sprint.sprintType,
      startDate: sprint.startDate.toISOString(),
      endDate: sprint.endDate.toISOString(),
      durationDays: sprint.durationDays,
      status: sprint.status,
      progressPercent: sprint.progressPercent,
      reflection: sprint.reflection,
      keyMilestones: sprint.keyMilestones || [],
      items: (sprint.items || []).map((i: any) => ({
        id: i.id,
        title: i.title,
        isMilestone: i.isMilestone,
        status: i.status,
        targetDay: i.targetDay,
      })),
    };
  }
}
