import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

import { NotificationChannel } from '../enums/notification.enums';

/**
 * POST /api/v1/notifications/test
 * Triggers a test notification so users can verify their settings.
 */
export class TestNotificationDto {
  @ApiPropertyOptional({
    enum: NotificationChannel,
    description: 'Channel to send the test notification on (defaults to PUSH)',
  })
  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel;

  @ApiPropertyOptional({ description: 'Optional custom message for the test notification' })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({ description: 'Target userId — admin only; defaults to current user' })
  @IsOptional()
  @IsUUID()
  targetUserId?: string;
}
