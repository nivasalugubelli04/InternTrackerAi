import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Request,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateLearningGoalDto,
  UpdateLearningGoalDto,
  SubmitPracticeAttemptDto,
  AddSkillEvidenceDto,
} from '../dto/learning.dto';
import { LearningCoachService } from '../services/learning-coach.service';
import { PracticeService } from '../services/practice.service';
import { RoadmapGenerationService } from '../services/roadmap-generation.service';
import { SkillMasteryService } from '../services/skill-mastery.service';

@ApiTags('Learning — Students')
@ApiBearerAuth()
@Controller('api/v1/learning')
export class LearningController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roadmapGen: RoadmapGenerationService,
    private readonly practice: PracticeService,
    private readonly skillMastery: SkillMasteryService,
    private readonly coach: LearningCoachService,
  ) {}

  private getUserId(req: any): string {
    if (!req.user?.id) {
      throw new ForbiddenException('User authentication required.');
    }
    return req.user.id;
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

  @Get('roadmaps/:id')
  @ApiOperation({ summary: 'Get roadmap details' })
  async getRoadmap(@Request() req: any, @Param('id') id: string) {
    const userId = this.getUserId(req);
    const roadmap = await this.prisma.learningRoadmap.findUnique({ where: { id } });
    if (!roadmap || roadmap.userId !== userId) throw new NotFoundException('Roadmap not found');
    return roadmap;
  }

  @Post('roadmaps/:id/regenerate')
  @ApiOperation({ summary: 'Regenerate current roadmap with updated goals/skills progress' })
  async regenerateRoadmap(
    @Request() req: any,
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    const userId = this.getUserId(req);
    const roadmap = await this.prisma.learningRoadmap.findUnique({ where: { id } });
    if (!roadmap || roadmap.userId !== userId) throw new NotFoundException('Roadmap not found');
    if (!roadmap.goalId) throw new BadRequestException('Roadmap has no bound goal');

    return this.roadmapGen.generateRoadmap(userId, roadmap.goalId, reason);
  }

  // ── MODULES & ENROLLMENTS ────────────────────────────────────────────────────

  @Get('modules')
  @ApiOperation({ summary: 'Get modules catalogue' })
  async listModules() {
    return this.prisma.learningModule.findMany({
      where: { status: 'ACTIVE' },
    });
  }

  @Get('modules/:id')
  @ApiOperation({ summary: 'Get learning module details' })
  async getModule(@Param('id') id: string) {
    const m = await this.prisma.learningModule.findUnique({ where: { id } });
    if (!m) throw new NotFoundException('Module not found');
    return m;
  }

  @Post('modules/:id/start')
  @ApiOperation({ summary: 'Enroll and start study on module' })
  async startModule(@Request() req: any, @Param('id') id: string) {
    const userId = this.getUserId(req);
    const module = await this.prisma.learningModule.findUnique({ where: { id } });
    if (!module) throw new NotFoundException('Module not found');

    const existing = await this.prisma.learningEnrollment.findFirst({
      where: { userId, moduleId: id },
    });
    if (existing) return existing;

    return this.prisma.learningEnrollment.create({
      data: {
        userId,
        moduleId: id,
        status: 'IN_PROGRESS',
        progress: 0.1,
      },
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

    // Save skill evidence if this module is linked to a skill
    const module = await this.prisma.learningModule.findUnique({
      where: { id },
    });
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

  // ── EVIDENCE & PROGRESS ──────────────────────────────────────────────────────

  @Get('progress')
  @ApiOperation({ summary: 'Get user overall roadmap and goal consistency progress' })
  async getProgressOverview(@Request() req: any) {
    const userId = this.getUserId(req);
    const enrollments = await this.prisma.learningEnrollment.findMany({
      where: { userId },
      include: { module: true },
    });

    const goals = await this.prisma.learningGoal.findMany({
      where: { userId },
    });

    return {
      totalEnrolledModules: enrollments.length,
      completedModules: enrollments.filter((e) => e.status === 'COMPLETED').length,
      activeGoals: goals.filter((g) => g.status === 'ACTIVE').length,
      completedGoals: goals.filter((g) => g.status === 'COMPLETED').length,
    };
  }

  @Post('evidence')
  @ApiOperation({ summary: 'Submit manual evidence or sync choice options' })
  async addEvidence(@Request() req: any, @Body() dto: AddSkillEvidenceDto) {
    const userId = this.getUserId(req);
    return this.prisma.skillEvidence.create({
      data: {
        userId,
        skillId: dto.skillId,
        evidenceType: dto.evidenceType,
        referenceId: dto.referenceId || null,
        score: dto.score,
        description: dto.description || null,
      },
    });
  }

  @Get('skills/:skillId/sync-check')
  @ApiOperation({ summary: 'Get profile addition options (sync choice validation)' })
  async syncCheck(@Request() req: any, @Param('skillId') skillId: string) {
    const userId = this.getUserId(req);
    return this.skillMastery.getProfileSyncOptions(userId, skillId);
  }

  @Post('skills/:skillId/sync')
  @ApiOperation({ summary: 'Confirm choice to sync developed skill to public profile' })
  async syncConfirm(
    @Request() req: any,
    @Param('skillId') skillId: string,
    @Body('choice') choice: 'ADD' | 'KEEP_LEARNING' | 'REJECT',
  ) {
    const userId = this.getUserId(req);
    return this.skillMastery.processProfileSync(userId, skillId, choice);
  }

  // ── COACH / AI ASSISTANT ─────────────────────────────────────────────────────

  @Post('coach/explain')
  @ApiOperation({ summary: 'AI Coach concept explanations' })
  async explain(
    @Request() req: any,
    @Body('skillId') skillId: string,
    @Body('concept') concept: string,
  ) {
    const userId = this.getUserId(req);
    const explanation = await this.coach.explainConcept(userId, skillId, concept);
    return { explanation };
  }

  // ── PRACTICE ─────────────────────────────────────────────────────────────────

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
    return this.practice.submitAttempt(userId, id, dto.answer, dto.timeSpentSeconds);
  }
}
