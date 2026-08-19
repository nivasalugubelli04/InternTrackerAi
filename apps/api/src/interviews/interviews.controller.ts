import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { InterviewMode, InterviewType } from '@prisma/client';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { InterviewsService } from './interviews.service';

class StartInterviewDto {
  jobId!: string;
  type?: InterviewType;
  mode?: InterviewMode;
}

class AnswerQuestionDto {
  questionId!: string;
  answer!: string;
}

class CoachMessageDto {
  message!: string;
}

@ApiTags('Interview Intelligence')
@ApiBearerAuth()
@Controller('interviews')
@UseGuards(JwtAuthGuard, ThrottlerGuard)
export class InterviewsController {
  constructor(private readonly interviewsService: InterviewsService) {}

  @Get()
  @ApiOperation({ summary: "Get candidate's mock interviews history" })
  async getUserInterviews(@Request() req: any) {
    return this.interviewsService.getUserInterviews(req.user.id);
  }

  @Get('readiness')
  @ApiOperation({ summary: 'Get global interview readiness breakdown' })
  async getGlobalReadiness(@Request() req: any) {
    return this.interviewsService.getInterviewReadiness(req.user.id);
  }

  @Get(':id/preparation')
  @ApiOperation({ summary: 'Get preparation workspace for a job' })
  async getPreparationWorkspace(@Request() req: any, @Param('id') jobId: string) {
    return this.interviewsService.getPreparationWorkspace(req.user.id, jobId);
  }

  @Get(':id/readiness')
  @ApiOperation({ summary: 'Get job-specific interview readiness breakdown' })
  async getJobReadiness(@Request() req: any, @Param('id') jobId: string) {
    return this.interviewsService.getInterviewReadiness(req.user.id, jobId);
  }

  @Post('start')
  @ApiOperation({ summary: 'Start an adaptive mock interview session' })
  async startInterview(@Request() req: any, @Body() dto: StartInterviewDto) {
    return this.interviewsService.startMockInterview(req.user.id, dto.jobId, dto.type, dto.mode);
  }

  @Get('sessions/:sessionId')
  @ApiOperation({ summary: 'Get mock interview session state' })
  async getSession(@Request() req: any, @Param('sessionId') sessionId: string) {
    return this.interviewsService.getInterview(sessionId, req.user.id);
  }

  @Post('sessions/:sessionId/answer')
  @ApiOperation({ summary: 'Submit an answer to a session question' })
  async submitAnswer(
    @Request() req: any,
    @Param('sessionId') sessionId: string,
    @Body() dto: AnswerQuestionDto,
  ) {
    return this.interviewsService.submitAnswer(req.user.id, sessionId, dto.questionId, dto.answer);
  }

  @Post('sessions/:sessionId/hint')
  @ApiOperation({ summary: 'Get progressive hint for a question' })
  async getHint(@Body('questionId') questionId: string, @Body('level') level: number = 1) {
    return this.interviewsService.getHint(questionId, level);
  }

  @Post('sessions/:sessionId/finish')
  @ApiOperation({ summary: 'Finish an interview session' })
  async finishSession(@Request() req: any, @Param('sessionId') sessionId: string) {
    return this.interviewsService.finishInterview(req.user.id, sessionId);
  }

  @Get('sessions/:sessionId/report')
  @ApiOperation({ summary: 'Get full mock interview report' })
  async getSessionReport(@Request() req: any, @Param('sessionId') sessionId: string) {
    return this.interviewsService.getSessionReport(req.user.id, sessionId);
  }

  @Post(':jobId/ai/coach')
  @ApiOperation({ summary: 'Send message to AI Interview Coach' })
  async chatWithCoach(
    @Request() req: any,
    @Param('jobId') jobId: string,
    @Body() dto: CoachMessageDto,
  ) {
    return this.interviewsService.chatWithCoach(req.user.id, jobId, dto.message);
  }
}
