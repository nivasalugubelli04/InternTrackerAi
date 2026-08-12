import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

/**
 * PATCH /api/v1/preferences/notifications
 */
export class UpdateNotificationPreferencesDto {
  @ApiPropertyOptional({ description: 'Enable email notifications' })
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Enable push notifications' })
  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Enable SMS notifications (requires feature flag)' })
  @IsOptional()
  @IsBoolean()
  smsEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Subscribe to daily digest (Mon-Fri 17:00)' })
  @IsOptional()
  @IsBoolean()
  dailyDigest?: boolean;

  @ApiPropertyOptional({ description: 'Subscribe to weekly digest (Sunday 18:00)' })
  @IsOptional()
  @IsBoolean()
  weeklyDigest?: boolean;

  @ApiPropertyOptional({ description: 'Quiet hours start — HH:MM (24h)', example: '22:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'quietHoursStart must be HH:MM' })
  quietHoursStart?: string;

  @ApiPropertyOptional({ description: 'Quiet hours end — HH:MM (24h)', example: '08:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'quietHoursEnd must be HH:MM' })
  quietHoursEnd?: string;

  @ApiPropertyOptional({
    description: 'Maximum total notifications per day (0 = unlimited)',
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  maxNotificationsPerDay?: number;

  @ApiPropertyOptional({ description: 'Maximum instant alerts per day', minimum: 0, maximum: 50 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  maxInstantAlertsPerDay?: number;

  @ApiPropertyOptional({
    description: 'Comma-separated channel priority order',
    example: 'push,email',
  })
  @IsOptional()
  @IsString()
  channelPriority?: string;

  @ApiPropertyOptional({ description: 'Firebase Cloud Messaging device token' })
  @IsOptional()
  @IsString()
  fcmToken?: string;
}
