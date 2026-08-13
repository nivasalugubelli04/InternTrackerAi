import { Controller, Get, Post, Body, Patch, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { OrganizationsService } from '../services/organizations.service';
import { MembersService } from '../services/members.service';
import { OrganizationRolesGuard, OrgRoles } from '../guards/organization-roles.guard';
import { OrganizationRole } from '@prisma/client';

@ApiTags('B2B / Organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(
    private readonly orgService: OrganizationsService,
    private readonly membersService: MembersService
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new organization (B2B)' })
  async createOrganization(@CurrentUser('id') userId: string, @Body() dto: any) {
    // In reality, this might be restricted to ADMINs or a specific onboarding flow
    return this.orgService.createOrganization(userId, dto);
  }

  @Get(':orgId')
  @UseGuards(OrganizationRolesGuard)
  @ApiOperation({ summary: 'Get organization details' })
  async getOrganization(@Param('orgId') orgId: string) {
    return this.orgService.getOrganization(orgId);
  }

  @Patch(':orgId')
  @UseGuards(OrganizationRolesGuard)
  @OrgRoles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  @ApiOperation({ summary: 'Update organization settings' })
  async updateOrganization(@Param('orgId') orgId: string, @Body() dto: any) {
    return this.orgService.updateOrganization(orgId, dto);
  }

  // --- MEMBERSHIP ---

  @Get(':orgId/members')
  @UseGuards(OrganizationRolesGuard)
  @OrgRoles(OrganizationRole.OWNER, OrganizationRole.ADMIN, OrganizationRole.PLACEMENT_OFFICER, OrganizationRole.COUNSELOR)
  @ApiOperation({ summary: 'List organization members' })
  async getMembers(@Param('orgId') orgId: string) {
    return this.membersService.getMembers(orgId);
  }

  @Post(':orgId/invitations')
  @UseGuards(OrganizationRolesGuard)
  @OrgRoles(OrganizationRole.OWNER, OrganizationRole.ADMIN, OrganizationRole.PLACEMENT_OFFICER)
  @ApiOperation({ summary: 'Invite a member to the organization' })
  async inviteMember(
    @Param('orgId') orgId: string,
    @Body() dto: { email: string; role: OrganizationRole },
    @CurrentUser('id') userId: string
  ) {
    return this.membersService.inviteMember(orgId, dto.email, dto.role, userId);
  }

  @Post('invitations/accept')
  @ApiOperation({ summary: 'Accept an invitation' })
  async acceptInvitation(@CurrentUser('id') userId: string, @Body('token') token: string) {
    return this.membersService.acceptInvitation(userId, token);
  }
}
