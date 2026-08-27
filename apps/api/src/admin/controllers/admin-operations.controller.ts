import { Controller, Get, Post, Patch, Param, Body, UseGuards, Req } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { RateLimitProfile } from '../../common/decorators/rate-limit.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { HealthMonitorService } from '../../system/services/health-monitor.service';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { AdminPermission } from '../enums/admin-permission.enum';
import { PermissionGuard } from '../guards/permission.guard';
import { AdminAuditService } from '../services/admin-audit.service';
import { AiOpsService } from '../services/ai-ops.service';
import { JobOpsService } from '../services/job-ops.service';

@Controller('v1/admin/operations')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@RateLimitProfile('admin')
export class AdminOperationsController {
  constructor(
    private readonly healthMonitor: HealthMonitorService,
    private readonly aiOps: AiOpsService,
    private readonly jobOps: JobOpsService,
    private readonly auditService: AdminAuditService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('overview')
  @RequirePermission(AdminPermission.SYSTEM_HEALTH_VIEW)
  async getPlatformOverview() {
    const [healthChecks, activeIncidents, aiTelemetry, queues, totalUsers, activeSubscriptions] =
      await Promise.all([
        this.healthMonitor.runHealthChecks(),
        this.prisma.incident.findMany({
          where: { status: { in: ['DETECTED', 'INVESTIGATING', 'MITIGATING'] } },
          orderBy: { firstDetectedAt: 'desc' },
          take: 5,
        }),
        this.aiOps.getAiOpsTelemetry(),
        this.jobOps.getQueuesOverview(),
        this.prisma.user.count(),
        this.prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      ]);

    const isSystemDegraded =
      activeIncidents.some((i) => i.severity === 'P0' || i.severity === 'P1') ||
      healthChecks.some((c) => c.status === 'CRITICAL' || c.status === 'DEGRADED');

    return {
      systemStatus: isSystemDegraded ? 'DEGRADED' : 'HEALTHY',
      apiUptimeSeconds: Math.round(process.uptime()),
      totalUsers,
      activePaidUsers: activeSubscriptions,
      activeIncidentsCount: activeIncidents.length,
      healthChecks,
      activeIncidents,
      aiTelemetrySummary: {
        totalRequestsToday: aiTelemetry.totalRequestsToday,
        successRate: aiTelemetry.overallSuccessRate,
        averageLatencyMs: aiTelemetry.averageLatencyMs,
      },
      queuesSummary: queues,
    };
  }

  @Get('ai-telemetry')
  @RequirePermission(AdminPermission.AI_OPS_VIEW)
  async getAiTelemetry() {
    return this.aiOps.getAiOpsTelemetry();
  }

  @Get('queues')
  @RequirePermission(AdminPermission.JOB_OPS_VIEW)
  async getQueues() {
    const [queues, failedJobs] = await Promise.all([
      this.jobOps.getQueuesOverview(),
      this.jobOps.getFailedJobs(),
    ]);

    return {
      queues,
      failedJobs,
    };
  }

  @Post('queues/:queue/retry/:jobId')
  @RequirePermission(AdminPermission.JOB_RETRY)
  async retryJob(@Req() req: any, @Param('queue') queue: string, @Param('jobId') jobId: string) {
    const result = await this.jobOps.retryJob(queue, jobId);

    void this.auditService.logAction(
      req.user.id,
      'RETRY_BACKGROUND_JOB',
      'BACKGROUND_JOB',
      jobId,
      { queue },
      req.ip,
    );

    return result;
  }

  @Get('incidents')
  @RequirePermission(AdminPermission.INCIDENT_VIEW)
  async getIncidents() {
    const incidents = await this.prisma.incident.findMany({
      orderBy: { firstDetectedAt: 'desc' },
      take: 50,
    });

    const incidentIds = incidents.map((i) => i.id);
    const events = await this.prisma.incidentEvent.findMany({
      where: { incidentId: { in: incidentIds } },
      orderBy: { timestamp: 'asc' },
    });

    const eventsByIncident: Record<string, any[]> = {};
    for (const ev of events) {
      if (!eventsByIncident[ev.incidentId]) {
        eventsByIncident[ev.incidentId] = [];
      }
      eventsByIncident[ev.incidentId]?.push(ev);
    }

    return incidents.map((i) => ({
      ...i,
      events: eventsByIncident[i.id] || [],
    }));
  }

  @Patch('incidents/:id/status')
  @RequirePermission(AdminPermission.INCIDENT_MANAGE)
  async updateIncidentStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { status: string; message: string },
  ) {
    const incident = await this.prisma.incident.update({
      where: { id },
      data: {
        status: body.status,
        ...(body.status === 'RESOLVED' ? { resolvedAt: new Date() } : {}),
      },
    });

    await this.prisma.incidentEvent.create({
      data: {
        incidentId: id,
        status: body.status,
        message: `Admin ${req.user.email || req.user.id} updated status to ${body.status}: ${body.message}`,
      },
    });

    void this.auditService.logAction(
      req.user.id,
      'UPDATE_INCIDENT_STATUS',
      'INCIDENT',
      id,
      { status: body.status, message: body.message },
      req.ip,
    );

    return incident;
  }
}
