/**
 * Phase 8 — Opportunities Controller
 *
 * Opportunity Feed, Search & Discovery REST API.
 * All routes require JWT authentication (global guard).
 * User identity is always derived from the JWT payload — never from the client.
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

import { DismissJobDto } from './dto/dismiss-job.dto';
import { OpportunitiesQueryDto } from './dto/opportunities-query.dto';
import { TrackInteractionDto } from './dto/track-interaction.dto';
import { OpportunitiesService } from './opportunities.service';

@ApiTags('Opportunities')
@ApiBearerAuth()
@Controller('opportunities')
export class OpportunitiesController {
  constructor(private readonly opportunitiesService: OpportunitiesService) {}

  // ── Home Dashboard Stats ─────────────────────────────────────────────────────

  @Get('stats')
  @ApiOperation({ summary: 'Get home dashboard opportunity stats for the authenticated user' })
  @ApiResponse({ status: 200, description: 'Dashboard counts: new, high-match, saved.' })
  getDashboardStats(@CurrentUser() user: JwtPayload) {
    return this.opportunitiesService.getDashboardStats(user.sub);
  }

  // ── Home Sections ────────────────────────────────────────────────────────────

  @Get('top-matches')
  @ApiOperation({ summary: 'Get top-matching internship opportunities for the user' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max results', example: 10 })
  @ApiResponse({ status: 200, description: 'Top match opportunities.' })
  getTopMatches(@CurrentUser() user: JwtPayload, @Query('limit') limit?: number) {
    return this.opportunitiesService.getTopMatches(user.sub, limit ? Number(limit) : 10);
  }

  @Get('new')
  @ApiOperation({ summary: 'Get recently collected internship opportunities' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max results', example: 10 })
  @ApiResponse({ status: 200, description: 'New opportunities.' })
  getNewOpportunities(@CurrentUser() user: JwtPayload, @Query('limit') limit?: number) {
    return this.opportunitiesService.getNewOpportunities(user.sub, limit ? Number(limit) : 10);
  }

  @Get('closing-soon')
  @ApiOperation({ summary: 'Get internships closing within 7 days' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max results', example: 10 })
  @ApiResponse({ status: 200, description: 'Closing soon opportunities.' })
  getClosingSoon(@CurrentUser() user: JwtPayload, @Query('limit') limit?: number) {
    return this.opportunitiesService.getClosingSoon(user.sub, limit ? Number(limit) : 10);
  }

  @Get('tracked-companies')
  @ApiOperation({ summary: 'Get internships from companies tracked by the user' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max results', example: 20 })
  @ApiResponse({ status: 200, description: 'Tracked company opportunities.' })
  getTrackedCompanyOpportunities(@CurrentUser() user: JwtPayload, @Query('limit') limit?: number) {
    return this.opportunitiesService.getTrackedCompanyOpportunities(
      user.sub,
      limit ? Number(limit) : 20,
    );
  }

  // ── Saved Opportunities ──────────────────────────────────────────────────────

  @Get('saved')
  @ApiOperation({ summary: 'Get all saved internship opportunities for the user' })
  @ApiResponse({ status: 200, description: 'Saved opportunities.' })
  getSavedOpportunities(@CurrentUser() user: JwtPayload) {
    return this.opportunitiesService.getSavedOpportunities(user.sub);
  }

  // ── Filter Options ───────────────────────────────────────────────────────────

  @Get('filters')
  @ApiOperation({ summary: 'Get available filter options (locations, industries, work modes)' })
  @ApiResponse({ status: 200, description: 'Filter discovery values.' })
  getFilters() {
    return this.opportunitiesService.getFilters();
  }

  // ── Search ───────────────────────────────────────────────────────────────────

  @Get('search')
  @ApiOperation({ summary: 'Search internship opportunities by query' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max results', example: 20 })
  @ApiResponse({ status: 200, description: 'Search results.' })
  search(@CurrentUser() user: JwtPayload, @Query('q') q: string, @Query('limit') limit?: number) {
    return this.opportunitiesService.search(user.sub, q ?? '', limit ? Number(limit) : 20);
  }

  // ── Main Feed ────────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({
    summary: 'Get paginated opportunity feed with filtering, sorting, and search',
  })
  @ApiResponse({ status: 200, description: 'Paginated opportunity list.' })
  getOpportunities(@CurrentUser() user: JwtPayload, @Query() query: OpportunitiesQueryDto) {
    return this.opportunitiesService.getOpportunities(user.sub, query);
  }

  // ── Save / Unsave ────────────────────────────────────────────────────────────

  @Post(':id/save')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save an internship opportunity' })
  @ApiParam({ name: 'id', description: 'Job posting UUID' })
  @ApiResponse({ status: 200, description: 'Job saved.' })
  @ApiResponse({ status: 409, description: 'Job already saved.' })
  saveJob(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.opportunitiesService.saveJob(user.sub, id);
  }

  @Delete(':id/save')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unsave an internship opportunity' })
  @ApiParam({ name: 'id', description: 'Job posting UUID' })
  @ApiResponse({ status: 200, description: 'Job unsaved.' })
  unsaveJob(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.opportunitiesService.unsaveJob(user.sub, id);
  }

  // ── Dismiss ──────────────────────────────────────────────────────────────────

  @Post(':id/dismiss')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dismiss an internship opportunity' })
  @ApiParam({ name: 'id', description: 'Job posting UUID' })
  @ApiResponse({ status: 200, description: 'Job dismissed.' })
  dismissJob(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DismissJobDto,
  ) {
    return this.opportunitiesService.dismissJob(user.sub, id, dto);
  }

  // ── Interactions ─────────────────────────────────────────────────────────────

  @Post('interaction')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Track a user interaction (view, apply click, AI copilot, etc.)' })
  @ApiResponse({ status: 204, description: 'Interaction logged.' })
  trackInteraction(@CurrentUser() user: JwtPayload, @Body() dto: TrackInteractionDto) {
    return this.opportunitiesService.trackInteraction(user.sub, dto);
  }

  // ── Single Opportunity ───────────────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({ summary: 'Get detailed internship opportunity by ID' })
  @ApiParam({ name: 'id', description: 'Job posting UUID' })
  @ApiResponse({ status: 200, description: 'Opportunity details with match score and reasons.' })
  @ApiResponse({ status: 404, description: 'Not found or no longer active.' })
  getOpportunityById(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.opportunitiesService.getOpportunityById(id, user.sub);
  }
}
