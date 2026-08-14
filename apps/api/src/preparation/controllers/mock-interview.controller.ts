import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { MockInterviewService } from '../services/mock-interview.service';

class AnswerDto {
  answer!: string;
}

@ApiTags('Mock Interviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('preparation/interview')
export class MockInterviewController {
  constructor(private readonly mockInterviewService: MockInterviewService) {}

  @Post(':jobId/start')
  @ApiOperation({ summary: 'Start a mock interview for a job' })
  @ApiResponse({ status: 201, description: 'Mock interview started' })
  async startInterview(
    @CurrentUser('id') userId: string,
    @Param('jobId', ParseUUIDPipe) jobId: string,
  ) {
    return this.mockInterviewService.startInterview(userId, jobId);
  }

  @Post(':questionId/answer')
  @ApiOperation({ summary: 'Submit an answer to an interview question' })
  @ApiResponse({ status: 201, description: 'Answer evaluated' })
  async answerQuestion(
    @CurrentUser('id') userId: string,
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @Body() dto: AnswerDto,
  ) {
    return this.mockInterviewService.answerQuestion(userId, questionId, dto.answer);
  }

  @Post(':sessionId/finish')
  @ApiOperation({ summary: 'Finish an interview session' })
  @ApiResponse({ status: 201, description: 'Interview finished' })
  async finishInterview(
    @CurrentUser('id') userId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    return this.mockInterviewService.finishInterview(userId, sessionId);
  }

  @Get(':sessionId/report')
  @ApiOperation({ summary: 'Get interview report' })
  @ApiResponse({ status: 200, description: 'Interview report retrieved' })
  async getInterviewReport(
    @CurrentUser('id') userId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    return this.mockInterviewService.getInterviewReport(userId, sessionId);
  }
}
