import { Controller, Get, Param, Query, Request, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';

import { PrismaService } from '../prisma/prisma.service';

import { CareerPathService } from './services/career-path.service';
import { CareerRecommendationService } from './services/career-recommendation.service';
import { RoleTaxonomyService } from './services/role-taxonomy.service';
import { SkillGraphService } from './services/skill-graph.service';
import { TalentIntelligenceService } from './services/talent-intelligence.service';
import { SkillsService, SkillsQuery } from './skills.service';

@ApiTags('Skills, Roles & Career Paths')
@ApiBearerAuth()
@Controller('api/v1')
export class SkillsController {
  constructor(
    private readonly skillsService: SkillsService,
    private readonly skillGraphService: SkillGraphService,
    private readonly roleTaxonomyService: RoleTaxonomyService,
    private readonly careerPathService: CareerPathService,
    private readonly talentIntelligence: TalentIntelligenceService,
    private readonly careerRecommendation: CareerRecommendationService,
    private readonly prisma: PrismaService,
  ) {}

  // ── SKILLS CATALOG ─────────────────────────────────────────────────────────

  @Get('skills')
  @ApiOperation({ summary: 'Search skills catalog' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(@Query() query: SkillsQuery) {
    return this.skillsService.findAll(query);
  }

  @Get('skills/:id')
  @ApiOperation({ summary: 'Get skill details by ID' })
  async findById(@Param('id') id: string) {
    const skill = await this.skillsService.findById(id);
    if (!skill) throw new BadRequestException(`Skill with ID ${id} not found.`);
    return skill;
  }

  @Get('skills/:id/relationships')
  @ApiOperation({ summary: 'Get relationships for a skill' })
  getSkillRelationships(@Param('id') id: string) {
    return this.skillGraphService.getRelationships(id);
  }

  @Get('skills/:id/roles')
  @ApiOperation({ summary: 'Get roles requiring this skill' })
  async getRolesRequiringSkill(@Param('id') id: string) {
    return this.prisma.roleSkill.findMany({
      where: { skillId: id },
      include: { role: true },
    });
  }

  @Get('skills/:id/opportunities')
  @ApiOperation({ summary: 'Get internship opportunities requiring this skill' })
  async getOpportunitiesForSkill(@Param('id') id: string) {
    const skill = await this.findById(id);
    return this.prisma.jobPosting.findMany({
      where: {
        requirements: {
          has: skill.name,
        },
      },
      include: {
        company: true,
      },
      take: 20,
    });
  }

  // ── ROLES TAXONOMY ──────────────────────────────────────────────────────────

  @Get('roles')
  @ApiOperation({ summary: 'Get all roles' })
  getRoles() {
    return this.roleTaxonomyService.getRoles();
  }

  @Get('roles/:id')
  @ApiOperation({ summary: 'Get role details' })
  getRoleDetails(@Param('id') id: string) {
    return this.roleTaxonomyService.getRoleDetails(id);
  }

  @Get('roles/:id/skills')
  @ApiOperation({ summary: 'Get required/preferred skills for a role (including inherited)' })
  getRoleSkills(@Param('id') id: string) {
    return this.roleTaxonomyService.getInheritedSkills(id);
  }

  @Get('roles/:id/career-paths')
  @ApiOperation({ summary: 'Get career paths containing this role' })
  async getRoleCareerPaths(@Param('id') id: string) {
    return this.prisma.careerPath.findMany({
      where: {
        steps: {
          some: { roleId: id },
        },
      },
      include: {
        steps: {
          orderBy: { stepNumber: 'asc' },
          include: { role: true },
        },
      },
    });
  }

  // ── CAREER PATHS ────────────────────────────────────────────────────────────

  @Get('career-paths')
  @ApiOperation({ summary: 'Get all career paths' })
  getCareerPaths() {
    return this.careerPathService.getCareerPaths();
  }

  @Get('career-paths/:id')
  @ApiOperation({ summary: 'Get career path details' })
  getCareerPathDetails(@Param('id') id: string) {
    return this.careerPathService.getCareerPathDetails(id);
  }

  // ── PERSONAL CAREER GRAPH & RECOMMENDATIONS ────────────────────────────────

  @Get('career/next-skills')
  @ApiOperation({ summary: 'Get recommended next skills to learn for a target role' })
  @ApiQuery({ name: 'targetRoleId', required: true })
  getNextSkills(@Request() req: any, @Query('targetRoleId') targetRoleId: string) {
    if (!targetRoleId) throw new BadRequestException('targetRoleId query parameter is required.');
    const userId = req.user.id;
    return this.talentIntelligence.recommendNextBestSkills(userId, targetRoleId);
  }

  @Get('career/paths')
  @ApiOperation({ summary: 'Analyze and recommend fit on a target career path' })
  @ApiQuery({ name: 'careerPathId', required: true })
  getCareerPathFit(@Request() req: any, @Query('careerPathId') careerPathId: string) {
    if (!careerPathId) throw new BadRequestException('careerPathId query parameter is required.');
    const userId = req.user.id;
    return this.careerPathService.analyzePathGaps(userId, careerPathId);
  }

  @Get('career/skill-graph')
  @ApiOperation({ summary: 'Get user career recommendation fits (evidence-based AI reports)' })
  @ApiQuery({ name: 'targetRoleId', required: true })
  async getCareerSkillGraph(@Request() req: any, @Query('targetRoleId') targetRoleId: string) {
    if (!targetRoleId) throw new BadRequestException('targetRoleId query parameter is required.');
    const userId = req.user.id;

    // Check if there is an existing valid recommendation to cache/reuse
    const existing = await this.prisma.careerRecommendation.findFirst({
      where: {
        userId,
        targetRoleId,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) return existing;

    return this.careerRecommendation.generateRecommendation(userId, targetRoleId);
  }
}
