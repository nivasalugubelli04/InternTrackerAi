import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { AdminSupportController } from './controllers/admin-support.controller';
import { LegalController } from './controllers/legal.controller';
import { PrivacyController } from './controllers/privacy.controller';
import { SupportController } from './controllers/support.controller';
import { LegalPolicyService } from './services/legal-policy.service';
import { PrivacyControlService } from './services/privacy-control.service';
import { PrivacyService } from './services/privacy.service';
import { SupportService } from './services/support.service';

@Module({
  imports: [PrismaModule],
  controllers: [PrivacyController, SupportController, LegalController, AdminSupportController],
  providers: [PrivacyService, PrivacyControlService, SupportService, LegalPolicyService],
  exports: [PrivacyService, PrivacyControlService, SupportService, LegalPolicyService],
})
export class PrivacyModule {}
