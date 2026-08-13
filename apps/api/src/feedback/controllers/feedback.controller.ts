import { Controller, Post, Body, UseGuards, Request, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole, FeedbackType } from '@prisma/client';
import { FeedbackService } from '../services/feedback.service';

@ApiTags('Feedback')
@ApiBearerAuth()
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Submit general user feedback (bugs, feature requests)' })
  async submitFeedback(
    @Request() req: any,
    @Body() dto: { type: FeedbackType; resourceId?: string; rating?: number; message?: string; category?: string }
  ) {
    return this.feedbackService.submitFeedback(req.user.id, dto);
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Admin: View all user feedback' })
  async getAdminFeedbacks() {
    return this.feedbackService.getAdminFeedbacks();
  }
}
