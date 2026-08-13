import { Controller, Get, Param, Patch, Post, Body, UseGuards, Req } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { RateLimitProfile } from '../../common/decorators/rate-limit.decorator';
import { CreateFeatureFlagDto, UpdateFeatureFlagDto } from '../dto/feature-flag.dto';
import { AdminAuditService } from '../services/admin-audit.service';
import { AdminFeatureFlagsService } from '../services/admin-feature-flags.service';

@Controller('v1/admin/feature-flags')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@RateLimitProfile('admin')
export class AdminFeatureFlagsController {
  constructor(
    private readonly flagsService: AdminFeatureFlagsService,
    private readonly auditService: AdminAuditService,
  ) {}

  @Get()
  async getFlags() {
    return this.flagsService.findAll();
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN) // Only SUPER_ADMIN can create flags
  async createFlag(@Req() req: any, @Body() body: CreateFeatureFlagDto) {
    const result = await this.flagsService.create({ ...body, updatedByAdminId: req.user.id });

    void this.auditService.logAction(
      req.user.id,
      'CREATE_FEATURE_FLAG',
      'FEATURE_FLAG',
      result.id,
      { key: body.key, isEnabled: body.isEnabled },
      req.ip,
    );

    return result;
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN) // Only SUPER_ADMIN can edit flags for safety
  async updateFlag(@Req() req: any, @Param('id') id: string, @Body() body: UpdateFeatureFlagDto) {
    const result = await this.flagsService.update(id, { ...body, updatedByAdminId: req.user.id });

    void this.auditService.logAction(
      req.user.id,
      'UPDATE_FEATURE_FLAG',
      'FEATURE_FLAG',
      id,
      body,
      req.ip,
    );

    return result;
  }
}
