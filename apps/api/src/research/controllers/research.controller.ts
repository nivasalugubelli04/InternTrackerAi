import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  AddWatchlistItemDto,
  CreateWatchlistDto,
  PrepareActionDto,
  UpdateResearchPreferenceDto,
} from '../dto/research.dto';
import { CompanyIntelligenceService } from '../services/company-intelligence.service';
import { ResearchSourceRegistryService } from '../services/research-source-registry.service';
import { ResearchService } from '../services/research.service';
import { TechnologySignalService } from '../services/technology-signal.service';
import { WatchlistService } from '../services/watchlist.service';

@Controller('research')
@UseGuards(JwtAuthGuard)
export class ResearchController {
  constructor(
    private readonly researchService: ResearchService,
    private readonly sourceRegistry: ResearchSourceRegistryService,
    private readonly companyIntelligence: CompanyIntelligenceService,
    private readonly technologySignal: TechnologySignalService,
    private readonly watchlistService: WatchlistService,
  ) {}

  @Get('feed')
  async getFeed(@CurrentUser('id') userId: string) {
    return this.researchService.getPersonalizedFeed(userId);
  }

  @Post('refresh')
  async triggerRefresh(@CurrentUser('id') userId: string) {
    return this.researchService.triggerResearchRefresh(userId);
  }

  @Get('sources')
  async getSources() {
    return this.sourceRegistry.getSources();
  }

  @Get('signals')
  async getSignals(@Query('limit') limit?: string) {
    return this.technologySignal.getTrendingSignals(limit ? parseInt(limit, 10) : 10);
  }

  @Get('companies/followed')
  async getFollowedCompanies(@CurrentUser('id') userId: string) {
    return this.companyIntelligence.getFollowedCompanies(userId);
  }

  @Get('companies/:id')
  async getCompanyProfile(@Param('id') companyId: string, @CurrentUser('id') userId: string) {
    return this.companyIntelligence.getCompanyProfile(companyId, userId);
  }

  @Post('companies/:id/follow')
  async followCompany(
    @Param('id') companyId: string,
    @CurrentUser('id') userId: string,
    @Body() body: { minMatchAlert?: number; notes?: string },
  ) {
    return this.companyIntelligence.followCompany(userId, companyId, body);
  }

  @Delete('companies/:id/follow')
  async unfollowCompany(@Param('id') companyId: string, @CurrentUser('id') userId: string) {
    return this.companyIntelligence.unfollowCompany(userId, companyId);
  }

  @Get('watchlists')
  async getWatchlists(@CurrentUser('id') userId: string) {
    return this.watchlistService.getUserWatchlists(userId);
  }

  @Post('watchlists')
  async createWatchlist(@CurrentUser('id') userId: string, @Body() dto: CreateWatchlistDto) {
    return this.watchlistService.createWatchlist(userId, dto);
  }

  @Post('watchlists/:id/items')
  async addWatchlistItem(
    @Param('id') watchlistId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: AddWatchlistItemDto,
  ) {
    return this.watchlistService.addOpportunityToWatchlist(userId, watchlistId, dto);
  }

  @Delete('watchlists/:id')
  async deleteWatchlist(@Param('id') watchlistId: string, @CurrentUser('id') userId: string) {
    return this.watchlistService.deleteWatchlist(userId, watchlistId);
  }

  @Post('prepare')
  async createPreparationAction(@CurrentUser('id') userId: string, @Body() dto: PrepareActionDto) {
    return this.watchlistService.createPreparationAction(userId, dto);
  }

  @Get('preferences')
  async getPreferences(@CurrentUser('id') userId: string) {
    return this.researchService.getPreferences(userId);
  }

  @Patch('preferences')
  async updatePreferences(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateResearchPreferenceDto,
  ) {
    return this.researchService.updatePreferences(userId, dto);
  }
}
