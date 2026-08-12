import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsUUID } from 'class-validator';

import { NotificationStatus } from '../enums/notification.enums';

/** PATCH /api/v1/notifications/read — mark one or many notifications as read */
export class MarkReadDto {
  @ApiProperty({ type: [String], description: 'Array of notification IDs to mark as read' })
  @IsArray()
  @IsUUID('4', { each: true })
  ids!: string[];
}

/** Query params for GET /api/v1/notifications */
export class GetNotificationsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ enum: NotificationStatus })
  @IsOptional()
  @IsEnum(NotificationStatus)
  status?: NotificationStatus;

  @ApiPropertyOptional({ description: 'Filter unread only' })
  @IsOptional()
  unreadOnly?: boolean;
}
