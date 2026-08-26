import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';

import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import {
  SubmitFeedbackDto,
  SubmitContextualRatingDto,
  ReportBugDto,
  TrackAnalyticsEventDto,
  UpdateBetaOnboardingDto,
  InviteBetaUserDto,
} from '../dto/beta.dto';
import { BetaProgramService } from '../services/beta-program.service';
import { BetaService } from '../services/beta.service';
import { FeedbackCollectionService } from '../services/feedback-collection.service';
import { ProductAnalyticsService } from '../services/product-analytics.service';

@Controller('beta')
@UseGuards(JwtAuthGuard)
export class BetaController {
  constructor(
    private readonly betaService: BetaService,
    private readonly feedbackService: FeedbackCollectionService,
    private readonly analyticsService: ProductAnalyticsService,
    private readonly programService: BetaProgramService,
  ) {}

  // ---------------------------------------------------------------------------
  // User Feedback Endpoints
  // ---------------------------------------------------------------------------

  @Post('feedback')
  async submitFeedback(@Request() req: any, @Body() dto: SubmitFeedbackDto) {
    const userId = req.user.id || req.user.userId;
    return this.feedbackService.submitFeedback(userId, dto);
  }

  @Post('feedback/contextual')
  async submitContextualRating(@Request() req: any, @Body() dto: SubmitContextualRatingDto) {
    const userId = req.user.id || req.user.userId;
    return this.feedbackService.submitContextualRating(userId, dto);
  }

  @Post('bugs')
  async reportBug(@Request() req: any, @Body() dto: ReportBugDto) {
    const userId = req.user.id || req.user.userId;
    return this.feedbackService.reportBug(userId, dto);
  }

  @Get('feedback/my')
  async getMyFeedback(@Request() req: any) {
    const userId = req.user.id || req.user.userId;
    return this.feedbackService.getUserFeedback(userId);
  }

  // ---------------------------------------------------------------------------
  // Analytics & Activation Endpoints
  // ---------------------------------------------------------------------------

  @Post('analytics/events')
  async trackEvent(@Request() req: any, @Body() dto: TrackAnalyticsEventDto) {
    const userId = req.user.id || req.user.userId;
    return this.analyticsService.trackEvent({
      userId,
      eventName: dto.eventName,
      properties: dto.properties,
      sessionId: dto.sessionId,
      route: dto.route,
      deviceCategory: dto.deviceCategory,
      appVersion: dto.appVersion,
    });
  }

  @Get('activation')
  async getActivationStatus(@Request() req: any) {
    const userId = req.user.id || req.user.userId;
    return this.analyticsService.evaluateUserActivation(userId);
  }

  // ---------------------------------------------------------------------------
  // Beta Onboarding & Access Endpoints
  // ---------------------------------------------------------------------------

  @Get('onboarding')
  async getOnboardingState(@Request() req: any) {
    const userId = req.user.id || req.user.userId;
    return this.programService.getOnboardingState(userId);
  }

  @Patch('onboarding')
  async updateOnboardingState(@Request() req: any, @Body() dto: UpdateBetaOnboardingDto) {
    const userId = req.user.id || req.user.userId;
    return this.programService.updateOnboardingState(userId, dto);
  }

  @Post('invitations/redeem')
  async redeemInvitation(@Request() req: any, @Body('code') code: string) {
    const userId = req.user.id || req.user.userId;
    return this.programService.redeemInvitation(userId, code);
  }

  // ---------------------------------------------------------------------------
  // Admin & Internal Executive View
  // ---------------------------------------------------------------------------

  @Get('dashboard')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async getDashboardData() {
    return this.betaService.getDashboardData();
  }

  @Get('feedback/all')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async getAllFeedback() {
    return this.feedbackService.getAllFeedback();
  }

  @Patch('feedback/:id/status')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async updateFeedbackStatus(
    @Param('id') id: string,
    @Body('status') status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'IGNORED',
  ) {
    return this.feedbackService.updateFeedbackStatus(id, status);
  }

  @Post('invitations')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async createInvitation(@Request() req: any, @Body() dto: InviteBetaUserDto) {
    const adminUserId = req.user.id || req.user.userId;
    return this.programService.createInvitation(adminUserId, dto);
  }

  @Get('users')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async getBetaUsers() {
    return this.programService.getBetaUsers();
  }
}
