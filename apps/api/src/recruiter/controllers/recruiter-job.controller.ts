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
import { RecruiterJobService, CreateRecruiterJobDto } from '../services/recruiter-job.service';
import { RecruiterGuard } from '../guards/recruiter.guard';
import { VerifiedOrgGuard } from '../guards/verified-org.guard';

@Controller('api/v1/recruiter/jobs')
@UseGuards(RecruiterGuard)
export class RecruiterJobController {
  constructor(private readonly recruiterJobService: RecruiterJobService) {}

  @Post()
  createJob(@Request() req: any, @Body() dto: CreateRecruiterJobDto) {
    return this.recruiterJobService.createJob(
      req.user.id,
      req.recruiterProfile.recruiterOrgId,
      dto,
    );
  }

  @Get()
  listMyJobs(@Request() req: any) {
    return this.recruiterJobService.listOrgJobs(req.recruiterProfile.recruiterOrgId);
  }

  @Get(':id')
  getJob(@Request() req: any, @Param('id') id: string) {
    return this.recruiterJobService.getJob(id, req.recruiterProfile.recruiterOrgId);
  }

  @Patch(':id')
  updateJob(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: Partial<CreateRecruiterJobDto>,
  ) {
    return this.recruiterJobService.updateJob(
      id,
      req.recruiterProfile.recruiterOrgId,
      dto,
    );
  }

  @Post(':id/publish')
  @UseGuards(VerifiedOrgGuard)
  publishJob(@Request() req: any, @Param('id') id: string) {
    return this.recruiterJobService.publishJob(
      req.user.id,
      id,
      req.recruiterProfile.recruiterOrgId,
    );
  }

  @Post(':id/pause')
  pauseJob(@Request() req: any, @Param('id') id: string) {
    return this.recruiterJobService.pauseJob(req.user.id, id, req.recruiterProfile.recruiterOrgId);
  }

  @Post(':id/close')
  closeJob(@Request() req: any, @Param('id') id: string) {
    return this.recruiterJobService.closeJob(req.user.id, id, req.recruiterProfile.recruiterOrgId);
  }

  @Get(':id/applications')
  getJobApplications(@Request() req: any, @Param('id') id: string) {
    return this.recruiterJobService.getJobApplications(
      id,
      req.recruiterProfile.recruiterOrgId,
    );
  }
}
