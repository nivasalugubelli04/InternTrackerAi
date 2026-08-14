import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../../auth/decorators/public.decorator';
import { CompanyAnalyticsService } from '../services/company-analytics.service';

@ApiTags('Market Intelligence')
@Controller('companies')
export class CompanyMarketController {
  constructor(private readonly companyAnalyticsService: CompanyAnalyticsService) {}

  @Public()
  @Get(':id/market-insights')
  @ApiOperation({
    summary: 'Get specific market hiring intelligence and skill requirements for a company',
  })
  async getCompanyMarketInsights(@Param('id') companyIdOrSlug: string) {
    return this.companyAnalyticsService.getCompanyMarketInsights(companyIdOrSlug);
  }
}
