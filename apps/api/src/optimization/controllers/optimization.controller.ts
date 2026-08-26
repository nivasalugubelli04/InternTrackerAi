import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  RecordSignalDto,
  SubmitFeedbackDto,
  ApproveProposalDto,
  RejectProposalDto,
  ModifyProposalDto,
  CreateExperimentDto,
  UpdatePreferenceDto,
} from '../dto/optimization.dto';
import { EffectivenessMeasurementService } from '../services/effectiveness-measurement.service';
import { LearnedPreferenceService } from '../services/learned-preference.service';
import { OptimizationInsightService } from '../services/optimization-insight.service';
import { OptimizationService } from '../services/optimization.service';
import { SignalCollectorService } from '../services/signal-collector.service';
import { StrategyExperimentService } from '../services/strategy-experiment.service';
import { StrategyProposalService } from '../services/strategy-proposal.service';

@Controller('optimization')
@UseGuards(JwtAuthGuard)
export class OptimizationController {
  constructor(
    private readonly optimizationService: OptimizationService,
    private readonly signalCollector: SignalCollectorService,
    private readonly insightService: OptimizationInsightService,
    private readonly proposalService: StrategyProposalService,
    private readonly experimentService: StrategyExperimentService,
    private readonly preferenceService: LearnedPreferenceService,
    private readonly effectivenessService: EffectivenessMeasurementService,
  ) {}

  @Get('dashboard')
  async getDashboard(@Request() req: any) {
    return this.optimizationService.getDashboardData(req.user.id || req.user.userId);
  }

  @Get('insights')
  async getInsights(@Request() req: any) {
    return this.insightService.getInsights(req.user.id || req.user.userId);
  }

  @Post('signals')
  async recordSignal(@Request() req: any, @Body() dto: RecordSignalDto) {
    return this.signalCollector.recordSignal({
      userId: req.user.id || req.user.userId,
      signalType: dto.signalType,
      sourceEngine: dto.sourceEngine,
      entityType: dto.entityType,
      entityId: dto.entityId,
      payload: dto.payload,
      confidence: dto.confidence,
    });
  }

  @Post('feedback')
  async submitFeedback(@Request() req: any, @Body() dto: SubmitFeedbackDto) {
    return this.effectivenessService.recordRecommendationFeedback({
      userId: req.user.id || req.user.userId,
      recommendationId: dto.recommendationId,
      recommendationType: dto.recommendationType,
      response: dto.response,
      comment: dto.comment,
    });
  }

  @Get('effectiveness')
  async getEffectiveness(@Request() req: any) {
    return this.effectivenessService.getRecommendationEffectiveness(req.user.id || req.user.userId);
  }

  @Get('proposals')
  async getProposals(@Request() req: any) {
    return this.proposalService.generateProposals(req.user.id || req.user.userId);
  }

  @Post('proposals/:id/approve')
  async approveProposal(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: ApproveProposalDto,
  ) {
    return this.proposalService.approveProposal(
      req.user.id || req.user.userId,
      id,
      dto.customNotes,
    );
  }

  @Post('proposals/:id/reject')
  async rejectProposal(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: RejectProposalDto,
  ) {
    return this.proposalService.rejectProposal(
      req.user.id || req.user.userId,
      id,
      dto.rejectionReason,
    );
  }

  @Post('proposals/:id/modify')
  async modifyProposal(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: ModifyProposalDto,
  ) {
    return this.proposalService.modifyProposal(
      req.user.id || req.user.userId,
      id,
      dto.modifiedPayload,
    );
  }

  @Get('experiments')
  async getExperiments(@Request() req: any) {
    return this.experimentService.getExperiments(req.user.id || req.user.userId);
  }

  @Post('experiments')
  async createExperiment(@Request() req: any, @Body() dto: CreateExperimentDto) {
    return this.experimentService.createExperiment({
      userId: req.user.id || req.user.userId,
      title: dto.title,
      hypothesis: dto.hypothesis,
      durationDays: dto.durationDays,
      strategyA: dto.strategyA,
      strategyB: dto.strategyB,
    });
  }

  @Post('experiments/:id/stop')
  async stopExperiment(@Request() req: any, @Param('id') id: string) {
    return this.experimentService.stopExperiment(req.user.id || req.user.userId, id);
  }

  @Get('preferences')
  async getPreferences(@Request() req: any) {
    return this.preferenceService.getPreferences(req.user.id || req.user.userId);
  }

  @Patch('preferences/:id')
  async updatePreference(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdatePreferenceDto,
  ) {
    return this.preferenceService.updatePreference(req.user.id || req.user.userId, id, dto);
  }

  @Delete('preferences/:id')
  async deletePreference(@Request() req: any, @Param('id') id: string) {
    return this.preferenceService.deletePreference(req.user.id || req.user.userId, id);
  }
}
