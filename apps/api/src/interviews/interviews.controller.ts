import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { InterviewsService } from './interviews.service';

@Controller('interviews')
@UseGuards(JwtAuthGuard, ThrottlerGuard)
export class InterviewsController {
  constructor(private readonly interviewsService: InterviewsService) {}

  @Post('start')
  async startInterview(@Request() req: any, @Body() body: { jobId: string }) {
    return this.interviewsService.startMockInterview(req.user.id, body.jobId);
  }

  @Get(':id')
  async getInterview(@Request() req: any, @Param('id') id: string) {
    return this.interviewsService.getInterview(id, req.user.id);
  }

  @Post(':id/answer')
  async answerQuestion(
    @Request() req: any,
    @Param('interviewId') interviewId: string,
    @Body('questionId') questionId: string,
    @Body('answer') answer: string,
  ) {
    return this.interviewsService.submitAnswer(req.user.id, interviewId, questionId, answer);
  }
}
