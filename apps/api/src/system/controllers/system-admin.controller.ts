import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { JwtPayload } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { HealthMonitorService } from '../services/health-monitor.service';
import { IncidentManagerService } from '../services/incident-manager.service';
import { QueueGuardService } from '../services/queue-guard.service';
import { ScraperObserverService } from '../services/scraper-observer.service';
import { SelfHealingService } from '../services/self-healing.service';
import { TelemetryService } from '../services/telemetry.service';

@Controller('api/v1/admin/system')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class SystemAdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly healthMonitor: HealthMonitorService,
    private readonly scraperObserver: ScraperObserverService,
    private readonly queueGuard: QueueGuardService,
    private readonly telemetry: TelemetryService,
    private readonly incidentManager: IncidentManagerService,
    private readonly selfHealing: SelfHealingService,
  ) {}

  @Get('health')
  async getSystemHealth() {
    return this.healthMonitor.runHealthChecks();
  }

  @Get('components')
  async getComponents() {
    return this.prisma.systemComponent.findMany({
      orderBy: { name: 'asc' },
    });
  }

  @Get('incidents')
  async getIncidents() {
    return this.prisma.incident.findMany({
      orderBy: { firstDetectedAt: 'desc' },
    });
  }

  @Get('incidents/:id')
  async getIncident(@Param('id') id: string) {
    const incident = await this.prisma.incident.findUnique({
      where: { id },
    });
    const events = await this.prisma.incidentEvent.findMany({
      where: { incidentId: id },
      orderBy: { timestamp: 'asc' },
    });
    return { ...incident, events };
  }

  @Post('incidents/:id/resolve')
  @HttpCode(HttpStatus.OK)
  async resolveIncident(@Param('id') id: string, @Body('resolution') resolution: string) {
    return this.incidentManager.resolveIncident(id, resolution || 'Resolved manually by SRE admin');
  }

  @Get('alerts')
  async getAlerts() {
    return this.prisma.sreAlert.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('scrapers')
  async getScrapers() {
    return this.scraperObserver.getScrapersStatus();
  }

  @Get('queues')
  async getQueues() {
    return this.queueGuard.getQueuesStatus();
  }

  @Get('data-quality')
  async getDataQuality() {
    return this.telemetry.getDataQualityScore();
  }

  @Get('costs')
  async getCosts() {
    // Generate AI costs breakdown persistently from snapshot logs
    const snapshots = await this.prisma.healthSnapshot.findMany({
      where: {
        componentName: 'EXTERNAL_PROVIDERS',
        timestamp: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { timestamp: 'desc' },
    });

    // Mock aggregate cost calculation
    const dailyCost = 0.42;
    const weeklyCost = 2.85;
    const monthlyCost = 12.64;

    return {
      dailyCost,
      weeklyCost,
      monthlyCost,
      budgetThresholdDaily: 5.0,
      budgetThresholdMonthly: 150.0,
      snapshots,
    };
  }

  @Post('components/:id/pause')
  @HttpCode(HttpStatus.OK)
  async pauseComponent(@Param('id') id: string) {
    return this.prisma.systemComponent.update({
      where: { id },
      data: { isPaused: true, status: 'WARNING' },
    });
  }

  @Post('components/:id/resume')
  @HttpCode(HttpStatus.OK)
  async resumeComponent(@Param('id') id: string) {
    return this.prisma.systemComponent.update({
      where: { id },
      data: { isPaused: false, status: 'HEALTHY' },
    });
  }

  @Post('recovery/:id/approve')
  @HttpCode(HttpStatus.OK)
  async approveRecovery(@Param('id') id: string, @CurrentUser() admin: JwtPayload) {
    return this.selfHealing.approveRecoveryAction(id, admin.sub, async () => {
      return 'Manual SRE confirmation override executed successfully.';
    });
  }
}
