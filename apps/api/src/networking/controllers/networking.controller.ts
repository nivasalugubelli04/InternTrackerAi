import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtPayload } from '../../auth/strategies/jwt.strategy';
import { NetworkingService } from '../services/networking.service';

@ApiTags('Networking')
@ApiBearerAuth()
@Controller('api/v1/networking')
export class NetworkingController {
  constructor(private readonly networkingService: NetworkingService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get overview dashboard counters and follow-ups' })
  async getOverview(@CurrentUser() user: JwtPayload) {
    const contacts = await this.networkingService.getContacts(user.sub);
    const followUps = await this.networkingService.getFollowUps(user.sub);

    const counts = {
      totalContacts: contacts.length,
      contacted: contacts.filter((c) => c.pipelineState === 'CONTACTED').length,
      activeConversations: contacts.filter((c) => c.pipelineState === 'CONVERSATION_ACTIVE').length,
      referralDiscussed: contacts.filter((c) => c.pipelineState === 'REFERRAL_DISCUSSED').length,
    };

    return {
      counts,
      followUps,
    };
  }

  @Get('contacts')
  @ApiOperation({ summary: 'Get list of professional contacts' })
  async getContacts(@CurrentUser() user: JwtPayload) {
    return this.networkingService.getContacts(user.sub);
  }

  @Post('contacts')
  @ApiOperation({ summary: 'Create new professional contact' })
  async createContact(@CurrentUser() user: JwtPayload, @Body() body: any) {
    return this.networkingService.createContact(user.sub, body);
  }

  @Get('contacts/:id')
  @ApiOperation({ summary: 'Get professional contact by ID' })
  async getContact(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.networkingService.getContactById(user.sub, id);
  }

  @Patch('contacts/:id')
  @ApiOperation({ summary: 'Update professional contact details' })
  async updateContact(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: any) {
    return this.networkingService.updateContact(user.sub, id, body);
  }

  @Delete('contacts/:id')
  @ApiOperation({ summary: 'Delete professional contact' })
  async deleteContact(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.networkingService.deleteContact(user.sub, id);
  }

  @Post('outreach/generate')
  @ApiOperation({ summary: 'Generate personalized AI outreach draft' })
  async generateOutreach(@CurrentUser() user: JwtPayload, @Body() body: any) {
    return this.networkingService.generateOutreach(user.sub, body);
  }

  @Post('interactions')
  @ApiOperation({ summary: 'Add relationship interaction record' })
  async addInteraction(@CurrentUser() user: JwtPayload, @Body() body: any) {
    return this.networkingService.addInteraction(user.sub, body);
  }

  @Get('follow-ups')
  @ApiOperation({ summary: 'Get follow-up recommendation alerts' })
  async getFollowUps(@CurrentUser() user: JwtPayload) {
    return this.networkingService.getFollowUps(user.sub);
  }

  @Get('referral-readiness/:opportunityId')
  @ApiOperation({ summary: 'Evaluate referral readiness status' })
  async getReferralReadiness(
    @CurrentUser() user: JwtPayload,
    @Param('opportunityId') opportunityId: string,
    @Query('contactId') contactId: string,
  ) {
    return this.networkingService.evaluateReferralReadiness(user.sub, contactId, opportunityId);
  }
}
