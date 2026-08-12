/**
 * Phase 6 — Provider Factory
 *
 * Factory Pattern: resolves the correct INotificationProvider for a given
 * NotificationChannel. Adding a new channel requires only:
 *   1. Implementing INotificationProvider
 *   2. Registering the provider here
 */

import { Injectable } from '@nestjs/common';

import type { NotificationChannel } from '../enums/notification.enums';
import type { INotificationProvider } from '../interfaces/notification-provider.interface';

import { EmailProvider } from './email.provider';
import { PushProvider } from './push.provider';
import { SmsProvider } from './sms.provider';

@Injectable()
export class ProviderFactory {
  private readonly registry = new Map<NotificationChannel, INotificationProvider>();

  constructor(
    private readonly emailProvider: EmailProvider,
    private readonly pushProvider: PushProvider,
    private readonly smsProvider: SmsProvider,
  ) {
    // Register all providers — add new ones here
    this.register(this.emailProvider);
    this.register(this.pushProvider);
    this.register(this.smsProvider);
  }

  /** Retrieve a provider by channel. Throws if no provider registered. */
  get(channel: NotificationChannel): INotificationProvider {
    const provider = this.registry.get(channel);
    if (!provider) {
      throw new Error(`No provider registered for channel: ${channel}`);
    }
    return provider;
  }

  /** Returns all registered providers */
  getAll(): INotificationProvider[] {
    return Array.from(this.registry.values());
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private register(provider: INotificationProvider): void {
    this.registry.set(provider.channel, provider);
  }
}
