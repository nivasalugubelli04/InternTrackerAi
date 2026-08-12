/**
 * Phase 6 — Notifications Controller
 *
 * REST API endpoints for the Notification Intelligence Engine.
 *
 * All routes require JWT authentication (global guard applies).
 */

import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtPayload } from '../../auth/strategies/jwt.strategy';
import { MarkReadDto, GetNotificationsQueryDto } from '../dto/mark-read.dto';
import {
  NotificationResponseDto,
  PaginatedNotificationsDto,
} from '../dto/notification-response.dto';
import { TestNotificationDto } from '../dto/test-notification.dto';
import { UpdateNotificationPreferencesDto } from '../dto/update-notification-preferences.dto';
import { NotificationsService } from '../services/notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ── GET /api/v1/notifications ──────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List notifications for the authenticated user' })
  @ApiResponse({ status: 200, type: PaginatedNotificationsDto })
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: GetNotificationsQueryDto,
  ): Promise<PaginatedNotificationsDto> {
    return this.notificationsService.findAll(user.sub, query);
  }

  // ── GET /api/v1/notifications/history ─────────────────────────────────────

  @Get('history')
  @ApiOperation({ summary: 'Get notification history with delivery events' })
  @ApiResponse({ status: 200 })
  async getHistory(@CurrentUser() user: JwtPayload, @Query() query: GetNotificationsQueryDto) {
    return this.notificationsService.getHistory(user.sub, query);
  }

  // ── POST /api/v1/notifications/test ───────────────────────────────────────

  @Post('test')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Send a test notification',
    description:
      'Triggers a test notification on the specified channel. Useful for verifying device tokens and email settings.',
  })
  @ApiResponse({ status: 202, description: 'Test notification queued' })
  async sendTest(@CurrentUser() user: JwtPayload, @Body() dto: TestNotificationDto) {
    return this.notificationsService.sendTest(user.sub, dto);
  }

  // ── PATCH /api/v1/notifications/read ──────────────────────────────────────

  @Patch('read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark notifications as read' })
  @ApiResponse({ status: 200 })
  async markRead(@CurrentUser() user: JwtPayload, @Body() dto: MarkReadDto) {
    return this.notificationsService.markRead(user.sub, dto);
  }

  // ── GET /api/v1/notifications/:id ─────────────────────────────────────────

  @Get(':id')
  @ApiParam({ name: 'id', type: String, description: 'Notification UUID' })
  @ApiOperation({ summary: 'Get a single notification with delivery events' })
  @ApiResponse({ status: 200, type: NotificationResponseDto })
  async findOne(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.notificationsService.findOne(user.sub, id);
  }
}

// ── Separate controller for notification preferences ──────────────────────────

@ApiTags('Notification Preferences')
@ApiBearerAuth()
@Controller('preferences/notifications')
export class NotificationPreferencesController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get notification preferences for the authenticated user' })
  async getPreferences(@CurrentUser() user: JwtPayload) {
    return this.notificationsService.getPreferences(user.sub);
  }

  @Patch()
  @ApiOperation({ summary: 'Update notification preferences' })
  @ApiResponse({ status: 200 })
  async updatePreferences(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    return this.notificationsService.updatePreferences(user.sub, dto);
  }
}
