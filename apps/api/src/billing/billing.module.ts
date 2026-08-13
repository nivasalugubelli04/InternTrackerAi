import { Module, Global } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UsageTrackerService } from './services/usage-tracker.service';
import { EntitlementService } from './services/entitlement.service';
import { WebhookService } from './services/webhook.service';
import { WebhookController } from './controllers/webhook.controller';
import { BillingReconciliationService } from './services/billing-reconciliation.service';
import { AdminBillingController } from './controllers/admin-billing.controller';

import { BillingController } from './controllers/billing.controller';
import { BillingService } from './services/billing.service';
import { PAYMENT_PROVIDER_TOKEN } from './providers/payment-provider.interface';
import { RazorpayAdapter } from './providers/razorpay.adapter';
import { ConfigModule } from '@nestjs/config';

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
