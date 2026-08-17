import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Request,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateLearningResourceDto,
  UpdateLearningResourceDto,
  CreateLearningModuleDto,
} from '../dto/learning.dto';

@ApiTags('Learning — Admin')
@ApiBearerAuth()
@Controller('api/v1/admin/learning')
export class AdminLearningController {
  constructor(private readonly prisma: PrismaService) {}

  private assertAdmin(req: any): void {
    if (!req.user || ![UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(req.user.role)) {
      throw new ForbiddenException('Admin access required.');
    }
  }

  // ── RESOURCES CRUD ─────────────────────────────────────────────────────────

  @Get('resources')
  @ApiOperation({ summary: 'List all resources' })
  async listResources(@Request() req: any) {
    this.assertAdmin(req);
    return this.prisma.learningResource.findMany({
      include: { skill: true },
    });
  }

  @Post('resources')
  @ApiOperation({ summary: 'Create a learning resource reference link' })
  async createResource(@Request() req: any, @Body() dto: CreateLearningResourceDto) {
    this.assertAdmin(req);
    return this.prisma.learningResource.create({
      data: {
        title: dto.title,
        provider: dto.provider,
        url: dto.url,
        contentType: dto.contentType,
        skillId: dto.skillId || null,
        difficulty: dto.difficulty,
        estimatedDuration: dto.estimatedDuration,
        status: 'ACTIVE',
      },
    });
  }

  @Patch('resources/:id')
  @ApiOperation({ summary: 'Update a learning resource' })
  async updateResource(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateLearningResourceDto,
  ) {
    this.assertAdmin(req);
    const res = await this.prisma.learningResource.findUnique({ where: { id } });
    if (!res) throw new NotFoundException('Resource not found');

    const updateData: any = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.url !== undefined) updateData.url = dto.url;
    if (dto.status !== undefined) updateData.status = dto.status;

    return this.prisma.learningResource.update({
      where: { id },
      data: updateData,
    });
  }

  @Delete('resources/:id')
  @ApiOperation({ summary: 'Delete a learning resource' })
  async deleteResource(@Request() req: any, @Param('id') id: string) {
    this.assertAdmin(req);
    const res = await this.prisma.learningResource.findUnique({ where: { id } });
    if (!res) throw new NotFoundException('Resource not found');

    await this.prisma.learningResource.delete({ where: { id } });
    return { success: true };
  }

  // ── MODULES CRUD ────────────────────────────────────────────────────────────

  @Get('modules')
  @ApiOperation({ summary: 'List all modules (admin)' })
  async listModules(@Request() req: any) {
    this.assertAdmin(req);
    return this.prisma.learningModule.findMany({
      include: { skill: true },
    });
  }

  @Post('modules')
  @ApiOperation({ summary: 'Create a learning template module' })
  async createModule(@Request() req: any, @Body() dto: CreateLearningModuleDto) {
    this.assertAdmin(req);
    return this.prisma.learningModule.create({
      data: {
        title: dto.title,
        description: dto.description || null,
        skillId: dto.skillId || null,
        level: dto.level,
        estimatedDuration: dto.estimatedDuration,
        prerequisites: dto.prerequisites || [],
        learningObjectives: dto.learningObjectives || [],
        contentType: dto.contentType,
        status: 'ACTIVE',
      },
    });
  }

  @Patch('modules/:id')
  @ApiOperation({ summary: 'Update a learning module' })
  async updateModule(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: Partial<CreateLearningModuleDto>,
  ) {
    this.assertAdmin(req);
    const m = await this.prisma.learningModule.findUnique({ where: { id } });
    if (!m) throw new NotFoundException('Module not found');

    return this.prisma.learningModule.update({
      where: { id },
      data: dto as any,
    });
  }

  // ── ANALYTICS ───────────────────────────────────────────────────────────────

  @Get('analytics')
  @ApiOperation({ summary: 'Get B2B / platform learning metrics' })
  async getAnalytics(@Request() req: any) {
    this.assertAdmin(req);
    const totalEnrollments = await this.prisma.learningEnrollment.count();
    const completedEnrollments = await this.prisma.learningEnrollment.count({
      where: { status: 'COMPLETED' },
    });
    const totalGoals = await this.prisma.learningGoal.count();

    return {
      totalEnrollments,
      completedEnrollments,
      completionRate:
        totalEnrollments > 0 ? (completedEnrollments / totalEnrollments) * 100.0 : 0.0,
      totalGoalsCreated: totalGoals,
    };
  }
}
