import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../../auth/decorators/public.decorator';
import { RoleAnalyticsService } from '../services/role-analytics.service';

@ApiTags('Market Intelligence')
@Controller('roles')
export class RoleMarketController {
  constructor(private readonly roleAnalyticsService: RoleAnalyticsService) {}

  @Public()
  @Get(':role/market-insights')
  @ApiOperation({ summary: 'Get specific market demand and skill profile for a role category' })
  async getRoleMarketInsights(@Param('role') roleName: string) {
    const result = await this.roleAnalyticsService.getSingleRoleAnalytics(roleName);
    if (!result) {
      throw new NotFoundException(`No market analytics found for role: ${roleName}`);
    }
    return result;
  }
}
