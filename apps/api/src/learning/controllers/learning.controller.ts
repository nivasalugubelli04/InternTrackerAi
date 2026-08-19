import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateLearningGoalDto,
  UpdateLearningGoalDto,
  SubmitPracticeAttemptDto,
} from '../dto/learning.dto';
import { AdaptiveRoadmapService } from '../services/adaptive-roadmap.service';
import { CareerReadinessService } from '../services/career-readiness.service';
import { DailyPlanService } from '../services/daily-plan.service';
import { CoachIntent, LearningCoachService } from '../services/learning-coach.service';
import { LearningSyncService } from '../services/learning-sync.service';
import { PracticeService } from '../services/practice.service';
import { ProjectRecommendationService } from '../services/project-recommendation.service';
import { RoadmapGenerationService } from '../services/roadmap-generation.service';
import { SkillGapEngineService } from '../services/skill-gap-engine.service';

@ApiTags('Learning — Career Intelligence')
@ApiBearerAuth()
@Controller('api/v1/learning')
export class LearningController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roadmapGen: RoadmapGenerationService,
    private readonly practice: PracticeService,
    private readonly coach: LearningCoachService,
    private readonly skillGapEngine: SkillGapEngineService,
    private readonly adaptiveRoadmap: AdaptiveRoadmapService,
    private readonly readiness: CareerReadinessService,
    private readonly dailyPlan: DailyPlanService,
    private readonly projectRec: ProjectRecommendationService,
    private readonly sync: LearningSyncService,
  ) {}

  private getUserId(req: any): string {
    if (!req.user?.id) {
      throw new ForbiddenException('User authentication required.');
    }
    return req.user.id;
  }

  // ── PHASE 35: CAREER ROADMAP & READINESS ───────────────────────────────────

  @Get('adaptive-roadmap')
  @ApiOperation({ summary: 'Get active 7-phase adaptive career roadmap' })
  async getAdaptiveRoadmap(@Request() req: any) {
    const userId = this.getUserId(req);
    return this.adaptiveRoadmap.getActiveRoadmap(userId);
  }

  @Post('adaptive-roadmap/generate')
  @ApiOperation({ summary: 'Generate or adapt 7-phase career roadmap' })
  async generateAdaptiveRoadmap(
    @Request() req: any,
    @Body('targetRole') targetRole?: string,
    @Body('timelineDays') timelineDays?: number,
    @Body('reason') reason?: string,
  ) {
    const userId = this.getUserId(req);
    return this.adaptiveRoadmap.generateOrAdaptRoadmap(
      userId,
      targetRole,
      timelineDays || 60,
      reason,
    );
  }

  @Get('readiness')
  @ApiOperation({ summary: 'Get transparent multi-dimensional Career Readiness score' })
  async getCareerReadiness(@Request() req: any) {
    const userId = this.getUserId(req);
    return this.readiness.computeReadiness(userId);
  }

  @Get('skill-gaps')
  @ApiOperation({ summary: 'Get multi-signal skill gaps & high-impact skills' })
  async getSkillGaps(@Request() req: any, @Query('targetRole') targetRole?: string) {
    const userId = this.getUserId(req);
    return this.skillGapEngine.analyzeSkillGap(userId, targetRole);
  }

  @Get('daily-plan')
  @ApiOperation({ summary: 'Get today budgeted learning schedule' })
  async getDailyPlan(@Request() req: any, @Query('minutes') minutes?: string) {
    const userId = this.getUserId(req);
    const parsedMinutes = minutes ? parseInt(minutes, 10) : undefined;
    return this.dailyPlan.getDailyPlan(userId, parsedMinutes);
  }

  @Get('projects/recommended')
  @ApiOperation({ summary: 'Get recommended portfolio projects' })
  async getRecommendedProjects(@Request() req: any) {
    const userId = this.getUserId(req);
    return this.projectRec.getRecommendedProjects(userId);
  }

  @Post('projects/:id/complete')
  @ApiOperation({ summary: 'Mark recommended project as completed and award skill evidence' })
  async completeProject(
    @Request() req: any,
    @Param('id') id: string,
    @Body('repoUrl') repoUrl?: string,
  ) {
    const userId = this.getUserId(req);
    const res = await this.projectRec.completeProject(userId, id, repoUrl);
    await this.sync.syncLearningProgress(userId);
    return res;
  }

  @Post('ai/coach')
  @ApiOperation({ summary: 'Query AI Learning Coach' })
  async queryAiCoach(
    @Request() req: any,
    @Body('query') query: string,
    @Body('intent') intent?: CoachIntent,
    @Body('skillId') skillId?: string,
  ) {
    const userId = this.getUserId(req);
    return this.coach.queryCoach(userId, query, intent || 'EXPLAIN', skillId);
  }

  // ── GOALS ──────────────────────────────────────────────────────────────────

  @Get('goals')
  @ApiOperation({ summary: 'List all user learning goals' })
  async listGoals(@Request() req: any) {
    const userId = this.getUserId(req);
    return this.prisma.learningGoal.findMany({
      where: { userId },
      include: { targetSkill: true },
    });
  }

  @Post('goals')
  @ApiOperation({ summary: 'Create a new learning goal' })
  async createGoal(@Request() req: any, @Body() dto: CreateLearningGoalDto) {
    const userId = this.getUserId(req);
    return this.prisma.learningGoal.create({
      data: {
        userId,
        title: dto.title,
        targetRole: dto.targetRole || null,
        targetSkillId: dto.targetSkillId || null,
        description: dto.description || null,
        priority: dto.priority,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : null,
        status: 'NOT_STARTED',
      },
    });
  }

  @Get('goals/:id')
  @ApiOperation({ summary: 'Get learning goal details' })
  async getGoal(@Request() req: any, @Param('id') id: string) {
    const userId = this.getUserId(req);
    const goal = await this.prisma.learningGoal.findUnique({
      where: { id },
    });
    if (!goal || goal.userId !== userId) throw new NotFoundException('Goal not found');
    return goal;
  }

  @Patch('goals/:id')
  @ApiOperation({ summary: 'Update a learning goal' })
  async updateGoal(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateLearningGoalDto,
  ) {
    const userId = this.getUserId(req);
    const goal = await this.prisma.learningGoal.findUnique({ where: { id } });
    if (!goal || goal.userId !== userId) throw new NotFoundException('Goal not found');

    const updateData: any = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description ?? null;
    if (dto.priority !== undefined) updateData.priority = dto.priority;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.targetDate !== undefined)
      updateData.targetDate = dto.targetDate ? new Date(dto.targetDate) : null;

    return this.prisma.learningGoal.update({
      where: { id },
      data: updateData,
    });
  }

  @Delete('goals/:id')
  @ApiOperation({ summary: 'Delete a learning goal' })
  async deleteGoal(@Request() req: any, @Param('id') id: string) {
    const userId = this.getUserId(req);
    const goal = await this.prisma.learningGoal.findUnique({ where: { id } });
    if (!goal || goal.userId !== userId) throw new NotFoundException('Goal not found');

    await this.prisma.learningGoal.delete({ where: { id } });
    return { success: true };
  }

  // ── ROADMAPS ────────────────────────────────────────────────────────────────

  @Get('roadmaps')
  @ApiOperation({ summary: 'Get current user learning roadmaps' })
  async listRoadmaps(@Request() req: any) {
    const userId = this.getUserId(req);
    return this.prisma.learningRoadmap.findMany({
      where: { userId },
    });
  }

  @Post('roadmaps')
  @ApiOperation({ summary: 'Generate a personalized roadmap for a goal' })
  async generateRoadmap(@Request() req: any, @Body('goalId') goalId: string) {
    const userId = this.getUserId(req);
    return this.roadmapGen.generateRoadmap(userId, goalId);
  }

  // ── MODULES & PRACTICE ─────────────────────────────────────────────────────

  @Get('modules')
  @ApiOperation({ summary: 'Get modules catalogue' })
  async listModules() {
    return this.prisma.learningModule.findMany({
      where: { status: 'ACTIVE' },
    });
  }

  @Post('modules/:id/complete')
  @ApiOperation({ summary: 'Mark module study as completed' })
  async completeModule(@Request() req: any, @Param('id') id: string) {
    const userId = this.getUserId(req);
    const enrollment = await this.prisma.learningEnrollment.findFirst({
      where: { userId, moduleId: id },
    });
    if (!enrollment)
      throw new NotFoundException('Enrollment record not found. Start module first.');

    const module = await this.prisma.learningModule.findUnique({ where: { id } });
    if (module?.skillId) {
      await this.prisma.skillEvidence.create({
        data: {
          userId,
          skillId: module.skillId,
          evidenceType: 'CODING_EXERCISE',
          referenceId: enrollment.id,
          score: 100.0,
          description: `Completed module study: "${module.title}"`,
        },
      });
      await this.sync.syncLearningProgress(userId, module.skillId);
    }

    return this.prisma.learningEnrollment.update({
      where: { id: enrollment.id },
      data: {
        status: 'COMPLETED',
        progress: 1.0,
        completedAt: new Date(),
      },
    });
  }

  @Get('skills/:skillId/practice')
  @ApiOperation({ summary: 'Get adaptive practice activities' })
  async getPractice(@Request() req: any, @Param('skillId') skillId: string) {
    const userId = this.getUserId(req);
    return this.practice.getAdaptiveActivities(userId, skillId);
  }

  @Post('activities/:id/submit')
  @ApiOperation({ summary: 'Submit practice attempt answers' })
  async submitAnswer(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: SubmitPracticeAttemptDto,
  ) {
    const userId = this.getUserId(req);
    const result = await this.practice.submitAttempt(userId, id, dto.answer, dto.timeSpentSeconds);
    const activity = await this.prisma.practiceActivity.findUnique({ where: { id } });
    if (activity?.skillId) {
      await this.sync.syncLearningProgress(userId, activity.skillId);
    }
    return result;
  }
}
