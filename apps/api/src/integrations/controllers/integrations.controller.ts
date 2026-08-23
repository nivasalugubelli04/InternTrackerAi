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
import { IntegrationProviderType } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { IntegrationFrameworkService } from '../services/integration-framework.service';
import { IntegrationSyncSchedulerService } from '../services/integration-sync-scheduler.service';
import { ExternalReviewCenterService } from '../services/external-review-center.service';
import { CareerDataSyncService } from '../services/career-data-sync.service';

class ConnectIntegrationDto {
  provider!: IntegrationProviderType;
  code?: string;
  redirectUri?: string;
  customData?: Record<string, any>;
}

class ApproveReviewDto {
  customPayload?: Record<string, any>;
}

class MergeReviewDto {
  targetEntityId!: string;
}

@UseGuards(JwtAuthGuard)
@Controller('integrations')
export class IntegrationsController {
  constructor(
    private readonly frameworkService: IntegrationFrameworkService,
    private readonly syncScheduler: IntegrationSyncSchedulerService,
    private readonly reviewCenter: ExternalReviewCenterService,
    private readonly careerDataSync: CareerDataSyncService,
  ) {}

  /**
   * GET /integrations/providers
   * Returns list of all integration providers, manifests, and connection status for the user.
   */
  @Get('providers')
  async getProvidersStatus(@Request() req: any) {
    return this.frameworkService.getProvidersStatus(req.user.userId);
  }

  /**
   * POST /integrations/connect
   * Connects an integration provider for the user.
   */
  @Post('connect')
  @HttpCode(HttpStatus.CREATED)
  async connectIntegration(@Request() req: any, @Body() dto: ConnectIntegrationDto) {
    const authParams: { code?: string; redirectUri?: string; customData?: Record<string, any> } = {};
    if (dto.code) authParams.code = dto.code;
    if (dto.redirectUri) authParams.redirectUri = dto.redirectUri;
    if (dto.customData) authParams.customData = dto.customData;

    const integration = await this.frameworkService.connectIntegration(
      req.user.userId,
      dto.provider,
      authParams,
    );

    // Trigger initial sync automatically upon successful connection
    try {
      await this.syncScheduler.triggerSync(req.user.userId, dto.provider, 'INITIAL');
    } catch {
      // Non-fatal — sync error is recorded in database
    }

    return integration;
  }

  /**
   * POST /integrations/:id/disconnect
   * Disconnects an integration and purges stored credentials.
   */
  @Post(':id/disconnect')
  @HttpCode(HttpStatus.OK)
  async disconnectIntegration(@Request() req: any, @Param('id') id: string) {
    return this.frameworkService.disconnectIntegration(req.user.userId, id);
  }

  /**
   * POST /integrations/:provider/sync
   * Triggers a manual sync for an active integration.
   */
  @Post(':provider/sync')
  @HttpCode(HttpStatus.OK)
  async triggerSync(@Request() req: any, @Param('provider') provider: IntegrationProviderType) {
    return this.syncScheduler.triggerSync(req.user.userId, provider, 'MANUAL');
  }

  /**
   * GET /integrations/review/pending
   * Returns pending staging items in the External Data Review Center.
   */
  @Get('review/pending')
  async getPendingReviews(@Request() req: any) {
    return this.reviewCenter.getPendingReviews(req.user.userId);
  }

  /**
   * GET /integrations/review/history
   * Returns historical decisions in the External Data Review Center.
   */
  @Get('review/history')
  async getReviewHistory(@Request() req: any) {
    return this.reviewCenter.getReviewHistory(req.user.userId);
  }

  /**
   * POST /integrations/review/:id/approve
   * User approves a staged record -> propagates to Career State & Evidence Graph.
   */
  @Post('review/:id/approve')
  @HttpCode(HttpStatus.OK)
  async approveReview(
    @Request() req: any,
    @Param('id') reviewId: string,
    @Body() dto: ApproveReviewDto,
  ) {
    const approvedReview = await this.reviewCenter.approveReview(
      req.user.userId,
      reviewId,
      dto.customPayload,
    );

    // Propagate approved record to downstream engines (Portfolio, Evidence Graph, Career State)
    await this.careerDataSync.propagateApprovedRecord(
      req.user.userId,
      approvedReview.record.recordType,
      approvedReview.record.normalizedJson as any,
    );

    return approvedReview;
  }

  /**
   * POST /integrations/review/:id/reject
   * User rejects a staged record.
   */
  @Post('review/:id/reject')
  @HttpCode(HttpStatus.OK)
  async rejectReview(@Request() req: any, @Param('id') reviewId: string) {
    return this.reviewCenter.rejectReview(req.user.userId, reviewId);
  }

  /**
   * POST /integrations/review/:id/merge
   * User merges a staged record into an existing entity.
   */
  @Post('review/:id/merge')
  @HttpCode(HttpStatus.OK)
  async mergeReview(
    @Request() req: any,
    @Param('id') reviewId: string,
    @Body() dto: MergeReviewDto,
  ) {
    return this.reviewCenter.mergeReview(req.user.userId, reviewId, dto.targetEntityId);
  }

  /**
   * POST /integrations/review/:id/ignore
   * User ignores a staged record.
   */
  @Post('review/:id/ignore')
  @HttpCode(HttpStatus.OK)
  async ignoreReview(@Request() req: any, @Param('id') reviewId: string) {
    return this.reviewCenter.ignoreReview(req.user.userId, reviewId);
  }

  /**
   * GET /integrations/events
   * Returns integration security & activity audit logs.
   */
  @Get('events')
  async getIntegrationEvents(@Request() req: any) {
    const events = await (this.frameworkService as any).prisma.integrationEventLog.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    return events;
  }
}
