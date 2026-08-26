import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ConfirmProposalDto, SaveMemoryDto, SendMessageDto } from '../dto/copilot.dto';
import { CopilotActionProposalService } from '../services/copilot-action-proposal.service';
import { CopilotMemoryService } from '../services/copilot-memory.service';
import { CopilotService } from '../services/copilot.service';

@Controller('copilot')
@UseGuards(JwtAuthGuard)
export class CopilotController {
  constructor(
    private readonly copilotService: CopilotService,
    private readonly proposalService: CopilotActionProposalService,
    private readonly memoryService: CopilotMemoryService,
  ) {}

  @Get('home')
  async getHomeSummary(@CurrentUser('id') userId: string) {
    return this.copilotService.getHomeSummary(userId);
  }

  @Post('messages')
  async sendMessage(@CurrentUser('id') userId: string, @Body() dto: SendMessageDto) {
    return this.copilotService.sendMessage(userId, dto);
  }

  @Get('conversations')
  async getConversations(@CurrentUser('id') userId: string) {
    return this.copilotService.getConversations(userId);
  }

  @Get('conversations/:id')
  async getConversation(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.copilotService.getConversation(userId, id);
  }

  @Delete('conversations/:id')
  async deleteConversation(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.copilotService.deleteConversation(userId, id);
  }

  @Post('proposals/:id/confirm')
  async confirmProposal(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ConfirmProposalDto,
  ) {
    return this.proposalService.confirmProposal(userId, id, dto.customNotes);
  }

  @Post('proposals/:id/cancel')
  async cancelProposal(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.proposalService.cancelProposal(userId, id);
  }

  @Get('memories')
  async getMemories(@CurrentUser('id') userId: string) {
    return this.memoryService.getUserMemories(userId);
  }

  @Post('memories')
  async saveMemory(@CurrentUser('id') userId: string, @Body() dto: SaveMemoryDto) {
    return this.memoryService.saveMemory(userId, dto);
  }

  @Delete('memories/:id')
  async deleteMemory(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.memoryService.deleteMemory(userId, id);
  }
}
