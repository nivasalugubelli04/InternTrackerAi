import { Controller, Get, Patch, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import type { CareerPreference, NotificationPreference } from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

import {
  UpdatePreferencesDto,
  UpdateNotificationPreferenceDto,
} from './dto/update-preferences.dto';
import type { AllPreferences } from './preferences.service';
import { PreferencesService } from './preferences.service';

@ApiTags('Preferences')
@ApiBearerAuth()
@Controller('preferences')
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all preferences (career + notifications)' })
  @ApiResponse({ status: 200, description: 'Preferences returned' })
  findAll(@CurrentUser() user: JwtPayload): Promise<AllPreferences> {
    return this.preferencesService.findAll(user.sub);
  }

  @Patch('career')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update career preferences' })
  @ApiResponse({ status: 200, description: 'Career preferences updated' })
  updateCareer(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdatePreferencesDto,
  ): Promise<CareerPreference> {
    return this.preferencesService.updateCareer(user.sub, dto);
  }

  @Patch('notifications')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update notification preferences' })
  @ApiResponse({ status: 200, description: 'Notification preferences updated' })
  updateNotifications(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateNotificationPreferenceDto,
  ): Promise<NotificationPreference> {
    return this.preferencesService.updateNotifications(user.sub, dto);
  }
}
