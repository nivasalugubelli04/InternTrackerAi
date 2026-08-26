import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AppConfig } from '../../config/configuration';
import { RedisService } from '../../redis/redis.service';

export type AiLimitType = 'chat' | 'resume' | 'cover_letter' | 'interview';

@Injectable()
export class AiRateLimiterService {
  constructor(
    private readonly redis: RedisService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  private get aiConfig() {
    return this.configService.get('ai', { infer: true });
  }

  /**
   * Check if the user has reached their rate limit for a specific feature.
   * Throws TOO_MANY_REQUESTS exception if exceeded.
   */
  async checkLimit(userId: string, type: AiLimitType): Promise<void> {
    const limits = this.aiConfig.rateLimits;
    let limit = 0;
    let ttlSeconds = 0;

    switch (type) {
      case 'chat':
        limit = limits.chatPerHour;
        ttlSeconds = 3600;
        break;
      case 'resume':
        limit = limits.resumePerDay;
        ttlSeconds = 86400;
        break;
      case 'cover_letter':
        limit = limits.coverLetterPerDay;
        ttlSeconds = 86400;
        break;
      case 'interview':
        limit = limits.interviewPerDay;
        ttlSeconds = 86400;
        break;
    }

    if (limit <= 0) return; // 0 or negative means unlimited

    try {
      const client = this.redis.getClient();
      const key = `ai:ratelimit:${type}:${userId}`;
      const current = await client.get(key);

      if (current && parseInt(current, 10) >= limit) {
        throw new HttpException(
          `AI Rate Limit Exceeded for ${type}. Allowed: ${limit} per ${ttlSeconds === 3600 ? 'hour' : 'day'}.`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    } catch (err: any) {
      if (err instanceof HttpException) throw err;
      // If Redis has a transient network error, allow request through gracefully
    }
  }

  /**
   * Increments the request count for a user under the specific feature rate limit.
   */
  async increment(userId: string, type: AiLimitType): Promise<void> {
    const limits = this.aiConfig.rateLimits;
    let limit = 0;
    let ttlSeconds = 0;

    switch (type) {
      case 'chat':
        limit = limits.chatPerHour;
        ttlSeconds = 3600;
        break;
      case 'resume':
        limit = limits.resumePerDay;
        ttlSeconds = 86400;
        break;
      case 'cover_letter':
        limit = limits.coverLetterPerDay;
        ttlSeconds = 86400;
        break;
      case 'interview':
        limit = limits.interviewPerDay;
        ttlSeconds = 86400;
        break;
    }

    if (limit <= 0) return;

    try {
      const client = this.redis.getClient();
      const key = `ai:ratelimit:${type}:${userId}`;

      const pipeline = client.pipeline();
      pipeline.incr(key);
      pipeline.expire(key, ttlSeconds);
      await pipeline.exec();
    } catch {
      // Degrade gracefully on redis error
    }
  }
}
