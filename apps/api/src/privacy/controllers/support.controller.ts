import { Controller, Get, Post, Param, Body, Query, UseGuards, Req } from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateSupportTicketDto, AddTicketMessageDto } from '../dto/privacy.dto';
import { SupportService } from '../services/support.service';

@Controller('v1/support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get('faq')
  getFaq(@Query('search') search?: string) {
    return this.supportService.getFaqKnowledgeBase(search);
  }

  @Post('tickets')
  @UseGuards(JwtAuthGuard)
  async createTicket(@Req() req: any, @Body() body: CreateSupportTicketDto) {
    return this.supportService.createTicket(req.user.id, body);
  }

  @Get('tickets')
  @UseGuards(JwtAuthGuard)
  async getTickets(@Req() req: any) {
    return this.supportService.getUserTickets(req.user.id);
  }

  @Get('tickets/:id')
  @UseGuards(JwtAuthGuard)
  async getTicketById(@Req() req: any, @Param('id') ticketId: string) {
    return this.supportService.getTicketById(ticketId, req.user.id, false);
  }

  @Post('tickets/:id/messages')
  @UseGuards(JwtAuthGuard)
  async addMessage(
    @Req() req: any,
    @Param('id') ticketId: string,
    @Body() body: AddTicketMessageDto,
  ) {
    return this.supportService.addMessage(ticketId, req.user.id, 'USER', body.message, false);
  }
}
