/**
 * Phase 6 — Notifications Module
 *
 * Wires together all notification engine components:
 *  - BullMQ queues (notification, email, push, sms, digest, dlq)
 *  - Providers (Email, Push, SMS)
 *  - Decision engine services
 *  - Queue processors
 *  - Digest scheduler
 *  - REST controllers
 *
 * Phase 6 — Notification Intelligence Engine
 */

import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';

import {
  NOTIFICATION_QUEUE,
  EMAIL_QUEUE,
  PUSH_QUEUE,
  SMS_QUEUE,
  DIGEST_QUEUE,
  DEAD_LETTER_QUEUE,
} from './constants/notification.constants';
import {
  NotificationsController,
  NotificationPreferencesController,
} from './controllers/notifications.controller';
import { EmailProvider } from './providers/email.provider';
import { ProviderFactory } from './providers/provider.factory';
import { PushProvider } from './providers/push.provider';
import { SmsProvider } from './providers/sms.provider';
import { DigestProcessor } from './queues/digest.processor';
import { EmailProcessor } from './queues/email.processor';
import { NotificationProcessor } from './queues/notification.processor';
import { PushProcessor } from './queues/push.processor';
import { SmsProcessor } from './queues/sms.processor';
import { DigestSchedulerService } from './schedulers/digest.scheduler';
import { DeliveryTrackerService } from './services/delivery-tracker.service';
import { FrequencyLimiterService } from './services/frequency-limiter.service';
import { NotificationDecisionService } from './services/notification-decision.service';
import { NotificationsService } from './services/notifications.service';
import { PreferenceValidatorService } from './services/preference-validator.service';
import { PriorityCalculatorService } from './services/priority-calculator.service';

// Processors

// Schedulers

// Controllers

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    RedisModule,
    // Cron scheduler for digest jobs
    ScheduleModule.forRoot(),
    // Register all BullMQ queues
    BullModule.registerQueue(
      { name: NOTIFICATION_QUEUE },
      { name: EMAIL_QUEUE },
      { name: PUSH_QUEUE },
      { name: SMS_QUEUE },
      { name: DIGEST_QUEUE },
      { name: DEAD_LETTER_QUEUE },
    ),
  ],
  controllers: [NotificationsController, NotificationPreferencesController],
  providers: [
    // ── Channel providers ────────────────────────────────────────────────────
    EmailProvider,
    PushProvider,
    SmsProvider,
    ProviderFactory,

    // ── Decision engine ──────────────────────────────────────────────────────
    PriorityCalculatorService,
    PreferenceValidatorService,
    FrequencyLimiterService,
    NotificationDecisionService,
    DeliveryTrackerService,

    // ── API service ──────────────────────────────────────────────────────────
    NotificationsService,

    // ── Queue processors ─────────────────────────────────────────────────────
    NotificationProcessor,
    EmailProcessor,
    PushProcessor,
    SmsProcessor,
    DigestProcessor,

    // ── Schedulers ───────────────────────────────────────────────────────────
    DigestSchedulerService,
  ],
  exports: [
    // Export decision engine so MatchingModule can trigger notifications
    NotificationDecisionService,
    NotificationsService,
    DeliveryTrackerService,
    FrequencyLimiterService,
  ],
})
export class NotificationsModule {}
