import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtPayload } from '../../auth/strategies/jwt.strategy';
import { CareerAiChatDto, DailyPlanRequestDto } from '../dto/career-center.dto';
import { CareerCenterAiService } from '../services/career-center-ai.service';

@ApiTags('Career Center AI')
@ApiBearerAuth()
@Controller('api/v1/career-ai')
export class CareerAiController {
  constructor(private readonly careerAi: CareerCenterAiService) {}

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Chat with Personal Career Coach (grounded in user data)' })
  chat(@CurrentUser() user: JwtPayload, @Body() dto: CareerAiChatDto) {
    return this.careerAi.handleChat(user.sub, dto.message, dto.conversationId, dto.jobId);
  }

  @Post('daily-brief')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate concise text daily career outlook brief' })
  generateDailyBrief(@CurrentUser() user: JwtPayload) {
    return this.careerAi.generateDailyBrief(user.sub);
  }

  @Post('action-plan')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate time-budgeted action plan for today' })
  generateActionPlan(@CurrentUser() user: JwtPayload, @Body() dto: DailyPlanRequestDto) {
    return this.careerAi.generateActionPlan(user.sub, dto.timeBudget);
  }
}
