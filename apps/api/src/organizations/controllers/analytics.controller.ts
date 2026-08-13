import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PlacementAnalyticsService } from '../analytics/placement-analytics.service';
import { OrganizationRolesGuard, OrgRoles } from '../guards/organization-roles.guard';
import { OrganizationRole } from '@prisma/client';

@ApiTags('B2B / Organizations / Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrganizationRolesGuard)
@Controller('organizations/:orgId/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: PlacementAnalyticsService) {}

  @Get('funnel')
  @OrgRoles(OrganizationRole.OWNER, OrganizationRole.ADMIN, OrganizationRole.PLACEMENT_OFFICER, OrganizationRole.ANALYST)
  @ApiOperation({ summary: 'Get placement funnel metrics' })
  async getPlacementFunnel(@Param('orgId') orgId: string) {
    return this.analyticsService.getPlacementFunnel(orgId);
  }

  @Get('skills')
  @OrgRoles(OrganizationRole.OWNER, OrganizationRole.ADMIN, OrganizationRole.PLACEMENT_OFFICER, OrganizationRole.ANALYST)
  @ApiOperation({ summary: 'Get skills gap analytics' })
  async getSkillGaps(@Param('orgId') orgId: string) {
    return this.analyticsService.getSkillGaps(orgId);
  }
}
