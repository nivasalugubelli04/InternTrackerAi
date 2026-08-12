import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { CompanyTrackService, TrackCompanyDto, UpdateTrackingDto } from './company-track.service';

@ApiTags('company-track')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('company-track')
export class CompanyTrackController {
  constructor(private readonly trackService: CompanyTrackService) {}

  @Get()
  @ApiOperation({ summary: 'Get tracked companies' })
  getTrackedCompanies(@Request() req: any) {
    return this.trackService.getTrackedCompanies(req.user.userId);
  }

  @Post()
  @ApiOperation({ summary: 'Track a company' })
  trackCompany(@Request() req: any, @Body() dto: TrackCompanyDto) {
    return this.trackService.trackCompany(req.user.userId, dto);
  }

  @Patch(':companyId')
  @ApiOperation({ summary: 'Update tracking priority' })
  updatePriority(
    @Request() req: any,
    @Param('companyId') companyId: string,
    @Body() dto: UpdateTrackingDto,
  ) {
    return this.trackService.updatePriority(req.user.userId, companyId, dto);
  }

  @Delete(':companyId')
  @ApiOperation({ summary: 'Untrack a company' })
  untrackCompany(@Request() req: any, @Param('companyId') companyId: string) {
    return this.trackService.untrackCompany(req.user.userId, companyId);
  }
}
