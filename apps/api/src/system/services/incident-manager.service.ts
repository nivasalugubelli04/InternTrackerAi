import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';

import {
  NotificationChannel,
  NotificationType,
} from '../../notifications/enums/notification.enums';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class IncidentManagerService {
  private readonly logger = new Logger(IncidentManagerService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Reports and triggers a platform SRE incident. Correlates downstream outages
   * dynamically based on component hierarchy to prevent alert storms.
   */
  async triggerIncident(
    title: string,
    severity: 'P0' | 'P1' | 'P2' | 'P3',
    component: string,
    description: string,
  ): Promise<any> {
    // 1. Root Cause Correlation Rule:
    // If the database is already down, downstream errors in API or Queue
    // are classified as symptoms and correlated rather than independent incidents.
    if (component !== 'DATABASE') {
      const activeDbIncident = await this.prisma.incident.findFirst({
        where: {
          component: 'DATABASE',
          status: { in: ['DETECTED', 'INVESTIGATING', 'MITIGATING'] },
        },
      });

      if (activeDbIncident) {
        this.logger.warn(
          `Correlating incident "${title}" under active Database incident: ${activeDbIncident.id}`,
        );
        // Append event log instead of creating a new incident
        return this.prisma.incidentEvent.create({
          data: {
            incidentId: activeDbIncident.id,
            status: 'DETECTED',
            message: `Correlated error from ${component}: ${title}. Description: ${description}`,
          },
        });
      }
    }

    // 2. Check if a similar incident is already active (deduplication)
    const existingActive = await this.prisma.incident.findFirst({
      where: {
        component,
        status: { in: ['DETECTED', 'INVESTIGATING', 'MITIGATING'] },
        title,
      },
    });

    if (existingActive) {
      this.logger.log(`Incident already active. Appending update event to: ${existingActive.id}`);
      return this.prisma.incidentEvent.create({
        data: {
          incidentId: existingActive.id,
          status: existingActive.status,
          message: `Update: ${description}`,
        },
      });
    }

    // 3. Create new incident
    const incident = await this.prisma.incident.create({
      data: {
        title,
        severity,
        status: 'DETECTED',
        component,
        description,
      },
    });

    await this.prisma.incidentEvent.create({
      data: {
        incidentId: incident.id,
        status: 'DETECTED',
        message: 'Incident detected by Autonomous Platform Monitor.',
      },
    });

    // 4. Trigger alert with deduplication and cooldown check
    await this.sendAlertNotification(incident);

    return incident;
  }

  /**
   * Resolves an operational incident.
   */
  async resolveIncident(incidentId: string, resolution: string): Promise<any> {
    const incident = await this.prisma.incident.findUnique({
      where: { id: incidentId },
    });
    if (!incident) throw new Error('Incident not found');

    const updated = await this.prisma.incident.update({
      where: { id: incidentId },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolution,
      },
    });

    await this.prisma.incidentEvent.create({
      data: {
        incidentId,
        status: 'RESOLVED',
        message: `Incident resolved: ${resolution}`,
      },
    });

    // Send resolution alert
    await this.sendResolutionNotification(updated);

    return updated;
  }

  private async sendAlertNotification(incident: any): Promise<void> {
    const now = new Date();
    const cooldownPeriodMs = 30 * 60 * 1000; // 30 minutes cooldown

    // Check if an alert was sent for the same component in the cooldown window
    const recentAlert = await this.prisma.sreAlert.findFirst({
      where: {
        title: { contains: incident.component },
        status: 'SENT',
        createdAt: { gte: new Date(now.getTime() - cooldownPeriodMs) },
      },
    });

    if (recentAlert) {
      this.logger.warn(`Deduplicating alert for component ${incident.component}. Cooldown active.`);
      await this.prisma.sreAlert.create({
        data: {
          incidentId: incident.id,
          title: `[COOLDOWN] SRE Alert: ${incident.title}`,
          message: incident.description,
          severity: incident.severity,
          channel: 'EMAIL',
          status: 'COOLDOWN',
        },
      });
      return;
    }

    // Query active admin users to notify
    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN', isActive: true },
      select: { id: true },
    });

    for (const admin of admins) {
      try {
        await this.notifications.queueNotification({
          userId: admin.id,
          type: NotificationType.SYSTEM,
          title: `🚨 SRE Alert [${incident.severity}]: ${incident.title}`,
          message: `An SRE alert has been triggered for component ${incident.component}. Details: ${incident.description}`,
          channel: NotificationChannel.EMAIL,
        });
      } catch (err) {
        this.logger.error(
          `Failed to send alert to admin ${admin.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    await this.prisma.sreAlert.create({
      data: {
        incidentId: incident.id,
        title: `SRE Alert: ${incident.title}`,
        message: incident.description,
        severity: incident.severity,
        channel: 'EMAIL',
        status: 'SENT',
      },
    });
  }

  private async sendResolutionNotification(incident: any): Promise<void> {
    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN', isActive: true },
      select: { id: true },
    });

    for (const admin of admins) {
      try {
        await this.notifications.queueNotification({
          userId: admin.id,
          type: NotificationType.SYSTEM,
          title: `✅ SRE Resolved: ${incident.title}`,
          message: `The incident regarding component ${incident.component} has been resolved. Resolution: ${incident.resolution}`,
          channel: NotificationChannel.EMAIL,
        });
      } catch (err) {
        this.logger.error(
          `Failed to send resolution alert to admin ${admin.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }
}
