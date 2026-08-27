import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { PrismaService } from '../../prisma/prisma.service';
import {
  RecordBehaviorEventDto,
  CreateProductImprovementDto,
  UpdateProductImprovementDto,
  CreateProductExperimentDto,
  UpdateProductExperimentDto,
  ImprovementPriority,
  ImprovementStatus,
} from '../dto/product-intelligence.dto';
import { ActivationFunnelService } from '../services/activation-funnel.service';
import { AiQualityMonitoringService } from '../services/ai-quality-monitoring.service';
import { FeatureAdoptionService } from '../services/feature-adoption.service';
import { FeedbackIntelligenceService } from '../services/feedback-intelligence.service';
import { JourneyFrictionService } from '../services/journey-friction.service';
import { MetricsRegistryService } from '../services/metrics-registry.service';
import { ProductExperimentService } from '../services/product-experiment.service';
import { ProductHealthService } from '../services/product-health.service';
import { ProductPrioritizationService } from '../services/product-prioritization.service';
import { RetentionCohortService } from '../services/retention-cohort.service';
import { WeeklyReviewService } from '../services/weekly-review.service';

@Controller('v1/product-intelligence')
export class ProductIntelligenceController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly healthService: ProductHealthService,
    private readonly metricsRegistry: MetricsRegistryService,
    private readonly funnelService: ActivationFunnelService,
    private readonly adoptionService: FeatureAdoptionService,
    private readonly frictionService: JourneyFrictionService,
    private readonly feedbackService: FeedbackIntelligenceService,
    private readonly aiQualityService: AiQualityMonitoringService,
    private readonly retentionService: RetentionCohortService,
    private readonly experimentService: ProductExperimentService,
    private readonly prioritizationService: ProductPrioritizationService,
    private readonly weeklyReviewService: WeeklyReviewService,
  ) {}

  // ── Public / Candidate Telemetry Event Ingestion ──────────────────────────────
  @Post('events')
  @UseGuards(JwtAuthGuard)
  async recordBehaviorEvent(@Req() req: any, @Body() dto: RecordBehaviorEventDto) {
    return this.prisma.userBehaviorEvent.create({
      data: {
        userId: req.user?.id ?? null,
        eventName: dto.eventName,
        featureName: dto.featureName,
        ...(dto.journeyStage ? { journeyStage: dto.journeyStage } : {}),
        ...(dto.sessionId ? { sessionId: dto.sessionId } : {}),
        ...(dto.properties ? { properties: dto.properties as any } : {}),
        isFriction: dto.isFriction ?? false,
        ...(dto.durationMs !== undefined ? { durationMs: dto.durationMs } : {}),
      },
    });
  }

  // ── Admin Intelligence Endpoints ─────────────────────────────────────────────

  @Get('health')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getHealthOverview() {
    return this.healthService.getHealthOverview();
  }

  @Get('metrics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getStandardMetrics() {
    return this.metricsRegistry.getStandardMetrics();
  }

  @Get('funnel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getActivationFunnel() {
    return this.funnelService.getActivationFunnel();
  }

  @Get('adoption')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getFeatureAdoption() {
    return this.adoptionService.getFeatureAdoptionMatrix();
  }

  @Get('friction')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getFrictionAndChurn() {
    const [frictionSignals, churnRiskProfiles] = await Promise.all([
      this.frictionService.detectFrictionSignals(),
      this.frictionService.getChurnRiskAnalysis(),
    ]);
    return { frictionSignals, churnRiskProfiles };
  }

  @Get('feedback-trends')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getFeedbackTrends() {
    const [trends, knowledgeGaps] = await Promise.all([
      this.feedbackService.getFeedbackTrends(),
      this.feedbackService.getKnowledgeGaps(),
    ]);
    return { trends, knowledgeGaps };
  }

  @Get('ai-quality')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getAiQuality() {
    return this.aiQualityService.getAiQualityReport();
  }

  @Get('retention')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getRetentionAndCohorts() {
    const [cohorts, correlations, engagementModel] = await Promise.all([
      this.retentionService.getCohortMatrix(),
      this.retentionService.getRetentionCorrelations(),
      this.retentionService.getEngagementModel(),
    ]);
    return { cohorts, correlations, engagementModel };
  }

  @Get('experiments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getExperiments() {
    return this.experimentService.getAllExperiments();
  }

  @Post('experiments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async createExperiment(@Body() dto: CreateProductExperimentDto) {
    return this.experimentService.createExperiment(dto);
  }

  @Patch('experiments/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async updateExperiment(@Param('id') id: string, @Body() dto: UpdateProductExperimentDto) {
    return this.experimentService.updateExperiment(id, dto);
  }

  @Get('improvements')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getImprovements(
    @Query('priority') priority?: ImprovementPriority,
    @Query('status') status?: ImprovementStatus,
    @Query('feature') feature?: string,
  ) {
    const filters: {
      priority?: ImprovementPriority;
      status?: ImprovementStatus;
      feature?: string;
    } = {};
    if (priority) filters.priority = priority;
    if (status) filters.status = status;
    if (feature) filters.feature = feature;
    return this.prioritizationService.getImprovementQueue(filters);
  }

  @Post('improvements')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async createImprovement(@Body() dto: CreateProductImprovementDto) {
    return this.prioritizationService.createImprovement(dto);
  }

  @Patch('improvements/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async updateImprovement(@Param('id') id: string, @Body() dto: UpdateProductImprovementDto) {
    return this.prioritizationService.updateImprovement(id, dto);
  }

  @Get('weekly-review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getWeeklyReview() {
    return this.weeklyReviewService.generateWeeklyReview();
  }
}
