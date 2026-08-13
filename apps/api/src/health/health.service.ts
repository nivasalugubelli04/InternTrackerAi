import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

export type HealthStatus = 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE';

export interface ComponentHealth {
  status: HealthStatus;
  latencyMs?: number;
  error?: string;
}

export interface HealthReport {
  status: HealthStatus;
  timestamp: string;
  uptime: number;
  components: {
    api: ComponentHealth;
    database: ComponentHealth;
    redis: ComponentHealth;
  };
}

/**
 * HealthService aggregates the health of each infrastructure component.
 *
 * Architectural Decision:
 *  - Each check is run independently (Promise.allSettled) so that a
 *    single failing component doesn't mask the status of others.
 *  - Latency is measured per component to aid incident triage.
 *  - The overall status is "degraded" if any component is unhealthy
 *    and "down" if the API itself cannot serve the response (practically
 *    unreachable from this service, but included for future extension).
 */
@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getHealth(): Promise<HealthReport> {
    const [dbResult, redisResult] = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const database =
      dbResult.status === 'fulfilled'
        ? dbResult.value
        : { status: 'UNAVAILABLE' as HealthStatus, error: String(dbResult.reason) };
    const redis =
      redisResult.status === 'fulfilled'
        ? redisResult.value
        : { status: 'UNAVAILABLE' as HealthStatus, error: String(redisResult.reason) };

    const api: ComponentHealth = { status: 'HEALTHY' };

    const overallStatus: HealthStatus =
      database.status === 'HEALTHY' && redis.status === 'HEALTHY' ? 'HEALTHY' : 'DEGRADED';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      components: { api, database, redis },
    };
  }

  private async checkDatabase(): Promise<ComponentHealth> {
    const start = Date.now();
    const healthy = await this.prisma.isHealthy();
    const latencyMs = Date.now() - start;
    return { status: healthy ? 'HEALTHY' : 'UNAVAILABLE', latencyMs };
  }

  private async checkRedis(): Promise<ComponentHealth> {
    const start = Date.now();
    const healthy = await this.redis.isHealthy();
    const latencyMs = Date.now() - start;
    return { status: healthy ? 'HEALTHY' : 'UNAVAILABLE', latencyMs };
  }
}
