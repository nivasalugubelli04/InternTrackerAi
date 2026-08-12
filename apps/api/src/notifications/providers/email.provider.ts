/**
 * Phase 6 — Email Provider (SendGrid SMTP relay via nodemailer)
 *
 * Design decisions:
 *  - Uses nodemailer with SendGrid SMTP relay (already-installed dep).
 *  - If SENDGRID_API_KEY starts with "SG." the transport switches to
 *    the SendGrid SMTP2Go endpoint automatically.
 *  - Falls back gracefully to the configured EMAIL_HOST if no SendGrid key.
 *  - Never throws — always returns ProviderSendResult.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

import type { AppConfig } from '../../config/configuration';
import { NotificationChannel } from '../enums/notification.enums';
import type {
  INotificationProvider,
  NotificationPayload,
  ProviderSendResult,
} from '../interfaces/notification-provider.interface';
import { buildInstantAlertHtml } from '../templates/instant-alert.template';

@Injectable()
export class EmailProvider implements INotificationProvider {
  readonly channel = NotificationChannel.EMAIL;
  readonly providerName = 'sendgrid';

  private readonly logger = new Logger(EmailProvider.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;

  constructor(private readonly config: ConfigService<AppConfig, true>) {
    const notifConfig = this.config.get('notifications', { infer: true });
    const emailConfig = this.config.get('email', { infer: true });

    // Use SendGrid SMTP relay if API key is configured
    const useSendGrid = notifConfig.sendgridApiKey.startsWith('SG.');

    this.from = useSendGrid ? notifConfig.sendgridFrom : emailConfig.from;

    this.transporter = useSendGrid
      ? nodemailer.createTransport({
          host: 'smtp.sendgrid.net',
          port: 587,
          secure: false,
          auth: {
            user: 'apikey',
            pass: notifConfig.sendgridApiKey,
          },
        })
      : nodemailer.createTransport({
          host: emailConfig.host,
          port: emailConfig.port,
          secure: emailConfig.secure,
          auth: {
            user: emailConfig.user,
            pass: emailConfig.password,
          },
        });
  }

  async send(payload: NotificationPayload): Promise<ProviderSendResult> {
    try {
      const html = buildInstantAlertHtml({
        title: payload.title,
        message: payload.message,
        actionUrl: payload.actionUrl,
      });

      const info = await this.transporter.sendMail({
        from: this.from,
        to: payload.recipient,
        subject: payload.title,
        html,
        text: payload.message,
      });

      this.logger.log(
        {
          notificationId: payload.notificationId,
          messageId: info.messageId,
        },
        'Email sent',
      );

      return {
        success: true,
        messageId: String(info.messageId),
        rawResponse: info,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        {
          notificationId: payload.notificationId,
          error: message,
        },
        'Email send failed',
      );

      return {
        success: false,
        error: message,
        rawResponse: error,
      };
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch {
      return false;
    }
  }
}
