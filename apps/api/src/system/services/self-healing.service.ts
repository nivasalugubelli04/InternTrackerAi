import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SelfHealingService {
  private readonly logger = new Logger(SelfHealingService.name);

  // Set of recovery actions that always require human confirmation due to destructive risk
  private readonly riskyActions = [
    'DATABASE_DELETE',
    'MASS_DATA_MODIFICATION',
    'ACCOUNT_DELETION',
    'BILLING_ADJUSTMENT',
    'CANDIDATE_REJECTION',
    'JOB_DELETION',
    'CREDENTIAL_ROTATION',
  ];

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Evaluates and triggers a self-healing operational task.
   * If Safe Mode is active or the action is risky, pauses and queues for human confirmation.
   */
  async triggerHealing(
    action: string,
    component: string,
    trigger: string,
    recoveryFn: () => Promise<string>,
  ): Promise<{ success: boolean; requiresApproval: boolean; message: string }> {
    const safeMode = await this.isSafeModeEnabled();
    const isRisky = this.riskyActions.includes(action);

    if (safeMode || isRisky) {
      this.logger.warn(
        `Self-healing action "${action}" paused. Safe Mode: ${safeMode}, Risky: ${isRisky}. Human SRE approval required.`,
      );

      // Save pending recovery log requiring approval
      const record = await this.prisma.recoveryAction.create({
        data: {
          action,
          component,
          trigger,
          result: 'PAUSED: Awaiting SRE Administrator manual review and confirmation.',
          beforeStatus: 'WARNING',
          afterStatus: 'DEGRADED',
          isApproved: false,
          operator: 'SYSTEM',
        },
      });

      return {
        success: false,
        requiresApproval: true,
        message: `Recovery action ${record.id} created and queued. Approval is required before execution.`,
      };
    }

    // Safe execution path
    this.logger.log(`Executing safe recovery action: ${action} for component ${component}`);
    try {
      const outcome = await recoveryFn();

      await this.prisma.recoveryAction.create({
        data: {
          action,
          component,
          trigger,
          result: `SUCCESS: ${outcome}`,
          beforeStatus: 'WARNING',
          afterStatus: 'HEALTHY',
          isApproved: true,
          operator: 'SYSTEM',
        },
      });

      return {
        success: true,
        requiresApproval: false,
        message: outcome,
      };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Recovery action ${action} failed: ${errMsg}`);

      await this.prisma.recoveryAction.create({
        data: {
          action,
          component,
          trigger,
          result: `FAILED: ${errMsg}`,
          beforeStatus: 'WARNING',
          afterStatus: 'CRITICAL',
          isApproved: true,
          operator: 'SYSTEM',
        },
      });

      return {
        success: false,
        requiresApproval: false,
        message: `Recovery execution failed: ${errMsg}`,
      };
    }
  }

  /**
   * Approves and runs a queued recovery action.
   */
  async approveRecoveryAction(
    actionId: string,
    adminId: string,
    recoveryFn: () => Promise<string>,
  ): Promise<any> {
    const pending = await this.prisma.recoveryAction.findUnique({
      where: { id: actionId },
    });
    if (!pending) throw new Error('Recovery action not found');
    if (pending.isApproved) throw new Error('Action already approved and processed');

    try {
      const outcome = await recoveryFn();

      return this.prisma.recoveryAction.update({
        where: { id: actionId },
        data: {
          isApproved: true,
          approvedBy: adminId,
          result: `APPROVED & EXECUTED: ${outcome}`,
          afterStatus: 'HEALTHY',
        },
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return this.prisma.recoveryAction.update({
        where: { id: actionId },
        data: {
          isApproved: true,
          approvedBy: adminId,
          result: `APPROVED & FAILED: ${errMsg}`,
          afterStatus: 'CRITICAL',
        },
      });
    }
  }

  /**
   * Checks if SRE safe mode is enabled.
   */
  async isSafeModeEnabled(): Promise<boolean> {
    const threshold = await this.prisma.systemThreshold.findUnique({
      where: { key: 'SAFE_MODE' },
    });
    return threshold?.value === 'true';
  }

  /**
   * Toggles SRE Safe Mode.
   */
  async toggleSafeMode(enabled: boolean): Promise<void> {
    await this.prisma.systemThreshold.upsert({
      where: { key: 'SAFE_MODE' },
      create: {
        key: 'SAFE_MODE',
        value: enabled ? 'true' : 'false',
        description:
          'Toggles global SRE safe mode. When active, all automated recoveries are paused.',
      },
      update: {
        value: enabled ? 'true' : 'false',
      },
    });
  }

  /**
   * Checks if SRE maintenance mode is enabled.
   */
  async isMaintenanceModeEnabled(): Promise<boolean> {
    const threshold = await this.prisma.systemThreshold.findUnique({
      where: { key: 'MAINTENANCE_MODE' },
    });
    return threshold?.value === 'true';
  }

  /**
   * Toggles SRE Maintenance Mode.
   */
  async toggleMaintenanceMode(enabled: boolean): Promise<void> {
    await this.prisma.systemThreshold.upsert({
      where: { key: 'MAINTENANCE_MODE' },
      create: {
        key: 'MAINTENANCE_MODE',
        value: enabled ? 'true' : 'false',
        description:
          'Toggles global maintenance mode. When active, user access is blocked with maintenance page.',
      },
      update: {
        value: enabled ? 'true' : 'false',
      },
    });
  }
}
