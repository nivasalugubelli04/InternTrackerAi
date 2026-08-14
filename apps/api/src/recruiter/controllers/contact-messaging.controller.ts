import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ContactRequestService } from '../services/contact-request.service';
import { MessagingService } from '../services/messaging.service';
import { RecruiterGuard } from '../guards/recruiter.guard';

@Controller('api/v1/recruiter')
export class ContactMessagingController {
  constructor(
    private readonly contactRequestService: ContactRequestService,
    private readonly messagingService: MessagingService,
  ) {}

  // ─── Contact Requests ──────────────────────────────────────────────────────

  @Post('contact-requests')
  @UseGuards(RecruiterGuard)
  sendContactRequest(
    @Request() req: any,
    @Body() body: { receiverId: string; jobId?: string; message: string },
  ) {
    return this.contactRequestService.sendContactRequest(
      req.user.id,
      body.receiverId,
      req.recruiterProfile.recruiterOrgId,
      body.jobId,
      body.message,
    );
  }

  @Get('contact-requests')
  @UseGuards(RecruiterGuard)
  listRecruiterContactRequests(@Request() req: any) {
    return this.contactRequestService.listRecruiterContactRequests(
      req.recruiterProfile.recruiterOrgId,
    );
  }

  @Post('contact-requests/:id/withdraw')
  @UseGuards(RecruiterGuard)
  withdrawContactRequest(@Request() req: any, @Param('id') id: string) {
    return this.contactRequestService.withdrawContactRequest(id, req.user.id);
  }

  // Candidate-facing contact request actions (no RecruiterGuard — regular users)
  @Get('contact-requests/incoming')
  listCandidateContactRequests(@Request() req: any) {
    return this.contactRequestService.listCandidateContactRequests(req.user.id);
  }

  @Post('contact-requests/:id/approve')
  approveContactRequest(@Request() req: any, @Param('id') id: string) {
    return this.contactRequestService.approveContactRequest(id, req.user.id);
  }

  @Post('contact-requests/:id/reject')
  rejectContactRequest(@Request() req: any, @Param('id') id: string) {
    return this.contactRequestService.rejectContactRequest(id, req.user.id);
  }

  // ─── Messages ──────────────────────────────────────────────────────────────

  @Get('messages')
  listThreads(@Request() req: any) {
    return this.messagingService.listUserThreads(req.user.id);
  }

  @Get('messages/:threadId')
  getMessages(@Request() req: any, @Param('threadId') threadId: string) {
    return this.messagingService.listMessages(threadId, req.user.id);
  }

  @Post('messages')
  sendMessage(
    @Request() req: any,
    @Body() body: { threadId: string; content: string },
  ) {
    return this.messagingService.sendMessage(body.threadId, req.user.id, body.content);
  }

  @Post('messages/:threadId/block')
  blockThread(@Request() req: any, @Param('threadId') threadId: string) {
    return this.messagingService.blockThread(threadId, req.user.id);
  }

  @Post('report')
  reportMisconduct(
    @Request() req: any,
    @Body()
    body: {
      targetId: string;
      targetType: 'RECRUITER' | 'MESSAGE' | 'JOB';
      reason: string;
      details?: string;
    },
  ) {
    return this.messagingService.reportMessage(
      req.user.id,
      body.targetId,
      body.targetType,
      body.reason,
      body.details,
    );
  }
}
