import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from '../prisma/prisma.module';

import { AdminBillingController } from './controllers/admin-billing.controller';
import { BillingController } from './controllers/billing.controller';
import { WebhookController } from './controllers/webhook.controller';
import { EntitlementGuard } from './guards/entitlement.guard';
import { PAYMENT_PROVIDER_TOKEN } from './providers/payment-provider.interface';
import { StripeAdapter } from './providers/stripe.adapter';
import { BillingReconciliationService } from './services/billing-reconciliation.service';
import { BillingService } from './services/billing.service';
import { EntitlementService } from './services/entitlement.service';
import { MonetizationAnalyticsService } from './services/monetization-analytics.service';
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
    MonetizationAnalyticsService,
    EntitlementGuard,
    {
      provide: PAYMENT_PROVIDER_TOKEN,
      useClass: StripeAdapter,
    },
  ],
  exports: [
    UsageTrackerService,
    EntitlementService,
    BillingService,
    MonetizationAnalyticsService,
    EntitlementGuard,
  ],
})
export class BillingModule {}
