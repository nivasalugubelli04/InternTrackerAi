import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Request,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CareerIntelligenceService, ScenarioInput } from '../services/career-intelligence.service';
import { CareerSnapshotService } from '../services/career-snapshot.service';

class ComparePathsDto {
  pathA!: string;
  pathB!: string;
}

class RunScenarioDto implements ScenarioInput {
  title!: string;
  actionDescription!: string;
  targetPathTitle?: string;
  estimatedEffortWeeks?: number;
}

@UseGuards(JwtAuthGuard)
@Controller('career-intelligence')
export class CareerIntelligenceController {
  constructor(
    private readonly intelligenceService: CareerIntelligenceService,
    private readonly snapshotService: CareerSnapshotService,
  ) {}

  /**
   * GET /career-intelligence/overview
   * Full Career Intelligence dashboard payload.
   */
  @Get('overview')
  async getOverview(@Request() req: any) {
    return this.intelligenceService.getCareerOverview(req.user.userId);
  }

  /**
   * GET /career-intelligence/state
   * Current raw career state (skills, projects, applications, etc.)
   */
  @Get('state')
  async getState(@Request() req: any) {
    return this.intelligenceService.buildCareerState(req.user.userId);
  }

  /**
   * GET /career-intelligence/paths
   * All generated career path analyses for the user.
   */
  @Get('paths')
  async getPaths(@Request() req: any) {
    return this.intelligenceService.generateCareerPaths(req.user.userId);
  }

  /**
   * GET /career-intelligence/paths/:title
   * Detail for a single career path.
   */
  @Get('paths/:title')
  async getPathDetail(@Request() req: any, @Param('title') title: string) {
    const paths = await this.intelligenceService.generateCareerPaths(req.user.userId);
    const decoded = decodeURIComponent(title);
    const path = paths.find((p) => p.pathTitle.toLowerCase() === decoded.toLowerCase());

    if (!path) {
      return {
        error: 'Path not found or insufficient evidence to assess for your profile.',
        availablePaths: paths.map((p) => p.pathTitle),
      };
    }

    return path;
  }

  /**
   * POST /career-intelligence/compare
   * Side-by-side comparison of two career paths.
   */
  @Post('compare')
  @HttpCode(HttpStatus.OK)
  async comparePaths(@Request() req: any, @Body() dto: ComparePathsDto) {
    return this.intelligenceService.compareCareerPaths(req.user.userId, dto.pathA, dto.pathB);
  }

  /**
   * POST /career-intelligence/scenarios
   * Run a what-if scenario analysis.
   */
  @Post('scenarios')
  @HttpCode(HttpStatus.CREATED)
  async runScenario(@Request() req: any, @Body() dto: RunScenarioDto) {
    return this.intelligenceService.runScenario(req.user.userId, dto);
  }

  /**
   * GET /career-intelligence/scenarios
   * List all saved scenarios for this user.
   */
  @Get('scenarios')
  async getScenarios(@Request() req: any) {
    const scenarios = await this.getScenarioList(req.user.userId);
    return scenarios;
  }

  /**
   * GET /career-intelligence/readiness
   * 8-dimension career readiness breakdown.
   */
  @Get('readiness')
  async getReadiness(@Request() req: any) {
    return this.intelligenceService.getCareerReadinessDimensions(req.user.userId);
  }

  /**
   * GET /career-intelligence/bottlenecks
   * Detected potential bottlenecks based on current profile.
   */
  @Get('bottlenecks')
  async getBottlenecks(@Request() req: any) {
    return this.intelligenceService.detectBottlenecks(req.user.userId);
  }

  /**
   * GET /career-intelligence/goal-conflicts
   * Goal overload and conflict detection.
   */
  @Get('goal-conflicts')
  async getGoalConflicts(@Request() req: any) {
    return this.intelligenceService.detectGoalConflicts(req.user.userId);
  }

  /**
   * GET /career-intelligence/trajectory
   * Computed career trajectory.
   */
  @Get('trajectory')
  async getTrajectory(@Request() req: any) {
    return this.intelligenceService.computeTrajectory(req.user.userId);
  }

  /**
   * GET /career-intelligence/evolution
   * Career evolution timeline via snapshot history.
   */
  @Get('evolution')
  async getEvolution(@Request() req: any) {
    return this.intelligenceService.getCareerEvolution(req.user.userId);
  }

  /**
   * GET /career-intelligence/snapshots
   * All historical snapshots for this user.
   */
  @Get('snapshots')
  async getSnapshots(@Request() req: any) {
    return this.snapshotService.getSnapshotHistory(req.user.userId);
  }

  /**
   * POST /career-intelligence/snapshots
   * Manually trigger a career snapshot.
   */
  @Post('snapshots')
  @HttpCode(HttpStatus.CREATED)
  async takeSnapshot(@Request() req: any) {
    return this.snapshotService.takeSnapshot(req.user.userId);
  }

  /**
   * GET /career-intelligence/insights
   * Career insights for this user.
   */
  @Get('insights')
  async getInsights(@Request() req: any) {
    const insights = await this.getInsightsList(req.user.userId);
    return insights;
  }

  // ─── Private helpers (inline Prisma queries for thin controller) ──────────

  private async getScenarioList(userId: string) {
    // Access prisma through service for user isolation
    const scenarios = await (this.intelligenceService as any).prisma.careerScenario.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        actionDescription: true,
        targetPathTitle: true,
        confidence: true,
        isApplied: true,
        createdAt: true,
      },
    });
    return scenarios;
  }

  private async getInsightsList(userId: string) {
    const insights = await (this.intelligenceService as any).prisma.careerInsight.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return insights;
  }
}
