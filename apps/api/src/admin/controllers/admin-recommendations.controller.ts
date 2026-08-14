import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AdminRecommendationsService } from '../services/admin-recommendations.service';

@ApiTags('Admin Recommendations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin/recommendations')
export class AdminRecommendationsController {
  constructor(private readonly adminRecService: AdminRecommendationsService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get recommendation feedback metrics' })
  async getMetrics() {
    return this.adminRecService.getMetrics();
  }

  @Post('embeddings/rebuild/:resourceType')
  @ApiOperation({ summary: 'Rebuild embeddings for a specific resource type' })
  async rebuildEmbeddings(@Param('resourceType') resourceType: string) {
    return this.adminRecService.rebuildEmbeddings(resourceType.toUpperCase());
  }
}
