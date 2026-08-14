import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { RecruiterOrgService, CreateRecruiterOrgDto, CreateRecruiterProfileDto } from '../services/recruiter-org.service';
import { RecruiterGuard } from '../guards/recruiter.guard';

@Controller('api/v1/recruiter')
export class RecruiterOrgController {
  constructor(private readonly recruiterOrgService: RecruiterOrgService) {}

  // ─── Recruiter Organizations ───────────────────────────────────────────────

  @Post('organizations')
  createOrg(@Body() dto: CreateRecruiterOrgDto) {
    return this.recruiterOrgService.createRecruiterOrg(dto);
  }

  @Get('organizations/:id')
  @UseGuards(RecruiterGuard)
  getOrg(@Param('id') id: string) {
    return this.recruiterOrgService.getRecruiterOrg(id);
  }

  // ─── Recruiter Profiles ────────────────────────────────────────────────────

  @Post('profile')
  createProfile(@Request() req: any, @Body() dto: Omit<CreateRecruiterProfileDto, 'userId'>) {
    return this.recruiterOrgService.createRecruiterProfile({
      ...dto,
      userId: req.user.id,
    });
  }

  @Get('profile/me')
  @UseGuards(RecruiterGuard)
  getMyProfile(@Request() req: any) {
    return this.recruiterOrgService.getMyRecruiterProfile(req.user.id);
  }

  @Patch('profile/me')
  @UseGuards(RecruiterGuard)
  updateMyProfile(
    @Request() req: any,
    @Body() data: { jobTitle?: string; department?: string },
  ) {
    return this.recruiterOrgService.updateMyRecruiterProfile(req.user.id, data);
  }

  // ─── Team Members ──────────────────────────────────────────────────────────

  @Get('organizations/:id/members')
  @UseGuards(RecruiterGuard)
  listMembers(@Param('id') id: string) {
    return this.recruiterOrgService.listOrgMembers(id);
  }

  @Patch('organizations/:id/members/:userId/role')
  @UseGuards(RecruiterGuard)
  updateMemberRole(
    @Request() req: any,
    @Param('id') _orgId: string,
    @Param('userId') targetUserId: string,
    @Body() body: { role: any },
  ) {
    return this.recruiterOrgService.updateMemberRole(
      req.recruiterProfile,
      targetUserId,
      body.role,
    );
  }
}
