import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';

import { Public } from '../auth/decorators/public.decorator';

import type { HealthReport } from './health.service';
import { HealthService } from './health.service';

/**
 * HealthController — GET /api/v1/health
 *
 * Returns the health status of the API and its infrastructure dependencies.
 * This endpoint is intentionally unauthenticated so that load balancers,
 * Kubernetes liveness/readiness probes, and monitoring tools can reach it
 * without credentials.
 *
 * HTTP status codes:
 *  - 200  status === "HEALTHY"
 *  - 200  status === "DEGRADED"  (still serving, but monitor closely)
 *
 * Response shape:
 * {
 *   "status": "HEALTHY" | "DEGRADED",
 *   "timestamp": "<ISO8601>",
 *   "uptime": <seconds>,
 *   "components": {
 *     "api":      { "status": "HEALTHY" },
 *     "database": { "status": "HEALTHY", "latencyMs": 2 },
 *     "redis":    { "status": "HEALTHY", "latencyMs": 1 }
 *   }
 * }
 */
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @Public()
  @HttpCode(HttpStatus.OK)
  async check(): Promise<HealthReport> {
    return this.healthService.getHealth();
  }

  @Get('live')
  @Public()
  @HttpCode(HttpStatus.OK)
  live(): { status: string } {
    return { status: 'HEALTHY' };
  }

  @Get('ready')
  @Public()
  @HttpCode(HttpStatus.OK)
  async ready(): Promise<HealthReport> {
    return this.healthService.getHealth();
  }

  @Get('startup')
  @Public()
  @HttpCode(HttpStatus.OK)
  async startup(): Promise<HealthReport> {
    return this.healthService.getHealth();
  }

  @Get('version')
  @Public()
  @HttpCode(HttpStatus.OK)
  version(): { version: string; status: string } {
    return { version: '1.0.0', status: 'HEALTHY' };
  }
}
