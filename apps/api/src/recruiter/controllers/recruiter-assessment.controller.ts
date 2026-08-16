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
import { RecruiterGuard } from '../guards/recruiter.guard';
import { AssessmentService, CreateAssessmentDto } from '../services/assessment.service';

@Controller('api/v1/recruiter/assessments')
@UseGuards(RecruiterGuard)
export class RecruiterAssessmentController {
  constructor(private readonly assessmentService: AssessmentService) {}

  @Post()
  createAssessment(@Request() req: any, @Body() dto: CreateAssessmentDto) {
    return this.assessmentService.createAssessment(
      req.user.id,
      req.recruiterProfile.recruiterOrgId,
      dto,
    );
  }

  @Get()
  listAssessments(@Request() req: any) {
    return this.assessmentService.listAssessments(req.recruiterProfile.recruiterOrgId);
  }

  @Get(':id')
  getAssessment(@Request() req: any, @Param('id') id: string) {
    return this.assessmentService.getAssessment(id, req.recruiterProfile.recruiterOrgId);
  }

  @Patch(':id')
  updateAssessment(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: Partial<CreateAssessmentDto>,
  ) {
    return this.assessmentService.updateAssessment(
      id,
      req.recruiterProfile.recruiterOrgId,
      dto,
    );
  }

  @Post(':id/assign')
  assignAssessment(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { candidateIds: string[]; jobId?: string },
  ) {
    return this.assessmentService.assignAssessment(
      req.user.id,
      req.recruiterProfile.recruiterOrgId,
      id,
      body.candidateIds,
      body.jobId,
    );
  }

  @Get(':id/results')
  getAssessmentResults(@Request() req: any, @Param('id') id: string) {
    return this.assessmentService.getAssessmentResults(
      id,
      req.recruiterProfile.recruiterOrgId,
    );
  }
}
