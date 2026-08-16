import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
} from '@nestjs/common';
import { CandidateAssessmentService, SubmitAttemptDto } from './candidate-assessment.service';
import { CandidateHiringService } from './candidate-hiring.service';

@Controller('api/v1/candidate')
export class CandidateHiringController {
  constructor(
    private readonly candidateHiringService: CandidateHiringService,
    private readonly candidateAssessmentService: CandidateAssessmentService,
  ) {}

  private getUserId(req: any): string {
    return req.user?.sub || req.user?.id;
  }

  // ── Candidate Assessments ──────────────────────────────────────────────────

  @Get('assessments/assignments')
  listAssignments(@Request() req: any) {
    return this.candidateAssessmentService.listCandidateAssignments(this.getUserId(req));
  }

  @Get('assessments/assignments/:id')
  getAssignmentDetails(@Request() req: any, @Param('id') id: string) {
    return this.candidateAssessmentService.getAssignmentDetails(this.getUserId(req), id);
  }

  @Post('assessments/assignments/:id/start')
  startAssignment(@Request() req: any, @Param('id') id: string) {
    return this.candidateAssessmentService.startAssignment(this.getUserId(req), id);
  }

  @Post('assessments/assignments/:id/submit')
  submitAssignment(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: SubmitAttemptDto,
  ) {
    return this.candidateAssessmentService.submitAssignment(this.getUserId(req), id, dto);
  }

  // ── Candidate Interviews ───────────────────────────────────────────────────

  @Get('interviews')
  listInterviews(@Request() req: any) {
    return this.candidateHiringService.listCandidateInterviews(this.getUserId(req));
  }

  @Post('interviews/:id/accept')
  acceptInterview(@Request() req: any, @Param('id') id: string) {
    return this.candidateHiringService.acceptInterview(this.getUserId(req), id);
  }

  @Post('interviews/:id/decline')
  declineInterview(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.candidateHiringService.declineInterview(this.getUserId(req), id, body.reason);
  }

  @Post('interviews/:id/reschedule-request')
  rescheduleRequest(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    return this.candidateHiringService.requestReschedule(this.getUserId(req), id, body.reason);
  }

  // ── Candidate Offers ───────────────────────────────────────────────────────

  @Get('offers')
  listOffers(@Request() req: any) {
    return this.candidateHiringService.listCandidateOffers(this.getUserId(req));
  }

  @Get('offers/:id')
  getOffer(@Request() req: any, @Param('id') id: string) {
    return this.candidateHiringService.getCandidateOffer(this.getUserId(req), id);
  }

  @Post('offers/:id/accept')
  acceptOffer(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { note?: string },
  ) {
    return this.candidateHiringService.acceptOffer(this.getUserId(req), id, body.note);
  }

  @Post('offers/:id/decline')
  declineOffer(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.candidateHiringService.declineOffer(this.getUserId(req), id, body.reason);
  }
}
