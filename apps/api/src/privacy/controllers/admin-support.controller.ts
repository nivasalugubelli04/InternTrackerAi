import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AddTicketMessageDto, UpdateTicketStatusDto } from '../dto/privacy.dto';
import { SupportService } from '../services/support.service';

@Controller('v1/admin/support')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminSupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get('tickets')
  async getTickets(
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
  ) {
    const filters: { category?: string; status?: string; priority?: string } = {};
    if (category) filters.category = category;
    if (status) filters.status = status;
    if (priority) filters.priority = priority;
    return this.supportService.getAdminTickets(filters);
  }

  @Get('tickets/:id')
  async getTicketById(@Param('id') ticketId: string) {
    return this.supportService.getTicketById(ticketId, undefined, true);
  }

  @Patch('tickets/:id/status')
  async updateStatus(@Param('id') ticketId: string, @Body() body: UpdateTicketStatusDto) {
    return this.supportService.updateTicketStatus(ticketId, body.status, body.resolutionSummary);
  }

  @Post('tickets/:id/messages')
  async addAdminMessage(
    @Req() req: any,
    @Param('id') ticketId: string,
    @Body() body: AddTicketMessageDto,
  ) {
    return this.supportService.addMessage(
      ticketId,
      req.user.id,
      'SUPPORT_ADMIN',
      body.message,
      false,
    );
  }
}
