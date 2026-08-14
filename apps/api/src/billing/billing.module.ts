import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from '../prisma/prisma.module';

import { AdminBillingController } from './controllers/admin-billing.controller';
import { BillingController } from './controllers/billing.controller';
import { WebhookController } from './controllers/webhook.controller';
import { PAYMENT_PROVIDER_TOKEN } from './providers/payment-provider.interface';
import { RazorpayAdapter } from './providers/razorpay.adapter';
import { BillingReconciliationService } from './services/billing-reconciliation.service';
import { BillingService } from './services/billing.service';
import { EntitlementService } from './services/entitlement.service';
import { UsageTrackerService } from './services/usage-tracker.service';
import { WebhookService } from './services/webhook.service';

@Global()
@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [BillingController, WebhookController, AdminBillingController],
  providers: [
    UsageTrackerService,
    EntitlementService,
    BillingService,
    WebhookService,
    BillingReconciliationService,
    {
      provide: PAYMENT_PROVIDER_TOKEN,
      useClass: RazorpayAdapter,
    },
  ],
  exports: [UsageTrackerService, EntitlementService, BillingService],
})
export class BillingModule {}
