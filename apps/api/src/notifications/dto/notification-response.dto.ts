import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import {
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
} from '../enums/notification.enums';

export class NotificationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() userId!: string;
  @ApiPropertyOptional() jobId?: string | null;
  @ApiProperty() type!: string;
  @ApiProperty() title!: string;
  @ApiProperty() message!: string;
  @ApiProperty() channel!: NotificationChannel;
  @ApiProperty() priority!: NotificationPriority;
  @ApiProperty() status!: NotificationStatus;
  @ApiPropertyOptional() scheduledFor?: Date | null;
  @ApiPropertyOptional() sentAt?: Date | null;
  @ApiPropertyOptional() readAt?: Date | null;
  @ApiPropertyOptional() clickedAt?: Date | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class PaginatedNotificationsDto {
  @ApiProperty({ type: [NotificationResponseDto] }) data!: NotificationResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() hasMore!: boolean;
}
