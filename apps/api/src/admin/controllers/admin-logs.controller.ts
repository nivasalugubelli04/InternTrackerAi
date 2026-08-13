import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { RateLimitProfile } from '../../common/decorators/rate-limit.decorator';
import { AdminAuditService } from '../services/admin-audit.service';

@Controller('v1/admin/logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN) // Only SUPER_ADMIN can view audit logs
@RateLimitProfile('admin')
export class AdminLogsController {
  constructor(private readonly auditService: AdminAuditService) {}

  @Get()
  async getLogs(
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @Query('adminUserId') adminUserId?: string,
    @Query('resourceType') resourceType?: string,
    @Query('action') action?: string,
  ) {
    const filters: any = {};
    if (adminUserId) filters.adminUserId = adminUserId;
    if (resourceType) filters.resourceType = resourceType;
    if (action) filters.action = action;

    return this.auditService.getLogs(
      Number(page),
      Number(limit),
      Object.keys(filters).length ? filters : undefined,
    );
  }
}
