import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ExecutionItemStatus, SprintType } from '@prisma/client';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateSprintDto,
  DeprioritizeActionDto,
  GeneratePlanDto,
  RescheduleActionDto,
  SaveReviewNotesDto,
  UpdateExecutionPreferencesDto,
} from '../dto/execution.dto';
import { ActionDecompositionService } from '../services/action-decomposition.service';
import { AdaptiveReplanningService } from '../services/adaptive-replanning.service';
import { CareerSprintService } from '../services/career-sprint.service';
import { ExecutionEngineService } from '../services/execution-engine.service';
import { FocusSessionService } from '../services/focus-session.service';
import { WeeklyReviewService } from '../services/weekly-review.service';

@Controller('execution')
@UseGuards(JwtAuthGuard)
export class ExecutionController {
  constructor(
    private readonly executionEngine: ExecutionEngineService,
    private readonly sprintService: CareerSprintService,
    private readonly focusSessionService: FocusSessionService,
    private readonly weeklyReviewService: WeeklyReviewService,
    private readonly replanningService: AdaptiveReplanningService,
    private readonly decompositionService: ActionDecompositionService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('today')
  async getDailyPlan(@CurrentUser('id') userId: string, @Query('targetDate') targetDate?: string) {
    const date = targetDate ? new Date(targetDate) : new Date();
    return this.executionEngine.getDailyPlan(userId, date);
  }

  @Get('week')
  async getWeeklyPlan(@CurrentUser('id') userId: string) {
    return this.executionEngine.getWeeklyPlan(userId);
  }

  @Post('plan/generate')
  async generatePlan(@CurrentUser('id') userId: string, @Body() dto: GeneratePlanDto) {
    if (dto.planType === 'WEEKLY') {
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      return this.executionEngine.generateWeeklyPlan(userId, weekStart);
    }
    const targetDate = dto.targetDate ? new Date(dto.targetDate) : new Date();
    return this.executionEngine.generateDailyPlan(userId, targetDate);
  }

  @Get('replan/triggers')
  async getReplanTriggers(@CurrentUser('id') userId: string) {
    return this.replanningService.evaluateReplanTriggers(userId);
  }

  @Post('replan')
  async executeReplan(@CurrentUser('id') userId: string) {
    await this.executionEngine.generateDailyPlan(userId);
    return this.executionEngine.getDailyPlan(userId);
  }

  @Post('actions/:id/start')
  async startAction(@CurrentUser('id') _userId: string, @Param('id') id: string) {
    const item = await this.prisma.executionPlanItem.update({
      where: { id },
      data: {
        status: ExecutionItemStatus.IN_PROGRESS,
        startedAt: new Date(),
      },
    });
    return item;
  }

  @Post('actions/:id/complete')
  async completeAction(@CurrentUser('id') userId: string, @Param('id') id: string) {
    const item = await this.prisma.executionPlanItem.update({
      where: { id },
      data: {
        status: ExecutionItemStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    // If linked to CareerAction, complete that too
    if (item.actionId) {
      await this.prisma.careerAction.updateMany({
        where: { id: item.actionId, userId },
        data: { status: 'COMPLETED' },
      });
    }

    return item;
  }

  @Post('actions/:id/reschedule')
  async rescheduleAction(
    @CurrentUser('id') _userId: string,
    @Param('id') id: string,
    @Body() dto: RescheduleActionDto,
  ) {
    const item = await this.prisma.executionPlanItem.update({
      where: { id },
      data: {
        status: ExecutionItemStatus.RESCHEDULED,
        rescheduledTo: new Date(dto.rescheduledToDate),
      },
    });
    return item;
  }

  @Post('actions/:id/deprioritize')
  async deprioritizeAction(
    @CurrentUser('id') _userId: string,
    @Param('id') id: string,
    @Body() dto: DeprioritizeActionDto,
  ) {
    const status =
      dto.option === 'ARCHIVE' ? ExecutionItemStatus.ARCHIVED : ExecutionItemStatus.DEPRIORITIZED;

    const item = await this.prisma.executionPlanItem.update({
      where: { id },
      data: { status },
    });
    return item;
  }

  @Post('actions/:id/decompose')
  async decomposeAction(@CurrentUser('id') _userId: string, @Param('id') id: string) {
    const item = await this.prisma.executionPlanItem.findUnique({ where: { id } });
    if (!item) return [];

    const subSteps = this.decompositionService.decomposeAction({
      title: item.title,
      source: item.source as any,
      priority: item.priority,
      focusLevel: item.focusLevel as any,
      estimatedEffort: item.estimatedEffort,
      estimatedMinutes: item.estimatedMinutes,
      priorityExplanation: item.priorityExplanation || '',
      potentialImpact: item.potentialImpact || '',
      suggestedNextStep: item.suggestedNextStep || '',
    });

    await this.prisma.executionPlanItem.update({
      where: { id },
      data: { subSteps: subSteps as any },
    });

    return subSteps;
  }

  @Post('actions/:id/substeps/:stepId/toggle')
  async toggleSubStep(
    @CurrentUser('id') _userId: string,
    @Param('id') id: string,
    @Param('stepId') stepId: string,
  ) {
    const item = await this.prisma.executionPlanItem.findUnique({ where: { id } });
    if (!item || !item.subSteps) return null;

    const subSteps = (item.subSteps as any[]).map((step) => {
      if (step.id === stepId) {
        return { ...step, isCompleted: !step.isCompleted };
      }
      return step;
    });

    const allCompleted = subSteps.every((s) => s.isCompleted);

    const updated = await this.prisma.executionPlanItem.update({
      where: { id },
      data: {
        subSteps: subSteps as any,
        status: allCompleted ? ExecutionItemStatus.COMPLETED : item.status,
        completedAt: allCompleted ? new Date() : item.completedAt,
      },
    });

    return updated;
  }

  @Post('actions/:id/focus-session')
  async getFocusSession(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Query('duration') duration?: number,
  ) {
    return this.focusSessionService.createFocusSessionSuggestion(
      userId,
      id,
      duration ? Number(duration) : 60,
    );
  }

  @Get('sprints')
  async getSprints(@CurrentUser('id') userId: string) {
    return this.sprintService.getAllSprints(userId);
  }

  @Get('sprints/active')
  async getActiveSprint(@CurrentUser('id') userId: string) {
    return this.sprintService.getActiveSprint(userId);
  }

  @Post('sprints')
  async createSprint(@CurrentUser('id') userId: string, @Body() dto: CreateSprintDto) {
    return this.sprintService.createSprint(userId, {
      title: dto.title,
      goal: dto.goal,
      sprintType: dto.sprintType || SprintType.APPLICATION,
      durationDays: dto.durationDays || 7,
      ...(dto.keyMilestones ? { keyMilestones: dto.keyMilestones } : {}),
      ...(dto.itemTitles ? { itemTitles: dto.itemTitles } : {}),
    });
  }

  @Post('sprints/:sprintId/items/:itemId/complete')
  async completeSprintItem(
    @CurrentUser('id') userId: string,
    @Param('sprintId') sprintId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.sprintService.completeSprintItem(userId, sprintId, itemId);
  }

  @Get('workload')
  async getWorkload(@CurrentUser('id') userId: string) {
    const dailyPlan = await this.executionEngine.getDailyPlan(userId);
    return {
      workloadRisk: dailyPlan.workloadRisk,
      workloadReason: dailyPlan.workloadReason,
      totalEstimatedMinutes: dailyPlan.totalEstimatedMinutes,
      actionsCount: dailyPlan.todayActions.length + dailyPlan.laterTodayActions.length,
    };
  }

  @Get('review')
  async getReview(@CurrentUser('id') userId: string) {
    const review = await this.weeklyReviewService.getLatestReview(userId);
    if (!review) {
      return this.weeklyReviewService.generateWeeklyReview(userId);
    }
    return review;
  }

  @Post('review/generate')
  async generateReview(@CurrentUser('id') userId: string) {
    return this.weeklyReviewService.generateWeeklyReview(userId);
  }

  @Put('review/:id/notes')
  async saveReviewNotes(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: SaveReviewNotesDto,
  ) {
    return this.weeklyReviewService.saveReviewNotes(userId, id, dto.notes);
  }

  @Get('preferences')
  async getPreferences(@CurrentUser('id') userId: string) {
    let prefs = await this.prisma.userExecutionPreference.findUnique({
      where: { userId },
    });
    if (!prefs) {
      prefs = await this.prisma.userExecutionPreference.create({
        data: { userId },
      });
    }
    return prefs;
  }

  @Put('preferences')
  async updatePreferences(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateExecutionPreferencesDto,
  ) {
    const prefs = await this.prisma.userExecutionPreference.upsert({
      where: { userId },
      update: dto,
      create: { userId, ...dto },
    });
    return prefs;
  }
}
