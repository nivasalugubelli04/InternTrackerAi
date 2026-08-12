import { Controller, Get, Param, Patch, Body, Query, UseGuards, Req } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AdminUsersService } from '../services/admin-users.service';
import { AdminAuditService } from '../services/admin-audit.service';

@Controller('v1/admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminUsersController {
  constructor(
    private readonly usersService: AdminUsersService,
    private readonly auditService: AdminAuditService,
  ) {}

  @Get()
  async getUsers(
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @Query('search') search?: string,
  ) {
    return this.usersService.findAll(Number(page), Number(limit), search ? { search } : undefined);
  }

  @Get(':id')
  async getUser(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id/status')
  async updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
  ) {
    const result = await this.usersService.updateStatus(id, isActive);

    void this.auditService.logAction(
      req.user.id,
      isActive ? 'ENABLE_USER' : 'DISABLE_USER',
      'USER',
      id,
      undefined,
      req.ip,
    );

    return result;
  }

  @Patch(':id/reset-lock')
  async resetLock(@Req() req: any, @Param('id') id: string) {
    const result = await this.usersService.resetLoginAttempts(id);

    void this.auditService.logAction(req.user.id, 'RESET_USER_LOCK', 'USER', id, undefined, req.ip);

    return result;
  }
}
