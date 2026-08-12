/**
 * Phase 6 — Notification Channel Provider Interface
 *
 * Strategy Pattern: every channel (Email, Push, SMS, WhatsApp…) implements
 * this interface. Adding a new channel = implementing a new class.
 */

import type { NotificationChannel } from '../enums/notification.enums';

/** Payload passed to any provider's send() method */
export interface NotificationPayload {
  /** Database ID of the Notification record */
  notificationId: string;
  userId: string;
  /** Recipient address — email, FCM token, phone number, etc. */
  recipient: string;
  title: string;
  message: string;
  channel: NotificationChannel;
  /** Deep-link or URL to navigate to on click */
  actionUrl?: string | undefined;
  /** Any extra channel-specific data (badge count, image, etc.) */
  metadata?: Record<string, unknown> | undefined;
}

/** Result returned by every provider after a send attempt */
export interface ProviderSendResult {
  success: boolean;
  /** Provider-assigned message / delivery ID */
  messageId?: string | undefined;
  /** Raw provider response for logging */
  rawResponse?: unknown;
  /** Error message if success = false */
  error?: string;
}

/** Token that identifies the provider interface in NestJS DI */
export const NOTIFICATION_PROVIDER = 'NOTIFICATION_PROVIDER';

/** Contract every provider must fulfil */
export interface INotificationProvider {
  /** Which channel this provider handles */
  readonly channel: NotificationChannel;
  /** Human-readable provider name, e.g. "sendgrid", "fcm", "twilio" */
  readonly providerName: string;

  /** Send a notification — never throws; always returns result */
  send(payload: NotificationPayload): Promise<ProviderSendResult>;

  /** Optional: verify provider configuration at startup */
  healthCheck?(): Promise<boolean>;
}
