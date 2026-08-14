import { Injectable, Logger } from '@nestjs/common';
import { SubscriptionStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BillingReconciliationService {
  private readonly logger = new Logger(BillingReconciliationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Identifies subscriptions that are PAST_DUE and have exceeded the 7-day grace period,
   * transitioning them to CANCELED or EXPIRED to revoke access.
   */
  async reconcileGracePeriods() {
    this.logger.log('Starting reconciliation for grace periods...');

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Find all PAST_DUE subscriptions
    const pastDueSubs = await this.prisma.subscription.findMany({
      where: { status: SubscriptionStatus.PAST_DUE },
      include: { payments: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    let revokedCount = 0;
    for (const sub of pastDueSubs) {
      const lastPayment = sub.payments[0];
      if (lastPayment && lastPayment.status === 'FAILED') {
        if (lastPayment.createdAt < sevenDaysAgo) {
          // Grace period expired
          await this.prisma.subscription.update({
            where: { id: sub.id },
            data: { status: SubscriptionStatus.CANCELED },
          });
          revokedCount++;
          this.logger.warn(
            `Revoked premium access for user ${sub.userId}, sub ${sub.id} (Grace Period Expired)`,
          );
        }
      }
    }

    this.logger.log(`Grace period reconciliation complete. Revoked ${revokedCount} subscriptions.`);
  }

  /**
   * Handles stuck PENDING webhooks
   */
  async retryFailedWebhooks() {
    const stuckWebhooks = await this.prisma.webhookEvent.findMany({
      where: { status: 'FAILED' },
    });
    // In a real system, you might enqueue them again to BullMQ
    this.logger.log(`Found ${stuckWebhooks.length} failed webhooks needing manual review.`);
  }
}
