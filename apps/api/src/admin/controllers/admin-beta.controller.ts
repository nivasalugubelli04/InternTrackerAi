import { Controller, Post, Get, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AdminBetaService } from '../services/admin-beta.service';

@ApiTags('Admin Beta')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin/beta')
export class AdminBetaController {
  constructor(private readonly betaService: AdminBetaService) {}

  @Post('invitations')
  @ApiOperation({ summary: 'Generate a beta invitation' })
  async createInvitation(
    @Request() req: any,
    @Body() dto: { email?: string; cohort?: string; maxUses?: number; expiresAt?: string }
  ) {
    return this.betaService.createInvitation(req.user.id, {
      ...(dto.email !== undefined && { email: dto.email }),
      ...(dto.cohort !== undefined && { cohort: dto.cohort }),
      ...(dto.maxUses !== undefined && { maxUses: dto.maxUses }),
      ...(dto.expiresAt !== undefined && { expiresAt: new Date(dto.expiresAt) }),
    });
  }

  @Get('invitations')
  @ApiOperation({ summary: 'List beta invitations' })
  async getInvitations() {
    return this.betaService.getInvitations();
  }

  @Get('users')
  @ApiOperation({ summary: 'List beta users' })
  async getBetaUsers() {
    return this.betaService.getBetaUsers();
  }

  @Put('users/:id/revoke')
  @ApiOperation({ summary: 'Revoke beta access for a user' })
  async revokeBetaAccess(@Param('id') id: string) {
    return this.betaService.revokeBetaAccess(id);
  }
}
