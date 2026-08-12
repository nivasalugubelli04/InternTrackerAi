/**
 * Phase 6 — SMS Provider (Twilio)
 *
 * Feature-flagged: TWILIO_ENABLED=false by default.
 * When disabled, send() is a no-op that returns a clear error.
 * When enabled, uses the Twilio REST API directly (no SDK) to avoid
 * adding a heavy optional dependency to the bundle.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AppConfig } from '../../config/configuration';
import { NotificationChannel } from '../enums/notification.enums';
import type {
  INotificationProvider,
  NotificationPayload,
  ProviderSendResult,
} from '../interfaces/notification-provider.interface';

@Injectable()
export class SmsProvider implements INotificationProvider {
  readonly channel = NotificationChannel.SMS;
  readonly providerName = 'twilio';

  private readonly logger = new Logger(SmsProvider.name);
  private readonly enabled: boolean;
  private readonly sid: string;
  private readonly token: string;
  private readonly from: string;

  constructor(private readonly config: ConfigService<AppConfig, true>) {
    const notifConfig = this.config.get('notifications', { infer: true });
    this.enabled = notifConfig.twilioEnabled;
    this.sid = notifConfig.twilioSid;
    this.token = notifConfig.twilioToken;
    this.from = notifConfig.twilioFrom;

    if (!this.enabled) {
      this.logger.log('SMS provider is disabled (TWILIO_ENABLED=false)');
    }
  }

  async send(payload: NotificationPayload): Promise<ProviderSendResult> {
    if (!this.enabled) {
      return {
        success: false,
        error: 'SMS is disabled — set TWILIO_ENABLED=true to enable',
      };
    }

    if (!this.sid || !this.token) {
      return { success: false, error: 'Twilio credentials not configured' };
    }

    try {
      const basicAuth = Buffer.from(`${this.sid}:${this.token}`).toString('base64');
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.sid}/Messages.json`;

      const body = new URLSearchParams({
        From: this.from,
        To: payload.recipient,
        Body: `${payload.title}: ${payload.message}`,
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      const data = (await response.json()) as { sid?: string; message?: string; status?: string };

      if (!response.ok) {
        const errorMsg = data.message ?? `HTTP ${response.status}`;
        this.logger.warn(
          { notificationId: payload.notificationId, error: errorMsg },
          'SMS send failed',
        );
        return { success: false, error: errorMsg, rawResponse: data };
      }

      this.logger.log({ notificationId: payload.notificationId, sid: data.sid }, 'SMS sent');
      return { success: true, messageId: data.sid, rawResponse: data };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        { notificationId: payload.notificationId, error: message },
        'SMS provider error',
      );
      return { success: false, error: message };
    }
  }

  async healthCheck(): Promise<boolean> {
    return this.enabled && Boolean(this.sid) && Boolean(this.token);
  }
}
