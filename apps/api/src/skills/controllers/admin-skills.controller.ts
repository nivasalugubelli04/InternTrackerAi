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
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole, SkillRelationType } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateSkillDto,
  UpdateSkillDto,
  CreateRelationshipDto,
  CreateRoleDto,
  LinkRoleSkillDto,
  CreateCareerPathDto,
} from '../dto/skill-graph.dto';
import { RoleTaxonomyService } from '../services/role-taxonomy.service';
import { SkillGraphService } from '../services/skill-graph.service';

@ApiTags('Skills — Admin')
@ApiBearerAuth()
@Controller('api/v1/admin')
export class AdminSkillsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly skillGraph: SkillGraphService,
    private readonly roleTaxonomy: RoleTaxonomyService,
  ) {}

  private assertAdmin(req: any): void {
    if (!req.user || ![UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(req.user.role)) {
      throw new ForbiddenException('Admin access required.');
    }
  }

  // ── SKILLS CRUD ─────────────────────────────────────────────────────────────

  @Get('skills')
  @ApiOperation({ summary: 'Get all skills with pagination for admin management' })
  async getSkills(
    @Request() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('search') search?: string,
  ) {
    this.assertAdmin(req);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.skill.findMany({
        where: search ? { name: { contains: search, mode: 'insensitive' } } : {},
        skip,
        take: Number(limit),
        orderBy: { name: 'asc' },
      }),
      this.prisma.skill.count({
        where: search ? { name: { contains: search, mode: 'insensitive' } } : {},
      }),
    ]);

    return { items, total, page, limit };
  }

  @Post('skills')
  @ApiOperation({ summary: 'Add a new skill to the taxonomy' })
  async createSkill(@Request() req: any, @Body() dto: CreateSkillDto) {
    this.assertAdmin(req);
    const existing = await this.prisma.skill.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new BadRequestException(`Skill with name "${dto.name}" already exists.`);
    }

    return this.prisma.skill.create({
      data: {
        name: dto.name,
        category: dto.category,
        description: dto.description ?? null,
        aliases: dto.aliases || [],
        status: 'ACTIVE',
      },
    });
  }

  @Patch('skills/:id')
  @ApiOperation({ summary: 'Update skill metadata' })
  async updateSkill(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateSkillDto) {
    this.assertAdmin(req);
    return this.prisma.skill.update({
      where: { id },
      data: dto,
    });
  }

  @Delete('skills/:id')
  @ApiOperation({ summary: 'Delete or disable a skill' })
  async deleteSkill(@Request() req: any, @Param('id') id: string) {
    this.assertAdmin(req);
    // Hard delete or status update (to prevent orphan records, let cascade handle it)
    await this.prisma.skill.delete({ where: { id } });
    return { success: true };
  }

  // ── RELATIONSHIPS CRUD ──────────────────────────────────────────────────────

  @Get('skill-relationships')
  @ApiOperation({ summary: 'List all skill relationships' })
  async getRelationships(@Request() req: any) {
    this.assertAdmin(req);
    return this.prisma.skillRelationship.findMany({
      include: {
        fromSkill: true,
        toSkill: true,
      },
    });
  }

  @Post('skill-relationships')
  @ApiOperation({ summary: 'Add or update a skill relationship' })
  async addRelationship(@Request() req: any, @Body() dto: CreateRelationshipDto) {
    this.assertAdmin(req);
    return this.skillGraph.addRelationship(
      dto.fromSkillId,
      dto.toSkillId,
      dto.relationType,
      dto.weight,
    );
  }

  @Delete('skill-relationships')
  @ApiOperation({ summary: 'Delete a skill relationship' })
  async deleteRelationship(
    @Request() req: any,
    @Query('fromSkillId') fromSkillId: string,
    @Query('toSkillId') toSkillId: string,
    @Query('relationType') relationType: SkillRelationType,
  ) {
    this.assertAdmin(req);
    if (!fromSkillId || !toSkillId || !relationType) {
      throw new BadRequestException(
        'fromSkillId, toSkillId, and relationType query params are required.',
      );
    }
    await this.skillGraph.removeRelationship(fromSkillId, toSkillId, relationType);
    return { success: true };
  }

  // ── ROLES CRUD ──────────────────────────────────────────────────────────────

  @Post('roles')
  @ApiOperation({ summary: 'Create a new canonical role category' })
  async createRole(@Request() req: any, @Body() dto: CreateRoleDto) {
    this.assertAdmin(req);
    return this.prisma.role.create({
      data: {
        name: dto.name,
        category: dto.category ?? null,
        description: dto.description ?? null,
        parentId: dto.parentId ?? null,
      },
    });
  }

  @Post('roles/:id/skills')
  @ApiOperation({ summary: 'Link a skill to a role' })
  async linkRoleSkill(
    @Request() req: any,
    @Param('id') roleId: string,
    @Query('skillId') skillId: string,
    @Body() dto: LinkRoleSkillDto,
  ) {
    this.assertAdmin(req);
    return this.roleTaxonomy.linkRoleSkill(roleId, skillId, dto);
  }

  @Delete('roles/:id/skills')
  @ApiOperation({ summary: 'Unlink a skill from a role' })
  async unlinkRoleSkill(
    @Request() req: any,
    @Param('id') roleId: string,
    @Query('skillId') skillId: string,
  ) {
    this.assertAdmin(req);
    await this.roleTaxonomy.unlinkRoleSkill(roleId, skillId);
    return { success: true };
  }

  // ── CAREER PATHS CRUD ───────────────────────────────────────────────────────

  @Post('career-paths')
  @ApiOperation({ summary: 'Create a new career path' })
  async createCareerPath(@Request() req: any, @Body() dto: CreateCareerPathDto) {
    this.assertAdmin(req);
    return this.prisma.careerPath.create({
      data: {
        title: dto.title,
        description: dto.description ?? null,
      },
    });
  }

  // ── MANUAL GRAPH REBUILD ────────────────────────────────────────────────────

  @Post('graph/rebuild')
  @ApiOperation({ summary: 'Trigger async manual recalculation of demand signals' })
  async rebuildGraph(@Request() req: any) {
    this.assertAdmin(req);
    // Since background queue is used, we can schedule a job (we will construct this job in Milestone 9)
    return { success: true, message: 'Skill graph rebuild triggered successfully.' };
  }
}
