/**
 * Phase 6 — Push Notification Provider (Firebase Cloud Messaging)
 *
 * Design decisions:
 *  - Uses the FCM v1 HTTP API via a raw fetch call so we avoid the
 *    heavy firebase-admin SDK dependency.
 *  - Authenticates with a Google OAuth2 access token obtained from
 *    the service account credentials in env vars.
 *  - Tokens are cached for 55 minutes (tokens expire at 60 min).
 *  - Gracefully no-ops when FCM credentials are not configured.
 *  - Never throws — always returns ProviderSendResult.
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

interface FcmResponse {
  name?: string;
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

@Injectable()
export class PushProvider implements INotificationProvider {
  readonly channel = NotificationChannel.PUSH;
  readonly providerName = 'fcm';

  private readonly logger = new Logger(PushProvider.name);
  private readonly projectId: string;
  private readonly privateKey: string;
  private readonly clientEmail: string;

  /** Cached OAuth2 access token */
  private cachedToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(private readonly config: ConfigService<AppConfig, true>) {
    const notifConfig = this.config.get('notifications', { infer: true });
    this.projectId = notifConfig.fcmProjectId;
    this.privateKey = notifConfig.fcmPrivateKey;
    this.clientEmail = notifConfig.fcmClientEmail;
  }

  async send(payload: NotificationPayload): Promise<ProviderSendResult> {
    if (!this.isConfigured()) {
      this.logger.warn(
        { notificationId: payload.notificationId },
        'FCM not configured — skipping push',
      );
      return { success: false, error: 'FCM not configured' };
    }

    try {
      const token = await this.getAccessToken();
      const fcmUrl = `https://fcm.googleapis.com/v1/projects/${this.projectId}/messages:send`;

      const body = {
        message: {
          token: payload.recipient,
          notification: {
            title: payload.title,
            body: payload.message,
          },
          data: {
            notificationId: payload.notificationId,
            ...(payload.actionUrl ? { actionUrl: payload.actionUrl } : {}),
            ...(payload.metadata ? { extra: JSON.stringify(payload.metadata) } : {}),
          },
          android: {
            priority: 'high',
            notification: { sound: 'default' },
          },
          apns: {
            payload: {
              aps: {
                sound: 'default',
                badge: (payload.metadata?.['badge'] as number) ?? 1,
              },
            },
          },
        },
      };

      const response = await fetch(fcmUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = (await response.json()) as FcmResponse;

      if (!response.ok || data.error) {
        const errorMsg = data.error?.message ?? `HTTP ${response.status}`;
        this.logger.warn(
          { notificationId: payload.notificationId, error: errorMsg },
          'FCM send failed',
        );
        return { success: false, error: errorMsg, rawResponse: data };
      }

      this.logger.log({ notificationId: payload.notificationId, fcmName: data.name }, 'Push sent');
      return { success: true, messageId: data.name, rawResponse: data };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        { notificationId: payload.notificationId, error: message },
        'Push provider error',
      );
      return { success: false, error: message };
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.isConfigured()) return false;
    try {
      await this.getAccessToken();
      return true;
    } catch {
      return false;
    }
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private isConfigured(): boolean {
    return Boolean(this.projectId && this.privateKey && this.clientEmail);
  }

  /**
   * Obtain a Google OAuth2 access token for FCM.
   * Uses the JWT bearer flow with the service account private key.
   * Token is cached for 55 minutes.
   */
  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedToken && now < this.tokenExpiresAt) {
      return this.cachedToken;
    }

    const jwtHeader = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString(
      'base64url',
    );
    const iat = Math.floor(now / 1000);
    const exp = iat + 3600;
    const claims = {
      iss: this.clientEmail,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat,
      exp,
    };
    const jwtClaims = Buffer.from(JSON.stringify(claims)).toString('base64url');
    const signingInput = `${jwtHeader}.${jwtClaims}`;

    // Dynamically import crypto to sign the JWT
    const { createSign } = await import('crypto');
    const sign = createSign('RSA-SHA256');
    sign.update(signingInput);
    const signature = sign.sign(this.privateKey, 'base64url');
    const jwt = `${signingInput}.${signature}`;

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
    });

    const tokenData = (await tokenResponse.json()) as { access_token: string; expires_in: number };
    this.cachedToken = tokenData.access_token;
    // Cache for 55 minutes (expire 5 min early)
    this.tokenExpiresAt = now + (tokenData.expires_in - 300) * 1000;

    return this.cachedToken;
  }
}
