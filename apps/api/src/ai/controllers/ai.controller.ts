import type { MessageEvent } from '@nestjs/common';
import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Sse,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Observable, Subject } from 'rxjs';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtPayload } from '../../auth/strategies/jwt.strategy';
import { RateLimitProfile } from '../../common/decorators/rate-limit.decorator';
import { ResumeAnalysisDto, CompareJobsDto, LearningRoadmapDto, ChatDto } from '../dto/ai.dto';
import { AiService } from '../services/ai.service';

@ApiTags('AI Copilot')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('resume-analysis')
  @HttpCode(HttpStatus.OK)
  @RateLimitProfile('ai_resume')
  @ApiOperation({ summary: 'Analyze the user resume text' })
  @ApiResponse({ status: 200, description: 'Analysis complete' })
  analyzeResume(@CurrentUser() user: JwtPayload, @Body() dto: ResumeAnalysisDto) {
    return this.aiService.analyzeResume(user.sub, dto.resumeText);
  }

  @Post('job-summary/:jobId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate summary of job description' })
  summarizeJob(@CurrentUser() user: JwtPayload, @Param('jobId') jobId: string) {
    return this.aiService.summarizeJob(user.sub, jobId);
  }

  @Post('match-explanation/:jobId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Explain why candidate matches the job' })
  explainMatch(@CurrentUser() user: JwtPayload, @Param('jobId') jobId: string) {
    return this.aiService.explainMatch(user.sub, jobId);
  }

  @Post('skill-gap/:jobId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Analyze skill gap for a specific job' })
  analyzeSkillGap(@CurrentUser() user: JwtPayload, @Param('jobId') jobId: string) {
    return this.aiService.analyzeSkillGap(user.sub, jobId);
  }

  @Post('cover-letter/:jobId')
  @HttpCode(HttpStatus.OK)
  @RateLimitProfile('ai_cover_letter')
  @ApiOperation({ summary: 'Generate a personalized cover letter' })
  generateCoverLetter(@CurrentUser() user: JwtPayload, @Param('jobId') jobId: string) {
    return this.aiService.generateCoverLetter(user.sub, jobId);
  }

  @Post('referral-message/:jobId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate referral request messages' })
  generateReferral(@CurrentUser() user: JwtPayload, @Param('jobId') jobId: string) {
    return this.aiService.generateReferral(user.sub, jobId);
  }

  @Post('interview-prep/:jobId')
  @HttpCode(HttpStatus.OK)
  @RateLimitProfile('ai_interview')
  @ApiOperation({ summary: 'Generate interview preparation guidelines' })
  generateInterviewPrep(@CurrentUser() user: JwtPayload, @Param('jobId') jobId: string) {
    return this.aiService.generateInterviewPrep(user.sub, jobId);
  }

  @Post('compare')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Compare multiple internship postings' })
  compareJobs(@CurrentUser() user: JwtPayload, @Body() dto: CompareJobsDto) {
    return this.aiService.compareInternships(user.sub, dto.jobIds);
  }

  @Post('learning-roadmap')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create technical learning roadmap' })
  generateRoadmap(@CurrentUser() user: JwtPayload, @Body() dto: LearningRoadmapDto) {
    return this.aiService.generateRoadmap(user.sub, dto.targetRole, dto.targetCompany);
  }

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @RateLimitProfile('ai_chat')
  @ApiOperation({ summary: 'Send message to AI Career Copilot' })
  chat(@CurrentUser() user: JwtPayload, @Body() dto: ChatDto) {
    return this.aiService.handleChat(user.sub, dto.message, dto.conversationId, dto.jobId);
  }

  @Sse('chat/stream')
  @RateLimitProfile('ai_chat')
  @ApiOperation({ summary: 'Stream AI Copilot responses via SSE' })
  chatStream(
    @CurrentUser() user: JwtPayload,
    @Query('message') message: string,
    @Query('conversationId') conversationId?: string,
    @Query('jobId') jobId?: string,
  ): Observable<MessageEvent> {
    const subject = new Subject<MessageEvent>();

    this.aiService
      .handleChatStream(user.sub, message, conversationId, jobId, (chunk) => {
        subject.next({ data: { chunk } });
      })
      .then((finalResult) => {
        subject.next({ data: { done: true, conversation: finalResult } });
        subject.complete();
      })
      .catch((err) => {
        subject.error(err);
      });

    return subject.asObservable();
  }

  @Get('conversations')
  @ApiOperation({ summary: 'List all conversations for user' })
  getConversations(@CurrentUser() user: JwtPayload) {
    return this.aiService.getConversations(user.sub);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get messages in conversation' })
  getConversation(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.aiService.getConversation(user.sub, id);
  }

  @Delete('conversations/:id')
  @ApiOperation({ summary: 'Delete conversation' })
  deleteConversation(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.aiService.deleteConversation(user.sub, id);
  }
}
