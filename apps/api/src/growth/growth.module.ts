import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ReferralService } from './services/referral.service';
import { ReferralController } from './controllers/referral.controller';
import { AdminReferralController } from './controllers/admin-referral.controller';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [PrismaModule, BillingModule],
  providers: [ReferralService],
  controllers: [ReferralController, AdminReferralController],
  exports: [ReferralService],
})
export class GrowthModule {}
