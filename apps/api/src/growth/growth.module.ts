import { Module } from '@nestjs/common';

import { BillingModule } from '../billing/billing.module';
import { PrismaModule } from '../prisma/prisma.module';

import { AdminReferralController } from './controllers/admin-referral.controller';
import { ReferralController } from './controllers/referral.controller';
import { ReferralService } from './services/referral.service';

@Module({
  imports: [PrismaModule, BillingModule],
  providers: [ReferralService],
  controllers: [ReferralController, AdminReferralController],
  exports: [ReferralService],
})
export class GrowthModule {}
