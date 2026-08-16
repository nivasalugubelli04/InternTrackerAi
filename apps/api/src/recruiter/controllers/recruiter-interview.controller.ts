import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { RecruiterGuard } from '../guards/recruiter.guard';
import { AvailabilityCalendarService, SetAvailabilityDto } from '../services/availability-calendar.service';
import { HiringAiAssistantService } from '../services/hiring-ai-assistant.service';
import { CreateInterviewDto, HiringInterviewService } from '../services/hiring-interview.service';
import { InterviewFeedbackService, SubmitFeedbackDto } from '../services/interview-feedback.service';

@Controller('api/v1/recruiter')
@UseGuards(RecruiterGuard)
export class RecruiterInterviewController {
  constructor(
    private readonly interviewService: HiringInterviewService,
    private readonly feedbackService: InterviewFeedbackService,
    private readonly availabilityCalendar: AvailabilityCalendarService,
    private readonly aiAssistant: HiringAiAssistantService,
  ) {}

  @Post('interviews')
  createInterview(@Request() req: any, @Body() dto: CreateInterviewDto) {
    return this.interviewService.createInterview(
      req.user.id,
      req.recruiterProfile.recruiterOrgId,
      dto,
    );
  }

  @Get('interviews')
  listInterviews(@Request() req: any) {
    return this.interviewService.listInterviews(req.recruiterProfile.recruiterOrgId);
  }

  @Get('interviews/:id')
  getInterview(@Request() req: any, @Param('id') id: string) {
    return this.interviewService.getInterview(id, req.recruiterProfile.recruiterOrgId);
  }

  @Post('interviews/:id/reschedule')
  rescheduleInterview(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { scheduledStart: string; scheduledEnd: string; reason?: string },
  ) {
    return this.interviewService.rescheduleInterview(
      id,
      req.recruiterProfile.recruiterOrgId,
      req.user.id,
      body.scheduledStart,
      body.scheduledEnd,
      body.reason,
    );
  }

  @Post('interviews/:id/cancel')
  cancelInterview(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.interviewService.cancelInterview(
      id,
      req.recruiterProfile.recruiterOrgId,
      req.user.id,
      body.reason,
    );
  }

  @Post('interviews/:id/feedback')
  submitFeedback(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: SubmitFeedbackDto,
  ) {
    return this.feedbackService.submitFeedback(id, req.user.id, dto);
  }

  @Get('interviews/:id/feedback-summary')
  getFeedbackSummary(@Request() req: any, @Param('id') id: string) {
    return this.feedbackService.getAggregatedFeedback(
      id,
      req.recruiterProfile.recruiterOrgId,
    );
  }

  @Get('availability')
  getAvailability(@Request() req: any) {
    return this.availabilityCalendar.getInterviewerAvailability(
      req.user.id,
      req.recruiterProfile.recruiterOrgId,
    );
  }

  @Post('availability')
  setAvailability(@Request() req: any, @Body() dto: SetAvailabilityDto) {
    return this.availabilityCalendar.setInterviewerAvailability(
      req.user.id,
      req.recruiterProfile.recruiterOrgId,
      dto,
    );
  }

  @Post('ai/interview-summary')
  generateAiInterviewSummary(
    @Request() req: any,
    @Body() body: { interviewId: string },
  ) {
    return this.aiAssistant.generateInterviewSummary(
      req.user.id,
      body.interviewId,
      req.recruiterProfile.recruiterOrgId,
    );
  }

  @Post('ai/generate-questions')
  generateInterviewQuestions(
    @Request() req: any,
    @Body() body: { jobTitle: string; jobDescription?: string; candidateSkills?: string[] },
  ) {
    return this.aiAssistant.generateInterviewQuestions(
      req.user.id,
      body.jobTitle,
      body.jobDescription,
      body.candidateSkills,
    );
  }
}
