import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

import { ApplicationsService } from './applications.service';
import { ChangeApplicationStatusDto } from './dto/change-status.dto';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';

@ApiTags('Applications')
@ApiBearerAuth()
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new application for a job' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Application successfully created.' })
  create(@CurrentUser() user: JwtPayload, @Body() createApplicationDto: CreateApplicationDto) {
    return this.applicationsService.create(user.sub, createApplicationDto);
  }

  @Get()
  @ApiOperation({ summary: 'List applications with optional filters and sorting' })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('q') q?: string,
    @Query('sort') sort?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.applicationsService.findAll(user.sub, {
      status,
      priority,
      q,
      sort,
      cursor,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get advanced application analytics' })
  getAnalytics(@CurrentUser() user: JwtPayload) {
    return this.applicationsService.getStats(user.sub);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get application progress statistics (deprecated - use analytics)' })
  getStats(@CurrentUser() user: JwtPayload) {
    return this.applicationsService.getStats(user.sub);
  }

  @Get('priorities')
  @ApiOperation({ summary: 'Get applications grouped by priority score labels' })
  getPrioritized(@CurrentUser() user: JwtPayload) {
    return this.applicationsService.getPrioritizedApplications(user.sub);
  }

  @Get('actions')
  @ApiOperation({ summary: 'Get AI daily career action plan items' })
  getDailyActions(@CurrentUser() user: JwtPayload) {
    return this.applicationsService.getDailyActions(user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get application details by ID' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.applicationsService.findOne(user.sub, id);
  }

  @Get(':id/timeline')
  @ApiOperation({ summary: 'Get application timeline events' })
  getTimeline(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.applicationsService.getTimeline(user.sub, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update application details' })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateApplicationDto: UpdateApplicationDto,
  ) {
    return this.applicationsService.update(user.sub, id, updateApplicationDto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update application status and append to timeline' })
  changeStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() changeStatusDto: ChangeApplicationStatusDto,
  ) {
    return this.applicationsService.changeStatus(user.sub, id, changeStatusDto);
  }

  @Post(':id/ai/analyze')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Analyze application readiness and resume alignment' })
  analyzeApplication(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.applicationsService.analyzeApplication(user.sub, id);
  }

  @Post(':id/ai/cover-letter')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate a customized AI cover letter draft' })
  generateCoverLetter(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.applicationsService.generateCoverLetter(user.sub, id);
  }

  @Post(':id/ai/resume-analysis')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Analyze resume alignment with job requirements' })
  analyzeResume(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.applicationsService.analyzeApplication(user.sub, id);
  }

  @Post(':id/follow-up')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Draft a customized AI follow-up email' })
  generateFollowUp(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.applicationsService.generateFollowUp(user.sub, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an application' })
  remove(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.applicationsService.remove(user.sub, id);
  }
}
