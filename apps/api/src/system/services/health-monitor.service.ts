import * as fs from 'fs';
import * as path from 'path';

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';

import type { AppConfig } from '../../config/configuration';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

export interface ComponentCheckResult {
  name: string;
  status: 'HEALTHY' | 'DEGRADED' | 'WARNING' | 'CRITICAL' | 'UNKNOWN';
  latency: number;
  errorRate: number;
  failureCount: number;
  metadata?: any;
}

@Injectable()
export class HealthMonitorService {
  private readonly logger = new Logger(HealthMonitorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  /**
   * Triggers lightweight checks across registered infrastructure components,
   * updates components registry and writes historic snapshots to database.
   */
  async runHealthChecks(): Promise<ComponentCheckResult[]> {
    const results: ComponentCheckResult[] = [];

    // 1. API check
    results.push({
      name: 'API',
      status: 'HEALTHY',
      latency: 0,
      errorRate: 0,
      failureCount: 0,
      metadata: { uptime: process.uptime() },
    });

    // 2. Database check
    results.push(await this.checkDatabase());

    // 3. Redis check
    results.push(await this.checkRedis());

    // 4. Storage check
    results.push(await this.checkStorage());

    // 5. Queues check
    results.push(await this.checkQueues());

    // 6. External integrations configs check (AI, Email, SMS, Push)
    results.push(this.checkExternalIntegrations());

    // Save results to DB SystemComponent & HealthSnapshot
    await this.persistHealthResults(results);

    return results;
  }

  private async checkDatabase(): Promise<ComponentCheckResult> {
    const start = Date.now();
    try {
      const isHealthy = await this.prisma.isHealthy();
      const latency = Date.now() - start;
      return {
        name: 'DATABASE',
        status: isHealthy ? 'HEALTHY' : 'CRITICAL',
        latency,
        errorRate: isHealthy ? 0 : 1,
        failureCount: isHealthy ? 0 : 1,
        metadata: { latencyMs: latency },
      };
    } catch (e) {
      return {
        name: 'DATABASE',
        status: 'CRITICAL',
        latency: Date.now() - start,
        errorRate: 1.0,
        failureCount: 1,
        metadata: { error: e instanceof Error ? e.message : String(e) },
      };
    }
  }

  private async checkRedis(): Promise<ComponentCheckResult> {
    const start = Date.now();
    try {
      const isHealthy = await this.redis.isHealthy();
      const latency = Date.now() - start;
      return {
        name: 'REDIS',
        status: isHealthy ? 'HEALTHY' : 'CRITICAL',
        latency,
        errorRate: isHealthy ? 0 : 1,
        failureCount: isHealthy ? 0 : 1,
        metadata: { latencyMs: latency },
      };
    } catch (e) {
      return {
        name: 'REDIS',
        status: 'CRITICAL',
        latency: Date.now() - start,
        errorRate: 1.0,
        failureCount: 1,
        metadata: { error: e instanceof Error ? e.message : String(e) },
      };
    }
  }

  private async checkStorage(): Promise<ComponentCheckResult> {
    const start = Date.now();
    const tempFilePath = path.join(process.cwd(), 'scratch', 'storage-health-check.txt');

    // Ensure scratch directory exists
    const scratchDir = path.dirname(tempFilePath);
    if (!fs.existsSync(scratchDir)) {
      fs.mkdirSync(scratchDir, { recursive: true });
    }

    try {
      // Test write
      fs.writeFileSync(tempFilePath, `Health Check — ${new Date().toISOString()}`, 'utf8');

      // Test read
      const content = fs.readFileSync(tempFilePath, 'utf8');

      // Test delete
      fs.unlinkSync(tempFilePath);

      const latency = Date.now() - start;
      return {
        name: 'STORAGE',
        status: content.includes('Health Check') ? 'HEALTHY' : 'CRITICAL',
        latency,
        errorRate: 0,
        failureCount: 0,
        metadata: { writeLatencyMs: latency },
      };
    } catch (e) {
      return {
        name: 'STORAGE',
        status: 'CRITICAL',
        latency: Date.now() - start,
        errorRate: 1.0,
        failureCount: 1,
        metadata: { error: e instanceof Error ? e.message : String(e) },
      };
    }
  }

  private async checkQueues(): Promise<ComponentCheckResult> {
    const start = Date.now();
    try {
      const connection = this.redis.getClient();
      const testQueue = new Queue('health-check-queue', { connection });
      const counts = await testQueue.getJobCounts('waiting', 'active', 'failed');
      await testQueue.close();

      const latency = Date.now() - start;
      const failedCount = counts['failed'] || 0;

      let status: ComponentCheckResult['status'] = 'HEALTHY';
      if (failedCount > 100) {
        status = 'WARNING';
      }
      if (failedCount > 1000) {
        status = 'CRITICAL';
      }

      return {
        name: 'QUEUE',
        status,
        latency,
        errorRate: failedCount > 0 ? 0.05 : 0,
        failureCount: failedCount,
        metadata: { failedJobsCount: failedCount, activeJobsCount: counts['active'] || 0 },
      };
    } catch (e) {
      return {
        name: 'QUEUE',
        status: 'CRITICAL',
        latency: Date.now() - start,
        errorRate: 1.0,
        failureCount: 1,
        metadata: { error: e instanceof Error ? e.message : String(e) },
      };
    }
  }

  private checkExternalIntegrations(): ComponentCheckResult {
    const aiConfig = this.configService.get('ai', { infer: true });
    const notificationConfig = this.configService.get('notifications', { infer: true });

    const metadata: Record<string, any> = {
      aiProvider: aiConfig?.provider,
      aiModel: aiConfig?.model,
      sendgridConfigured: !!notificationConfig?.sendgridApiKey,
      fcmConfigured: !!notificationConfig?.fcmProjectId,
      twilioEnabled: notificationConfig?.twilioEnabled,
    };

    // Lightweight verification of configurations
    let isHealthy = true;
    const errors: string[] = [];

    if (!aiConfig?.apiKey) {
      isHealthy = false;
      errors.push('AI API key is missing.');
    }
    if (!notificationConfig?.sendgridApiKey) {
      isHealthy = false;
      errors.push('Email provider API key is missing.');
    }

    return {
      name: 'EXTERNAL_PROVIDERS',
      status: isHealthy ? 'HEALTHY' : 'WARNING',
      latency: 0,
      errorRate: isHealthy ? 0.0 : 0.2,
      failureCount: errors.length,
      metadata: { ...metadata, errors },
    };
  }

  private async persistHealthResults(results: ComponentCheckResult[]): Promise<void> {
    for (const r of results) {
      try {
        // 1. Upsert SystemComponent registry
        await this.prisma.systemComponent.upsert({
          where: { name: r.name },
          create: {
            name: r.name,
            status: r.status,
            latency: r.latency,
            errorRate: r.errorRate,
            failureCount: r.failureCount,
            metadata: r.metadata || {},
            lastSuccessfulCheck: r.status === 'HEALTHY' ? new Date() : new Date(0),
          },
          update: {
            status: r.status,
            latency: r.latency,
            errorRate: r.errorRate,
            failureCount: r.failureCount,
            metadata: r.metadata || {},
            ...(r.status === 'HEALTHY' ? { lastSuccessfulCheck: new Date() } : {}),
          },
        });

        // 2. Write historical health snapshots
        await this.prisma.healthSnapshot.create({
          data: {
            componentName: r.name,
            status: r.status,
            latency: r.latency,
            errorRate: r.errorRate,
            failureCount: r.failureCount,
            metadata: r.metadata || {},
          },
        });
      } catch (e) {
        this.logger.error(
          `Failed to persist SRE status for component ${r.name}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
  }
}
