import type { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

import type { AppConfig } from '../config/configuration';

/**
 * RedisService wraps the ioredis client and hooks into the NestJS lifecycle.
 *
 * Architectural Decision:
 *  - We expose the ioredis client directly (getClient()) rather than
 *    wrapping every Redis command. This avoids boilerplate while still
 *    keeping the DI boundary — callers depend on RedisService, not on
 *    the raw ioredis import.
 *  - The connection uses retry strategy with exponential backoff so that
 *    transient Redis unavailability during startup doesn't crash the pod.
 */

const MAX_RETRY_ATTEMPTS = 10;
const BASE_RETRY_DELAY_MS = 50;

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;

  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  onModuleInit(): void {
    const redisConfig = this.configService.get('redis', { infer: true });

    this.client = new Redis({
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password !== '' ? redisConfig.password : undefined,
      db: redisConfig.db,
      lazyConnect: false,
      retryStrategy: (times: number): number | null => {
        if (times > MAX_RETRY_ATTEMPTS) {
          this.logger.error(`Redis retry limit (${MAX_RETRY_ATTEMPTS}) exceeded`);
          return null; // Stop retrying
        }
        const delay = Math.min(times * BASE_RETRY_DELAY_MS, 2000);
        this.logger.warn(`Redis reconnecting in ${delay}ms (attempt ${times})`);
        return delay;
      },
    });

    this.client.on('connect', () => this.logger.log('Redis connection established'));
    this.client.on('ready', () => this.logger.log('Redis ready'));
    this.client.on('error', (err: Error) => this.logger.error({ err }, 'Redis error'));
    this.client.on('close', () => this.logger.warn('Redis connection closed'));
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Closing Redis connection…');
    await this.client.quit();
    this.logger.log('Redis connection closed');
  }

  /**
   * Returns the raw ioredis client for use in other services.
   */
  getClient(): Redis {
    return this.client;
  }

  /**
   * Checks Redis connectivity. Used by the health endpoint.
   */
  async isHealthy(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }
}
