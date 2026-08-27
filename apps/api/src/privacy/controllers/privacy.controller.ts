import { Controller, Get, Post, Put, Body, UseGuards, Req } from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  RecordConsentDto,
  UpdatePrivacyPreferencesDto,
  RequestAccountDeletionDto,
} from '../dto/privacy.dto';
import { PrivacyControlService } from '../services/privacy-control.service';
import { PrivacyService, UpdateDiscoverabilityDto } from '../services/privacy.service';

@Controller('v1/privacy')
@UseGuards(JwtAuthGuard)
export class PrivacyController {
  constructor(
    private readonly privacyService: PrivacyService,
    private readonly privacyControlService: PrivacyControlService,
  ) {}

  @Get('overview')
  async getPrivacyOverview(@Req() req: any) {
    return this.privacyControlService.getPrivacyOverview(req.user.id);
  }

  @Post('consent')
  async recordConsent(@Req() req: any, @Body() body: RecordConsentDto) {
    return this.privacyControlService.recordConsent(
      req.user.id,
      body,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Put('preferences')
  async updatePreferences(@Req() req: any, @Body() body: UpdatePrivacyPreferencesDto) {
    return this.privacyControlService.updatePrivacyPreferences(
      req.user.id,
      body,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Post('export')
  async requestExport(@Req() req: any) {
    return this.privacyControlService.requestDataExport(req.user.id);
  }

  @Get('export/data')
  async getExportData(@Req() req: any) {
    return this.privacyControlService.getExportData(req.user.id);
  }

  @Post('account/delete')
  async requestAccountDeletion(@Req() req: any, @Body() body: RequestAccountDeletionDto) {
    return this.privacyControlService.requestAccountDeletion(req.user.id, body.reason);
  }

  @Post('account/delete/confirm')
  async confirmAccountDeletion(@Req() req: any) {
    return this.privacyControlService.confirmAccountDeletion(req.user.id);
  }

  @Post('account/delete/cancel')
  async cancelAccountDeletion(@Req() req: any) {
    return this.privacyControlService.cancelAccountDeletion(req.user.id);
  }

  // Recruiter Discoverability endpoints (Phase 22 backward-compatibility)
  @Get('discoverability')
  async getDiscoverability(@Req() req: any) {
    return this.privacyService.getDiscoverabilitySettings(req.user.id);
  }

  @Put('discoverability')
  async updateDiscoverability(@Req() req: any, @Body() dto: UpdateDiscoverabilityDto) {
    return this.privacyService.updateDiscoverabilitySettings(req.user.id, dto);
  }

  @Get('permissions')
  async getPermissions(@Req() req: any) {
    return this.privacyService.getContactPermissions(req.user.id);
  }

  @Put('permissions')
  async updatePermissions(@Req() req: any, @Body() body: { contactPermitted: boolean }) {
    return this.privacyService.updateContactPermissions(req.user.id, body.contactPermitted);
  }
}
